import { View, Text, StyleSheet, Button, Alert, Platform, PermissionsAndroid, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { useQoE } from '../../src/context/QoEContext';
import { theme } from '../../src/constants/theme';
import BrandedButton from '../../src/components/BrandedButton';
import CallMetrics, {
  CallStateChangePayload,
  CallDisconnectModule,
} from 'call-metrics';

export default function VoiceScreen() {
  const { addVoiceSample, metrics, scores } = useQoE();
  const [lastEvent, setLastEvent] = useState(null);
  const [lastReason, setLastReason] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const callStartTimeRef = useRef(null);
  const callSetupStartTimeRef = useRef(null);

  // Debug logging for metrics
  useEffect(() => {
    console.log('[Voice] Metrics updated:', {
      attempts: metrics.voice.attempts,
      setupOk: metrics.voice.setupOk,
      completed: metrics.voice.completed,
      dropped: metrics.voice.dropped,
      setupTimes: metrics.voice.setupTimes,
      mosSamples: metrics.voice.mosSamples,
    });
  }, [metrics]);

  // Debug logging for scores
  useEffect(() => {
    console.log('[Voice] Scores calculated:', {
      cssr: scores.voice.cssr,
      cdr: scores.voice.cdr,
      cstAvg: scores.voice.cstAvg,
      mosAvg: scores.voice.mosAvg,
    });
  }, [scores]);

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

  useEffect(() => {
    const subscription = CallMetrics.addListener(
      'callMetrics:update',
      (payload: CallStateChangePayload) => {
        setLastEvent(payload);
        const now = Date.now();

        console.log('[Voice] Call state changed:', payload.state, payload);

        if (payload.state === 'ringing') {
          // Call is ringing - start tracking setup time
          console.log('[Voice] Call ringing - starting setup timer');
          callSetupStartTimeRef.current = now;
          addVoiceSample({
            attempt: true,
          });
        } else if (payload.state === 'offhook') {
          // Call answered - calculate setup time
          if (callSetupStartTimeRef.current !== null) {
            const setupTime = now - callSetupStartTimeRef.current;
            console.log('[Voice] Call answered - setup time:', setupTime, 'ms');
            addVoiceSample({
              setupSuccessful: true,
              setupTimeMs: setupTime,
            });
            callSetupStartTimeRef.current = null;
          } else {
            // If we missed ringing state, use a default setup time or estimate
            // For outgoing calls, setup is usually very fast (< 1 second)
            console.log('[Voice] Call answered (missed ringing state) - using estimated setup time');
            // Estimate setup time as 500ms for outgoing calls
            addVoiceSample({
              attempt: true,
              setupSuccessful: true,
              setupTimeMs: 500, // Estimated setup time for outgoing calls
            });
          }
          callStartTimeRef.current = now;
        } else if (payload.state === 'idle') {
          // Call ended
          if (callStartTimeRef.current !== null) {
            // Call was answered (offhook happened)
            const callDuration = now - callStartTimeRef.current;
            // If call lasted less than 5 seconds, consider it dropped
            const wasDropped = callDuration < 5000;
            console.log('[Voice] Call ended - duration:', callDuration, 'ms, dropped:', wasDropped);
            
            // Don't increment attempts here - attempt was already counted when call started
            addVoiceSample({
              attempt: false, // Explicitly set to false to prevent double-counting
              callCompleted: !wasDropped,
              dropped: wasDropped,
            });
            
            callStartTimeRef.current = null;
          } else if (callSetupStartTimeRef.current !== null) {
            // Call ended while ringing (missed call) - this is a failed setup attempt
            console.log('[Voice] Call ended while ringing (missed call) - failed setup');
            const setupTime = now - callSetupStartTimeRef.current;
            callSetupStartTimeRef.current = null;
            // Attempt was already counted when ringing started
            // This is a failed setup attempt (ringing but not answered)
            // We don't need to add anything here since attempt was already counted
            // and setupSuccessful defaults to false, so CSSR will be correct
          } else {
            // Call ended without any prior state - ignore this (initial state or app startup)
            console.log('[Voice] Call ended without prior state - ignoring');
          }
        }
      }
    );

    return () => {
      subscription?.remove();
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
      setLastReason(payload);
      if (payload?.causeCode !== undefined || payload?.causeLabel) {
        addVoiceSample({
          attempt: false,
          callCompleted: false,
          dropped: false,
          reasonCode: payload?.causeCode,
          reasonLabel: payload?.causeLabel || payload?.state,
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
        granted = results[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] === PermissionsAndroid.RESULTS.GRANTED;
        const callLogGranted = results[PermissionsAndroid.PERMISSIONS.READ_CALL_LOG] === PermissionsAndroid.RESULTS.GRANTED;
        
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
        Alert.alert('Success', 'Call listener started. Make or receive a call to see events.');
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Voice QoE</Text>
      <Text style={styles.subtitle}>
        Native module is listening to Android call state. Make and end calls to
        see events.
      </Text>

      <View style={styles.statusBox}>
        <Text style={styles.statusTitle}>Status</Text>
        <Text style={[styles.statusText, isListening && { color: theme.colors.success }]}>
          {isListening ? '🟢 Listening for call events' : '⚪ Listener stopped'}
        </Text>
      </View>

      <View style={styles.buttonsRow}>
        <BrandedButton
          title="Start listener"
          onPress={handleStart}
          disabled={isListening}
          style={{ flex: 1 }}
        />
        <BrandedButton
          title="Stop listener"
          onPress={handleStop}
          disabled={!isListening}
          variant="outline"
          style={{ flex: 1 }}
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

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Mean Opinion Score (MOS)</Text>
          <Text style={styles.metricValue}>
            {formatMOS(scores.voice.mosAvg)}
          </Text>
        </View>
        {scores.voice.mosAvg === null && (
          <Text style={styles.noteText}>
            Note: MOS requires audio quality measurements (not yet implemented)
          </Text>
        )}

        <View style={styles.divider} />

        <Text style={styles.subsectionTitle}>Raw Statistics</Text>
        
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Total Attempts</Text>
          <Text style={styles.metricValue}>{metrics.voice.attempts}</Text>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Setup Successful</Text>
          <Text style={styles.metricValue}>{metrics.voice.setupOk}</Text>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Calls Completed</Text>
          <Text style={styles.metricValue}>{metrics.voice.completed}</Text>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Calls Dropped</Text>
          <Text style={styles.metricValue}>{metrics.voice.dropped}</Text>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Setup Time Samples</Text>
          <Text style={styles.metricValue}>{metrics.voice.setupTimes?.length || 0}</Text>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>MOS Samples</Text>
          <Text style={styles.metricValue}>{metrics.voice.mosSamples?.length || 0}</Text>
        </View>
      </View>

      <View style={styles.lastEventBox}>
        <Text style={styles.lastEventTitle}>Last call state event</Text>
        <Text style={styles.lastEventText}>
          {lastEvent
            ? `${lastEvent.state} @ ${new Date(
                lastEvent.timestamp
              ).toLocaleTimeString()}`
            : 'No events yet'}
        </Text>
        {lastEvent && (
          <Text style={styles.eventDetails}>
            Phone: {lastEvent.phoneNumber || 'N/A'}
          </Text>
        )}
      </View>

      <View style={styles.lastEventBox}>
        <Text style={styles.lastEventTitle}>Last disconnect reason (native)</Text>
        <Text style={styles.lastEventText}>
          {lastReason
            ? `${lastReason.causeLabel || 'Unknown'} (${lastReason.causeCode ?? 'n/a'})`
            : 'No disconnect causes yet'}
        </Text>
        {lastReason?.timestamp && (
          <Text style={styles.eventDetails}>
            At: {new Date(lastReason.timestamp).toLocaleTimeString()} · Source: {lastReason.source || 'native'}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xl + 20,
    paddingBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
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
  lastEventBox: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  lastEventTitle: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  lastEventText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
  },
  eventDetails: {
    color: theme.colors.text.light,
    fontSize: 12,
    marginTop: 4,
  },
  noteText: {
    color: theme.colors.text.light,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
});


