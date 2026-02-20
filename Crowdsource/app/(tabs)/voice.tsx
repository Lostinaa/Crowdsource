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

  // Call Metrics listener
  useEffect(() => {
    const subscription = CallMetrics.addListener(
      'callMetrics:update',
      (payload: CallStateChangePayload) => {

        const now = Date.now();

        console.log('[Voice] Call state changed:', payload.state, payload);

        if (payload.state === 'ringing') {
          // ...
          callSetupStartTimeRef.current = now;
          addVoiceSample({ attempt: true });
        } else if (payload.state === 'offhook') {
          // ...
          // Start MOS polling on active call
          startMosPolling();

          if (callSetupStartTimeRef.current !== null) {
            // ... (setup time logic)
            const setupTime = now - callSetupStartTimeRef.current;
            addVoiceSample({ setupSuccessful: true, setupTimeMs: setupTime });
            callSetupStartTimeRef.current = null;
          } else {
            // ...
            addVoiceSample({ attempt: true, setupSuccessful: true, setupTimeMs: 500 });
          }
          callStartTimeRef.current = now;
        } else if (payload.state === 'idle') {
          // Stop MOS polling
          stopMosPolling();
          setSignalMos(0);

          // ... (call ended logic)
          if (callStartTimeRef.current !== null) {
            const callDuration = now - callStartTimeRef.current;
            const wasDropped = callDuration < 5000;
            addVoiceSample({ attempt: false, callCompleted: !wasDropped, dropped: wasDropped });
            callStartTimeRef.current = null;
          } else if (callSetupStartTimeRef.current !== null) {
            // ...
            callSetupStartTimeRef.current = null;
          }
        }
      }
    );

    return () => {
      subscription?.remove();
      stopMosPolling();
    };
  }, [addVoiceSample]);

  // Listen for native disconnect causes (PSTN) if available
  useEffect(() => {
    if (!CallDisconnectModule) {
      console.log('[Voice] CallDisconnectModule not available');
      return;
    }

    const sub = CallDisconnectModule.addListener('CallDisconnectEvent', (payload) => {
      console.log('[Voice] CallDisconnectEvent received:', payload);

      if (payload?.causeCode !== undefined || payload?.causeLabel) {
        addVoiceSample({
          attempt: false,
          callCompleted: false,
          dropped: false,
          reasonCode: payload?.causeCode,
          reasonLabel: payload?.causeLabel || 'Unknown',
          reasonSource: payload?.source || 'native',
        });
      }
    });

    // Don't auto-start here - wait for user to click "Start listener"
    console.log('[Voice] CallDisconnectEvent listener registered');

    return () => {
      sub?.remove();
    };
  }, [CallDisconnectModule, addVoiceSample]);

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

        // Also start the disconnect cause listener if available
        if (CallDisconnectModule?.startListening) {
          try {
            await CallDisconnectModule.startListening();
            console.log('[Voice] CallDisconnectModule started successfully');
          } catch (e) {
            console.warn('[Voice] CallDisconnectModule start failed:', e);
            Alert.alert('Warning', 'Call metrics started but disconnect cause listener failed: ' + e.message);
          }
        } else {
          console.warn('[Voice] CallDisconnectModule not available');
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


