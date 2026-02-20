import { View, Text, StyleSheet, Button, Alert, Platform, PermissionsAndroid, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { useQoE } from '../../src/context/QoEContext';
import { theme } from '../../src/constants/theme';
import ScreenHeader from '../../src/components/ScreenHeader';
import BrandedButton from '../../src/components/BrandedButton';
import CallMetrics, {
  CallStateChangePayload,
  CallDisconnectModule,
} from 'call-metrics';

import { requireNativeModule } from 'expo-modules-core';

// Try to get native diagnostic module
let DeviceDiagnosticModule = null;
try {
  DeviceDiagnosticModule = requireNativeModule('DeviceDiagnosticModule');
} catch (e) {
  console.warn('[Voice] DeviceDiagnosticModule not available');
}


export default function VoiceScreen() {
  const { addVoiceSample, metrics, scores } = useQoE();

  const [isListening, setIsListening] = useState(false);
  const [signalMos, setSignalMos] = useState(0);
  const callStartTimeRef = useRef(null);
  const callSetupStartTimeRef = useRef(null);
  const mosIntervalRef = useRef(null);

  // Enhanced drop detection: deferred classification context
  const pendingCallRef = useRef<{
    callDuration: number;
    rsrp: number | null;
    timestamp: number;
  } | null>(null);
  const classifyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ... (debug logging effects)

  const stopMosPolling = () => {
    if (mosIntervalRef.current) {
      clearInterval(mosIntervalRef.current);
      mosIntervalRef.current = null;
    }
  };

  const startMosPolling = () => {
    stopMosPolling();
    if (!DeviceDiagnosticModule) return;

    // Poll signal strength every 2 seconds
    mosIntervalRef.current = setInterval(async () => {
      try {
        const diagnostics = await DeviceDiagnosticModule.getFullDiagnostics();
        if (diagnostics && diagnostics.rsrp) {
          const rsrp = parseInt(diagnostics.rsrp, 10);
          if (!isNaN(rsrp)) {
            // Calculate MOS based on RSRP (Approximation)
            // RSRP >= -80: Excellent (4.4)
            // RSRP >= -90: Good (4.0)
            // RSRP >= -100: Fair (3.5)
            // RSRP >= -110: Poor (3.0)
            // RSRP < -110: Bad (2.0)
            let estimatedMos = 2.0;
            if (rsrp >= -80) estimatedMos = 4.4;
            else if (rsrp >= -90) estimatedMos = 4.0;
            else if (rsrp >= -100) estimatedMos = 3.5;
            else if (rsrp >= -110) estimatedMos = 3.0;

            console.log(`[Voice] RSRP: ${rsrp} dBm -> Est. MOS: ${estimatedMos}`);
            setSignalMos(estimatedMos);
            addVoiceSample({ mos: estimatedMos });
          }
        }
      } catch (e) {
        console.warn('[Voice] Failed to poll signal for MOS:', e);
      }
    }, 2000);
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined) return '--';
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatTime = (ms) => {
    if (ms === null || ms === undefined) return '--';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatMOS = (value) => {
    if (value === null || value === undefined) return '--';
    return value.toFixed(2);
  };

  // ── Enhanced Call Drop Detection ──────────────────────────────────────
  // Combines signal strength + call duration + CallLog metadata
  // instead of just a 3-second time threshold.

  const classifyCall = (
    pending: { callDuration: number; rsrp: number | null },
    disconnect?: { causeLabel?: string; duration?: number }
  ) => {
    const { callDuration, rsrp } = pending;
    const causeLabel = disconnect?.causeLabel || null;
    const source = disconnect ? 'calllog' : 'timeout';

    let dropped = false;
    let completed = false;
    let rule = '';

    // Priority 1: Explicit CallLog labels
    if (causeLabel === 'OUTGOING_FAILED') {
      dropped = true;
      rule = 'OUTGOING_FAILED (call never connected)';
    } else if (causeLabel === 'MISSED') {
      // Setup failure, not a drop — don't count as either
      rule = 'MISSED (setup failure, ignored)';
    } else if (causeLabel === 'INCOMING_REJECTED') {
      // User chose to reject — not a drop
      rule = 'INCOMING_REJECTED (user action, ignored)';
    }
    // Priority 2: Signal + duration heuristics
    else if (callDuration < 1000) {
      dropped = true;
      rule = `Sub-1s call (${callDuration}ms) — almost certainly network failure`;
    } else if (callDuration < 5000 && rsrp !== null && rsrp < -110) {
      dropped = true;
      rule = `Short call (${callDuration}ms) + weak signal (${rsrp} dBm)`;
    }
    // Priority 3: Normal termination
    else if (causeLabel === 'NORMAL' && callDuration >= 1000) {
      completed = true;
      rule = `NORMAL termination, duration ${callDuration}ms`;
    }
    // Priority 4: Timeout fallbacks (no disconnect event received)
    else if (source === 'timeout' && callDuration < 2000) {
      dropped = true;
      rule = `Timeout fallback — short call (${callDuration}ms)`;
    } else {
      completed = true;
      rule = `Default completed — ${source}, duration ${callDuration}ms, signal ${rsrp ?? 'unknown'} dBm`;
    }

    console.log(`[Voice] Call classified: ${dropped ? 'DROPPED' : completed ? 'COMPLETED' : 'IGNORED'} | Rule: ${rule}`);

    if (dropped || completed) {
      addVoiceSample({ callCompleted: completed, dropped });
    }
  };

  const cancelPendingClassification = () => {
    if (classifyTimeoutRef.current) {
      clearTimeout(classifyTimeoutRef.current);
      classifyTimeoutRef.current = null;
    }
    pendingCallRef.current = null;
  };

  // Track whether we're actually inside a real call (offhook state seen)
  const isActiveCallRef = useRef(false);
  // Track whether user has explicitly started capture
  const isListeningRef = useRef(false);
  // Reference to CallDisconnectModule subscription so we can remove it on Stop
  const disconnectSubRef = useRef<any>(null);

  // Call Metrics listener — only processes events relevant to real calls
  useEffect(() => {
    const subscription = CallMetrics.addListener(
      'callMetrics:update',
      async (payload: CallStateChangePayload) => {
        // Ignore all events if user hasn't pressed Start
        if (!isListeningRef.current) return;

        const now = Date.now();
        console.log('[Voice] Call state changed:', payload.state, payload);

        if (payload.state === 'ringing') {
          // Incoming/outgoing call detected — record attempt
          callSetupStartTimeRef.current = now;
          isActiveCallRef.current = false; // not yet connected
          addVoiceSample({ attempt: true });

        } else if (payload.state === 'offhook') {
          // Call was answered/connected
          if (callSetupStartTimeRef.current !== null) {
            // Normal path: ringing → offhook
            const setupTime = now - callSetupStartTimeRef.current;
            addVoiceSample({ setupSuccessful: true, setupTimeMs: setupTime });
            callSetupStartTimeRef.current = null;
          } else {
            // offhook without prior ringing (e.g. outgoing call skipped ringing event on some ROMs)
            // We DO NOT invent a fake setupTimeMs — just record that setup succeeded without a time.
            addVoiceSample({ attempt: true, setupSuccessful: true });
          }
          callStartTimeRef.current = now;
          isActiveCallRef.current = true;
          // MOS polling only runs while a real call is active
          startMosPolling();

        } else if (payload.state === 'idle') {
          // Call ended — defer classification until CallDisconnectEvent arrives
          stopMosPolling();
          setSignalMos(0);

          if (isActiveCallRef.current && callStartTimeRef.current !== null) {
            // Real call ending — snapshot context for deferred classification
            const callDuration = now - callStartTimeRef.current;

            // Snapshot current signal strength
            let rsrp: number | null = null;
            if (DeviceDiagnosticModule) {
              try {
                const diag = await DeviceDiagnosticModule.getFullDiagnostics();
                if (diag?.rsrp) {
                  rsrp = parseInt(diag.rsrp, 10);
                  if (isNaN(rsrp)) rsrp = null;
                }
              } catch (e) {
                console.warn('[Voice] Signal snapshot failed:', e);
              }
            }

            console.log(`[Voice] Call ended — duration ${callDuration}ms, RSRP ${rsrp ?? 'unknown'} dBm. Waiting for disconnect event...`);

            // Store context and wait for CallDisconnectEvent
            cancelPendingClassification();
            pendingCallRef.current = { callDuration, rsrp, timestamp: now };

            // Timeout fallback: if no disconnect event arrives within 4s, classify anyway
            classifyTimeoutRef.current = setTimeout(() => {
              const pending = pendingCallRef.current;
              if (pending) {
                console.log('[Voice] Disconnect event timeout — using fallback classification');
                classifyCall(pending); // no disconnect param → timeout rules
                pendingCallRef.current = null;
              }
            }, 4000);

          } else if (callSetupStartTimeRef.current !== null) {
            // Ringing → idle (call never answered = failed setup, not a drop)
            console.log('[Voice] Call setup aborted (never answered), not counted as drop');
          }
          // If idle fires with no prior ringing/offhook: phantom event, ignore it

          callStartTimeRef.current = null;
          callSetupStartTimeRef.current = null;
          isActiveCallRef.current = false;
        }
      }
    );

    return () => {
      subscription?.remove();
      stopMosPolling();
      cancelPendingClassification();
    };
  }, [addVoiceSample]);


  // CallDisconnectModule listener is registered only when user presses Start
  // (see handleStart / handleStop below — subscription managed there)


  const handleStart = async () => {
    try {
      let granted = CallMetrics.isPermissionGranted();

      if (!granted && Platform.OS === 'android') {
        // Request permissions (READ_PHONE_STATE and READ_CALL_LOG)
        const permissions = [
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
          PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
        ];

        const results = await PermissionsAndroid.requestMultiple(permissions);
        const phoneGranted = results[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] === PermissionsAndroid.RESULTS.GRANTED;
        const callLogGranted = results[PermissionsAndroid.PERMISSIONS.READ_CALL_LOG] === PermissionsAndroid.RESULTS.GRANTED;
        granted = phoneGranted;

        if (!granted) {
          // Permission denied - check if we should show rationale
          // If false, it means permanently denied (user selected "Don't ask again")
          // @ts-expect-error - shouldShowRequestPermissionRationale exists but types may be outdated
          const shouldShowRationale = await PermissionsAndroid.shouldShowRequestPermissionRationale?.(
            PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE
          ) ?? false;

          if (!shouldShowRationale) {
            // Permanently denied - open settings
            Alert.alert(
              'Permission Required',
              'Phone permission was denied. Please enable it in app settings to use call metrics.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Open Settings',
                  onPress: () => {
                    Linking.openSettings();
                  },
                },
              ]
            );
          } else {
            // Not permanently denied - user can try again later
            Alert.alert(
              'Permission required',
              'Phone permission is required to monitor call metrics. Please grant the permission when prompted.'
            );
          }
          return;
        }

        if (!callLogGranted) {
          console.warn('[Voice] READ_CALL_LOG permission denied - disconnect causes from call logs will not be available');
        }
      }

      // Re-check permission after request
      granted = CallMetrics.isPermissionGranted();

      if (granted) {
        await CallMetrics.start();
        isListeningRef.current = true;

        // Register CallDisconnect listener NOW (only after user explicitly starts)
        if (CallDisconnectModule) {
          try {
            await CallDisconnectModule.startListening();
            disconnectSubRef.current = CallDisconnectModule.addListener('CallDisconnectEvent', (payload) => {
              console.log('[Voice] CallDisconnectEvent received:', payload);

              // ── Deferred classification trigger ──
              // If a pending call is waiting for this event, classify it now
              const pending = pendingCallRef.current;
              if (pending) {
                // Cancel the fallback timeout
                if (classifyTimeoutRef.current) {
                  clearTimeout(classifyTimeoutRef.current);
                  classifyTimeoutRef.current = null;
                }
                classifyCall(pending, {
                  causeLabel: payload?.causeLabel,
                  duration: payload?.duration,
                });
                pendingCallRef.current = null;
              }

              // Always record the disconnect reason for analytics
              if (payload?.causeCode !== undefined || payload?.causeLabel) {
                addVoiceSample({
                  reasonCode: payload?.causeCode,
                  reasonLabel: payload?.causeLabel || 'Unknown',
                  reasonSource: payload?.source || 'native',
                });
              }
            });
            console.log('[Voice] CallDisconnectModule started successfully');
          } catch (e) {
            console.warn('[Voice] CallDisconnectModule start failed:', e);
          }
        }

        setIsListening(true);
        Alert.alert('Success', 'Capturing metrics started. Make or receive a call to see events.');
      } else {
        Alert.alert(
          'Permission required',
          'Phone permission is required. Please grant it in app settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                Linking.openSettings();
              },
            },
          ]
        );
      }
    } catch (e) {
      console.warn('Failed to start CallMetrics', e);
      Alert.alert('Error', 'Failed to start call metrics listener: ' + e.message);
    }
  };

  const handleStop = async () => {
    try {
      await CallMetrics.stop();
      isListeningRef.current = false;
      isActiveCallRef.current = false;
      callStartTimeRef.current = null;
      callSetupStartTimeRef.current = null;
      stopMosPolling();
      cancelPendingClassification();

      // Remove CallDisconnect listener
      if (disconnectSubRef.current) {
        disconnectSubRef.current.remove();
        disconnectSubRef.current = null;
      }
      if (CallDisconnectModule?.stopListening) {
        try {
          await CallDisconnectModule.stopListening();
          console.log('[Voice] CallDisconnectModule stopped');
        } catch (e) {
          console.warn('[Voice] CallDisconnectModule stop failed:', e);
        }
      }
      setIsListening(false);
    } catch (e) {
      console.warn('Failed to stop CallMetrics', e);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Voice Monitor" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.contentContainer}>


        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>Status</Text>
          <Text style={[styles.statusText, isListening && { color: theme.colors.success }]}>
            {isListening ? '🟢 Capturing call events' : '⚪ Capture stopped'}
          </Text>
        </View>

        <View style={styles.buttonsRow}>
          <BrandedButton
            title="Capture Metrics"
            onPress={handleStart}
            disabled={isListening}
            style={{ flex: 1 }}
            textStyle={{}}
          />
          <BrandedButton
            title="Stop Capturing"
            onPress={handleStop}
            disabled={!isListening}
            variant="outline"
            style={{ flex: 1 }}
            textStyle={{}}
          />
        </View>

        <View style={styles.metricsBox}>
          <Text style={styles.sectionTitle}>Voice Metrics</Text>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Call Setup Success Rate (CSSR)</Text>
            <Text style={styles.metricValue}>
              {formatPercent(scores.voice.cssr)}
            </Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Call Drop Rate (CDR)</Text>
            <Text style={styles.metricValue}>
              {formatPercent(scores.voice.cdr)}
            </Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Avg Call Setup Time</Text>
            <Text style={styles.metricValue}>
              {formatTime(scores.voice.cstAvg)}
            </Text>
          </View>



        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: 100,
  },
  headerTextSection: {
    marginBottom: theme.spacing.lg,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  statusBox: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  statusTitle: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  statusText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  button: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  buttonSecondary: {
    backgroundColor: theme.colors.gray,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  metricsBox: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  sectionTitle: {
    color: theme.colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: theme.spacing.md,
  },
  subsectionTitle: {
    color: theme.colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  metricLabel: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    flex: 1,
  },
  metricValue: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: theme.spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border.light,
    marginVertical: theme.spacing.sm,
  },
  noteText: {
    color: theme.colors.text.light,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
});


