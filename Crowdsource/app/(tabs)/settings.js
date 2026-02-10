import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, Platform } from 'react-native';
import BrandedButton from '../../src/components/BrandedButton';
import { useState, useEffect, useRef, useCallback } from 'react';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import { useQoE } from '../../src/context/QoEContext';
import { backendApi } from '../../src/services/backendApi';
import { theme } from '../../src/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireNativeModule } from 'expo-modules-core';
import { pushNotificationService } from '../../src/services/notificationService';
import ScreenHeader from '../../src/components/ScreenHeader';
import { BACKEND_CONFIG } from '../../src/constants/config';

const BACKEND_URL_KEY = '@backend_url';
const BACKEND_API_KEY = '@backend_api_key';
const AUTO_SYNC_KEY = '@auto_sync_enabled';
const PUSH_ENABLED_KEY = '@push_notifications_enabled';
const DeviceDiagnosticModule = requireNativeModule('DeviceDiagnosticModule');

export default function SettingsScreen() {
  const { metrics, scores, history, resetMetrics, clearHistory } = useQoE();

  // Default: QA requested Push OFF by default
  const [pushEnabled, setPushEnabled] = useState(false);

  // Default: QA requested Auto-Sync ON by default (but hidden)
  const [autoSync, setAutoSync] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load settings (persisted overrides)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [sync, push] = await Promise.all([
          AsyncStorage.getItem(AUTO_SYNC_KEY),
          AsyncStorage.getItem(PUSH_ENABLED_KEY),
        ]);

        // If explicit preference exists, use it. Otherwise default to TRUE for sync.
        if (sync !== null) {
          setAutoSync(sync === 'true');
        } else {
          // First run: Default to TRUE
          setAutoSync(true);
        }

        // If explicit preference exists, use it. Otherwise default to FALSE for push.
        if (push !== null) {
          setPushEnabled(push === 'true');
        } else {
          // First run: Default to FALSE
          setPushEnabled(false);
        }
      } catch (error) {
        console.error('[Settings] Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  const togglePushNotifications = async (value) => {
    setPushEnabled(value);
    try {
      await AsyncStorage.setItem(PUSH_ENABLED_KEY, value.toString());
      if (value) {
        // Enable: Register token
        const token = await pushNotificationService.initialize();
        if (token) {
          Alert.alert('Notifications Enabled', 'You will now receive QoE alerts.');
        } else {
          // If failed (e.g. permission denied) revert toggle
          setPushEnabled(false);
          await AsyncStorage.setItem(PUSH_ENABLED_KEY, 'false');
          Alert.alert('Error', 'Failed to enable notifications. Please check app permissions.');
        }
      } else {
        // Disable: Unregister token
        await pushNotificationService.unregisterToken();
      }
    } catch (error) {
      console.error('[Settings] Failed to save push preference:', error);
    }
  };

  // Refs to keep latest metrics/scores without restarting the interval
  const metricsRef = useRef(metrics);
  const scoresRef = useRef(scores);
  useEffect(() => { metricsRef.current = metrics; }, [metrics]);
  useEffect(() => { scoresRef.current = scores; }, [scores]);

  const [lastSyncTime, setLastSyncTime] = useState(null);

  const syncToBackend = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      // 1. Fetch diagnostics from Native Module safely
      let diagnostics = null;
      if (DeviceDiagnosticModule) {
        try {
          diagnostics = await DeviceDiagnosticModule.getFullDiagnostics();
        } catch (e) {
          console.warn('[Settings] Native diagnostics failed', e);
        }
      }

      // 2. Assemble device info
      const deviceInfo = {
        platform: Platform.OS,
        model: Device.modelName || 'unknown',
        osVersion: Platform.Version.toString(),
        appVersion: '1.0.0',
        brand: diagnostics?.brand || Device.brand || 'N/A',
        Android_version: diagnostics?.Version || Platform.Version.toString(),
        operator: diagnostics?.operator || 'N/A',
        rsrp: diagnostics?.rsrp ?? 'N/A',
        rsrq: diagnostics?.rsrq ?? 'N/A',
        rssnr: diagnostics?.rssnr ?? 'N/A',
        cqi: diagnostics?.cqi ?? 'N/A',
        netType: diagnostics?.netType ?? 'N/A',
        enb: diagnostics?.enb ?? 'N/A',
        cellId: diagnostics?.cellId ?? 'N/A',
        pci: diagnostics?.pci ?? 'N/A',
        tac: diagnostics?.tac ?? 'N/A',
        eci: diagnostics?.eci ?? 'N/A',
        dataState: diagnostics?.dataState ?? 'N/A',
        dataActivity: diagnostics?.dataActivity ?? 'N/A',
        callState: diagnostics?.callState ?? 'N/A',
        simState: diagnostics?.simState ?? 'N/A',
        isRoaming: diagnostics?.isRoaming ?? 'N/A',
      };

      // 3. Get Location
      let location = null;
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          location = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy,
            timestamp: loc.timestamp,
          };
        }
      } catch (locError) {
        console.warn('[Settings] Location error', locError);
      }

      // 4. Send the data to the backend
      const currentMetrics = metricsRef.current;
      const currentScores = scoresRef.current;
      const result = await backendApi.sendMetrics(currentMetrics, currentScores, deviceInfo, location);
      console.log('[Settings] Sync result:', result.success ? 'OK' : result.error);
      setLastSyncTime(new Date().toLocaleTimeString());

    } catch (error) {
      console.error('[Settings] Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // Auto-sync: stable interval that doesn't restart on metric changes
  useEffect(() => {
    if (!autoSync) return;

    // Initial sync after 10 seconds
    const timeout = setTimeout(syncToBackend, 10000);
    // Then every 5 minutes
    const interval = setInterval(syncToBackend, 300000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [autoSync, syncToBackend]);

  const SettingItem = ({ title, description, onPress, rightComponent, danger = false }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingItemContent}>
        <Text style={[styles.settingItemTitle, danger && styles.settingItemTitleDanger]}>
          {title}
        </Text>
        {description && (
          <Text style={styles.settingItemDescription}>{description}</Text>
        )}
      </View>
      {rightComponent && <View style={styles.settingItemRight}>{rightComponent}</View>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.mainContainer}>
      <ScreenHeader title="Settings" />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.headerTextSection}>
          <Text style={styles.subtitle}>
            Configure app settings and view information.
          </Text>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingItemContent}>
              <Text style={styles.settingItemTitle}>Push Notifications</Text>
              <Text style={styles.settingItemDescription}>Receive alerts when QoE scores are poor</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={togglePushNotifications}
              trackColor={{ false: theme.colors.border.medium, true: theme.colors.primary }}
              thumbColor={theme.colors.white}
            />
          </View>
        </View>

        {/* App Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <SettingItem
            title="Version"
            description="1.0.0"
            onPress={null}
          />
          <SettingItem
            title="Scoring Standard"
            description="ETSI TR 103 559"
            onPress={null}
          />
          <SettingItem
            title="About"
            description="Crowdsourcing QoE Measurement App"
            onPress={null}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  headerTextSection: {
    marginBottom: theme.spacing.lg,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  settingItem: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  settingItemContent: {
    flex: 1,
  },
  settingItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  settingItemTitleDanger: {
    color: theme.colors.danger,
  },
  settingItemDescription: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  settingItemRight: {
    marginLeft: theme.spacing.sm,
  },
  statsContainer: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    ...theme.shadows.sm,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  statLabel: {
    color: theme.colors.text.secondary,
    fontSize: 14,
  },
  statValue: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  backendConfig: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    ...theme.shadows.sm,
  },
  inputLabel: {
    color: theme.colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.background.primary,
    borderWidth: 1,
    borderColor: theme.colors.border.medium,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm + 4,
    color: theme.colors.text.primary,
    fontSize: 14,
    marginBottom: theme.spacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  switchLabel: {
    color: theme.colors.text.primary,
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  syncStatus: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
});
