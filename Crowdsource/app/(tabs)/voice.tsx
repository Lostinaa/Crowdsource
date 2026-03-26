import { View, Text, StyleSheet, Button, Alert, Platform, PermissionsAndroid, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useRef } from 'react';
import { useQoE } from '../../src/context/QoEContext';
import { RecentsView, DialpadView } from './dialer';
import { theme } from '../../src/constants/theme';
import { getCallInitiatedAt, clearCallInitiatedAt } from '../../src/utils/callState';
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

// Try to get InCallService bridge for real DisconnectCause
let CallDropBridgeModule: any = null;
try {
  CallDropBridgeModule = requireNativeModule('CallDropBridgeModule');
} catch (e) {
  console.warn('[Voice] CallDropBridgeModule not available — will use CallLog fallback');
}


export default function VoiceScreen() {
  const { addVoiceSample, metrics, scores } = useQoE();

  const [isListening, setIsListening] = useState(false);
  const [signalMos, setSignalMos] = useState(0);
  const callStartTimeRef = useRef(null);
  const callSetupStartTimeRef = useRef(null);
  // Track incoming vs outgoing calls — only outgoing calls count for QoE
  const isIncomingCallRef = useRef(false);
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
        if (!diagnostics) return;

        let estimatedMos: number | null = null;

        // Try RSRP first (LTE preferred metric)
        const rsrp = diagnostics.rsrp ? parseInt(diagnostics.rsrp, 10) : NaN;
        if (!isNaN(rsrp)) {
          // RSRP → MOS mapping (approximation)
          if (rsrp >= -80) estimatedMos = 4.4;
          else if (rsrp >= -90) estimatedMos = 4.0;
          else if (rsrp >= -100) estimatedMos = 3.5;
          else if (rsrp >= -110) estimatedMos = 3.0;
          else estimatedMos = 2.0;
          console.log(`[Voice] RSRP: ${rsrp} dBm -> Est. MOS: ${estimatedMos}`);
        }

        // Fallback to RSSI if RSRP unavailable
        if (estimatedMos === null) {
          const rssi = diagnostics.rssi ? parseInt(diagnostics.rssi, 10) : NaN;
          if (!isNaN(rssi)) {
            if (rssi >= -65) estimatedMos = 4.4;
            else if (rssi >= -75) estimatedMos = 4.0;
            else if (rssi >= -85) estimatedMos = 3.5;
            else if (rssi >= -95) estimatedMos = 3.0;
            else estimatedMos = 2.0;
            console.log(`[Voice] RSSI fallback: ${rssi} dBm -> Est. MOS: ${estimatedMos}`);
          } else {
            console.warn('[Voice] No RSRP or RSSI available — skipping MOS sample');
          }
        }

        if (estimatedMos !== null) {
          setSignalMos(estimatedMos);
          addVoiceSample({ mos: estimatedMos });
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

  // ── Call Drop Detection ──────────────────────────────────────────────
  // A "dropped call" = both parties were connected and talking, then the
  // call ended WITHOUT either party pressing hangup (e.g. network failure).
  // Since Android's CallLog can't distinguish "user hung up" from
  // "network dropped", we default to COMPLETED and only mark DROPPED
  // when there is strong evidence of a network-side failure.

  const classifyCall = (
    pending: { callDuration: number; rsrp: number | null },
    disconnect?: { causeLabel?: string; duration?: number }
  ) => {
    const { callDuration } = pending;
    const causeLabel = disconnect?.causeLabel || null;
    const source = disconnect ? 'calllog' : 'timeout';

    let dropped = false;
    let completed = false;
    let rule = '';

    // ── Explicit CallLog labels (highest priority) ──
    if (causeLabel === 'MISSED') {
      // Missed/unanswered — setup failure, not a drop
      rule = 'MISSED (setup failure, ignored)';
    } else if (causeLabel === 'INCOMING_REJECTED') {
      // User rejected — not a drop
      rule = 'INCOMING_REJECTED (user action, ignored)';
    } else if (causeLabel === 'OUTGOING_CANCELED') {
      // Caller hung up before other side answered — not a drop
      rule = 'OUTGOING_CANCELED (caller hung up before answer, ignored)';
    }
    // ── Strong evidence of network drop ──
    // A call that was connected (offhook) but lasted less than 1 second
    // is almost certainly a network failure, not a real conversation.
    else if (callDuration < 1000) {
      dropped = true;
      rule = `Sub-1s connected call (${callDuration}ms) — likely network failure`;
    }
    // ── Default: assume normal user hangup → COMPLETED ──
    // We cannot reliably distinguish "user pressed hangup" from
    // "network dropped the call" via Android APIs, so we err on the
    // side of COMPLETED to avoid inflating the Call Drop Ratio.
    else {
      completed = true;
      rule = `Completed — ${source}, duration ${callDuration}ms (assume normal hangup)`;
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
  // Reference to InCallService (CallDropBridgeModule) subscription
  const inCallServiceSubRef = useRef<any>(null);
  // Whether InCallService provided the disconnect cause (takes priority over CallLog)
  const inCallServiceHandledRef = useRef(false);
  // Store the last InCallService disconnect cause (covers timing race)
  const lastInCallCauseRef = useRef<any>(null);

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
          // RINGING fires for INCOMING calls only on most Android ROMs.
          // Outgoing calls go directly to OFFHOOK.
          // Mark this as incoming — incoming calls are excluded from QoE metrics.
          isIncomingCallRef.current = true;
          callSetupStartTimeRef.current = now;
          isActiveCallRef.current = false;
          console.log('[Voice] Incoming call detected (RINGING) — will NOT count in QoE');

        } else if (payload.state === 'offhook') {
          if (isIncomingCallRef.current) {
            // Incoming call was answered — do NOT count in QoE
            console.log('[Voice] Incoming call answered — excluded from QoE metrics');
            callSetupStartTimeRef.current = null;
          } else {
            // OUTGOING call — this IS counted in QoE
            // Compute setup time from when user pressed call in dialer to now (OFFHOOK)
            const initiatedAt = getCallInitiatedAt();
            const setupTimeMs = initiatedAt ? (now - initiatedAt) : 0;
            clearCallInitiatedAt();

            callSetupStartTimeRef.current = now;
            addVoiceSample({ attempt: true, setupSuccessful: true, setupTimeMs });
            console.log(`[Voice] Outgoing call detected — setupTime: ${setupTimeMs}ms — counted in QoE`);
          }
          callStartTimeRef.current = now;
          isActiveCallRef.current = true;
          // MOS polling only runs while a real call is active
          startMosPolling();

        } else if (payload.state === 'idle') {
          // Call ended — defer classification until CallDisconnectEvent arrives
          stopMosPolling();
          setSignalMos(0);

          if (isIncomingCallRef.current) {
            // Incoming call ended — skip QoE classification entirely
            console.log('[Voice] Incoming call ended — not included in QoE');
          } else if (isActiveCallRef.current && callStartTimeRef.current !== null) {
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

            // Check if InCallService already fired BEFORE we got IDLE
            const storedCause = lastInCallCauseRef.current;
            if (storedCause) {
              console.log('[Voice] InCallService cause was already stored — using it now');
              lastInCallCauseRef.current = null;
              inCallServiceHandledRef.current = true;

              const causeLabel = storedCause.causeLabel || 'UNKNOWN';
              let dropped = false;
              let completed = false;
              let rule = '';

              if (causeLabel === 'ERROR' || causeLabel === 'OTHER') {
                dropped = true;
                rule = `InCallService(stored): ${causeLabel} — network/system failure`;
              } else if (causeLabel === 'LOCAL' || causeLabel === 'REMOTE') {
                completed = true;
                rule = `InCallService(stored): ${causeLabel} — normal hangup`;
              } else if (causeLabel === 'MISSED' || causeLabel === 'REJECTED' || causeLabel === 'CANCELED' || causeLabel === 'BUSY' || causeLabel === 'NOT_CONNECTED') {
                rule = `InCallService(stored): ${causeLabel} — not connected, ignored`;
              } else {
                completed = true;
                rule = `InCallService(stored): ${causeLabel} — defaulting to completed`;
              }

              console.log(`[Voice] Call classified via stored InCallService: ${dropped ? 'DROPPED' : completed ? 'COMPLETED' : 'IGNORED'} | Rule: ${rule}`);
              if (dropped || completed) {
                addVoiceSample({ callCompleted: completed, dropped });
              }
              addVoiceSample({
                reasonCode: storedCause.causeCode,
                reasonLabel: causeLabel,
                reasonSource: 'incallservice',
              });
              pendingCallRef.current = null;
            } else {
              // Timeout fallback: if no disconnect event arrives within 4s, classify anyway
              classifyTimeoutRef.current = setTimeout(() => {
                const pending = pendingCallRef.current;
                if (pending) {
                  console.log('[Voice] Disconnect event timeout — using fallback classification');
                  classifyCall(pending); // no disconnect param → timeout rules
                  pendingCallRef.current = null;
                }
              }, 4000);
            }

          } else if (callSetupStartTimeRef.current !== null) {
            // Ringing → idle (call never answered = failed setup, not a drop)
            console.log('[Voice] Call setup aborted (never answered), not counted as drop');
          }
          // If idle fires with no prior ringing/offhook: phantom event, ignore it

          callStartTimeRef.current = null;
          callSetupStartTimeRef.current = null;
          isActiveCallRef.current = false;
          isIncomingCallRef.current = false;
        }
      }
    );

    return () => {
      subscription?.remove();
      stopMosPolling();
      cancelPendingClassification();
    };
  }, [addVoiceSample]);


  const handleStart = async () => {
    try {
      // ── Step 1: Request Default Phone Handler role FIRST ──
      // Google Play policy requires the default handler prompt to appear

      if (Platform.OS === 'android' && CallDropBridgeModule) {
        try {
          await CallDropBridgeModule.requestCallRole();
          console.log('[Voice] Default handler prompt shown (before permissions)');
        } catch (e) {
          console.warn('[Voice] requestCallRole failed:', e);
        }
      }

      // ── Step 2: Request runtime permissions ──
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

        // ── 3. Register InCallService listener (real DisconnectCause) ──
        if (CallDropBridgeModule) {
          try {
            // Role was already requested in Step 1 above

            inCallServiceSubRef.current = CallDropBridgeModule.addListener('CallDropCauseEvent', (payload: any) => {
              console.log('[Voice] InCallService DisconnectCause:', payload);

              const pending = pendingCallRef.current;
              if (pending) {
                // pendingCallRef exists — process immediately
                if (classifyTimeoutRef.current) {
                  clearTimeout(classifyTimeoutRef.current);
                  classifyTimeoutRef.current = null;
                }
                inCallServiceHandledRef.current = true;
                lastInCallCauseRef.current = null;

                const causeLabel = payload?.causeLabel || 'UNKNOWN';
                let dropped = false;
                let completed = false;
                let rule = '';

                if (causeLabel === 'ERROR' || causeLabel === 'OTHER') {
                  dropped = true;
                  rule = `InCallService: ${causeLabel} — network/system failure`;
                } else if (causeLabel === 'LOCAL' || causeLabel === 'REMOTE') {
                  completed = true;
                  rule = `InCallService: ${causeLabel} — normal hangup`;
                } else if (causeLabel === 'MISSED' || causeLabel === 'REJECTED' || causeLabel === 'CANCELED' || causeLabel === 'BUSY' || causeLabel === 'NOT_CONNECTED') {
                  rule = `InCallService: ${causeLabel} — not a connected call, ignored`;
                } else {
                  completed = true;
                  rule = `InCallService: ${causeLabel} — defaulting to completed`;
                }

                console.log(`[Voice] Call classified via InCallService: ${dropped ? 'DROPPED' : completed ? 'COMPLETED' : 'IGNORED'} | Rule: ${rule}`);

                if (dropped || completed) {
                  addVoiceSample({ callCompleted: completed, dropped });
                }
                addVoiceSample({
                  reasonCode: payload?.causeCode,
                  reasonLabel: causeLabel,
                  reasonSource: 'incallservice',
                });
                pendingCallRef.current = null;
              } else {
                // pendingCallRef not set yet — store for IDLE handler to pick up
                console.log('[Voice] InCallService fired before IDLE — storing cause for later');
                lastInCallCauseRef.current = {
                  causeCode: payload?.causeCode,
                  causeLabel: payload?.causeLabel,
                  causeDescription: payload?.causeDescription,
                  callDurationMs: payload?.callDurationMs,
                };
              }
            });
            console.log('[Voice] InCallService (CallDropBridgeModule) listener registered');
          } catch (e) {
            console.warn('[Voice] InCallService setup failed — will use CallLog fallback:', e);
          }
        }

        // ── 2. Register CallLog-based disconnect listener (fallback) ──
        if (CallDisconnectModule) {
          try {
            await CallDisconnectModule.startListening();
            disconnectSubRef.current = CallDisconnectModule.addListener('CallDisconnectEvent', (payload) => {
              console.log('[Voice] CallDisconnectEvent (CallLog) received — deferring 800ms for InCallService priority');

              // Delay slightly to give InCallService time to fire first
              setTimeout(() => {
                // Skip if InCallService already handled this call
                if (inCallServiceHandledRef.current) {
                  console.log('[Voice] Skipping CallLog event — InCallService already classified this call');
                  inCallServiceHandledRef.current = false;
                  return;
                }

                // Fallback: use CallLog-based classification
                const pending = pendingCallRef.current;
                if (pending) {
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

                if (payload?.causeCode !== undefined || payload?.causeLabel) {
                  addVoiceSample({
                    reasonCode: payload?.causeCode,
                    reasonLabel: payload?.causeLabel || 'Unknown',
                    reasonSource: payload?.source || 'calllog',
                  });
                }
              }, 800);
            });
            console.log('[Voice] CallDisconnectModule (CallLog) started successfully');
          } catch (e) {
            console.warn('[Voice] CallDisconnectModule start failed:', e);
          }
        }

        setIsListening(true);
        console.log('[Voice] Call metrics monitoring started successfully');
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
      lastInCallCauseRef.current = null;
      stopMosPolling();
      cancelPendingClassification();

      // Remove InCallService listener
      if (inCallServiceSubRef.current) {
        inCallServiceSubRef.current.remove();
        inCallServiceSubRef.current = null;
      }
      inCallServiceHandledRef.current = false;

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

  // ── Auto-start: always start monitoring on mount ──
  // First time: prompts for default handler + permissions, then starts capturing
  // Subsequent launches: permissions already granted, starts silently
  // NOTE: Must be placed AFTER handleStart definition (const functions are not hoisted)
  const autoStartAttemptedRef = useRef(false);
  useEffect(() => {
    if (autoStartAttemptedRef.current) return;
    autoStartAttemptedRef.current = true;

    console.log('[Voice] Auto-starting call metrics monitoring...');
    handleStart();
  }, []);

  const [showDialpad, setShowDialpad] = useState(false);
  const [metricsExpanded, setMetricsExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Calls" />

      {/* ── QoE Capture Banner ── */}
      <TouchableOpacity
        style={[styles.captureBanner, isListening && styles.captureBannerActive]}
        onPress={() => setMetricsExpanded(!metricsExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.captureBannerRow}>
          <View style={styles.captureBannerLeft}>
            <View style={[styles.statusDot, isListening && styles.statusDotActive]} />
            <Text style={styles.captureBannerText}>
              {isListening ? 'Capturing call metrics' : 'Starting call metrics...'}
            </Text>
          </View>
          <Ionicons
            name={metricsExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.textSecondary}
          />
        </View>

        {/* Expandable metrics */}
        {metricsExpanded && (
          <View style={styles.metricsExpanded}>
            <View style={styles.countersRow}>
              <View style={styles.counterItem}>
                <Text style={styles.counterValue}>{metrics.voice.attempts}</Text>
                <Text style={styles.counterLabel}>Attempts</Text>
              </View>
              <View style={styles.counterItem}>
                <Text style={styles.counterValue}>{metrics.voice.setupOk}</Text>
                <Text style={styles.counterLabel}>Connected</Text>
              </View>
              <View style={styles.counterItem}>
                <Text style={[styles.counterValue, { color: theme.colors.success }]}>{metrics.voice.completed}</Text>
                <Text style={styles.counterLabel}>Completed</Text>
              </View>
              <View style={styles.counterItem}>
                <Text style={[styles.counterValue, { color: metrics.voice.dropped > 0 ? theme.colors.danger : theme.colors.text.primary }]}>{metrics.voice.dropped}</Text>
                <Text style={styles.counterLabel}>Dropped</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>CSSR</Text>
              <Text style={styles.metricValue}>{formatPercent(scores.voice.cssr)}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>CDR</Text>
              <Text style={[styles.metricValue, scores.voice.cdr > 0 && { color: theme.colors.danger }]}>{formatPercent(scores.voice.cdr)}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>MOS</Text>
              <Text style={styles.metricValue}>
                {signalMos > 0 ? formatMOS(signalMos) : (scores.voice.mosAvg !== null && scores.voice.mosAvg !== undefined ? formatMOS(scores.voice.mosAvg) : '--')}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* ── Main content: RecentsView ── */}
      <RecentsView />

      {/* ── FAB Dialpad ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowDialpad(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="keypad" size={24} color="#fff" />
      </TouchableOpacity>

      {/* ── Dialpad Bottom Sheet ── */}
      {showDialpad && (
        <>
          <TouchableOpacity
            style={styles.dialpadBackdrop}
            activeOpacity={1}
            onPress={() => setShowDialpad(false)}
          />
          <View style={styles.dialpadSheet}>
            <View style={styles.sheetHandle} />
            <DialpadView />
          </View>
        </>
      )}
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
  countersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.sm,
  },
  counterItem: {
    alignItems: 'center',
    flex: 1,
  },
  counterValue: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  counterLabel: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  noteText: {
    color: theme.colors.text.light,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },

  // Capture Banner
  captureBanner: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    marginBottom: 4,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    ...theme.shadows.sm,
  },
  captureBannerActive: {
    borderColor: theme.colors.primary,
    backgroundColor: '#f0faf0',
  },
  captureBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  captureBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.text.light,
  },
  statusDotActive: {
    backgroundColor: theme.colors.success,
  },
  captureBannerText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  captureStartBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  captureStartBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  captureStopBtn: {
    backgroundColor: theme.colors.background.secondary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  captureStopBtnText: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  metricsExpanded: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabIcon: {
    fontSize: 24,
    color: '#fff',
  },

  // Dialpad bottom sheet
  dialpadBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 99,
  },
  dialpadSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 24,
    zIndex: 100,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
});

