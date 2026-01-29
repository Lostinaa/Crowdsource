import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, TextInput, Platform } from 'react-native';
import BrandedButton from '../../src/components/BrandedButton';
import { useState, useEffect } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import { useQoE } from '../../src/context/QoEContext';
import { backendApi } from '../../src/services/backendApi';
import { theme } from '../../src/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireNativeModule } from 'expo-modules-core';
import { pushNotificationService } from '../../src/services/notificationService';

const BACKEND_URL_KEY = '@backend_url';
const BACKEND_API_KEY = '@backend_api_key';
const AUTO_SYNC_KEY = '@auto_sync_enabled';
const PUSH_ENABLED_KEY = '@push_notifications_enabled';
const DeviceDiagnosticModule = requireNativeModule('DeviceDiagnosticModule');

export default function SettingsScreen() {
  const { metrics, scores, history, resetMetrics, clearHistory } = useQoE();
  const [autoSave, setAutoSave] = useState(false);
  const [backendUrl, setBackendUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [autoSync, setAutoSync] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [key, sync, push] = await Promise.all([
          AsyncStorage.getItem(BACKEND_API_KEY),
          AsyncStorage.getItem(AUTO_SYNC_KEY),
          AsyncStorage.getItem(PUSH_ENABLED_KEY),
        ]);

        const getDefaultUrl = () => {
          if (process.env.EXPO_PUBLIC_BACKEND_URL) return process.env.EXPO_PUBLIC_BACKEND_URL;
          if (Platform.OS === 'android' && !Device.isDevice) {
            return 'http://10.0.2.2:8000/api';
          }
          // Default fallback
          return 'http://172.25.210.174:8000/api';
        };
        const backendUrlToUse = getDefaultUrl();
        setBackendUrl(backendUrlToUse);
        backendApi.setBackendUrl(backendUrlToUse);

        if (key) {
          setApiKey(key);
          backendApi.setApiKey(key);
        }
        if (sync === 'true') {
          setAutoSync(true);
        }
        // Default to true if not set
        setPushEnabled(push !== 'false');
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

  // Auto-sync when enabled
  useEffect(() => {
    if (autoSync && metrics && scores) {
      const syncInterval = setInterval(() => {
        syncToBackend();
      }, 300000); // Sync every 5 minutes

      return () => clearInterval(syncInterval);
    }
  }, [autoSync, metrics, scores]);

  const exportToJSON = async () => {
    try {
      const data = {
        exportDate: new Date().toISOString(),
        currentMetrics: metrics,
        currentScores: scores,
        history: history,
      };

      const fileName = `qoe-export-${Date.now()}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data, null, 2));

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export QoE Data',
        });
        Alert.alert('Success', 'Data exported successfully!');
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('[Settings] Export error:', error);
      Alert.alert('Error', 'Failed to export data: ' + error.message);
    }
  };

  const exportToCSV = async () => {
    try {
      let csv = 'Timestamp,Overall Score,Voice Score,Data Score,Voice Attempts,Voice Completed,Voice Dropped,Browsing Requests,Browsing Completed,Streaming Requests,Streaming Completed,HTTP DL Requests,HTTP DL Completed,HTTP UL Requests,HTTP UL Completed,Social Requests,Social Completed\n';

      // Add current metrics
      const now = new Date().toISOString();
      csv += `${now},${scores.overall?.score || ''},${scores.voice?.score || ''},${scores.data?.score || ''},`;
      csv += `${metrics.voice.attempts},${metrics.voice.completed},${metrics.voice.dropped},`;
      csv += `${metrics.data.browsing.requests},${metrics.data.browsing.completed},`;
      csv += `${metrics.data.streaming.requests},${metrics.data.streaming.completed},`;
      csv += `${metrics.data.http.dl.requests},${metrics.data.http.dl.completed},`;
      csv += `${metrics.data.http.ul.requests},${metrics.data.http.ul.completed},`;
      csv += `${metrics.data.social.requests},${metrics.data.social.completed}\n`;

      // Add history entries
      history.forEach((entry) => {
        const timestamp = new Date(entry.timestamp).toISOString();
        csv += `${timestamp},${entry.scores.overall?.score || ''},${entry.scores.voice?.score || ''},${entry.scores.data?.score || ''},`;
        csv += `${entry.metrics.voice.attempts},${entry.metrics.voice.completed},${entry.metrics.voice.dropped},`;
        csv += `${entry.metrics.data.browsing.requests},${entry.metrics.data.browsing.completed},`;
        csv += `${entry.metrics.data.streaming.requests},${entry.metrics.data.streaming.completed},`;
        csv += `${entry.metrics.data.http.dl.requests},${entry.metrics.data.http.dl.completed},`;
        csv += `${entry.metrics.data.http.ul.requests},${entry.metrics.data.http.ul.completed},`;
        csv += `${entry.metrics.data.social.requests},${entry.metrics.data.social.completed}\n`;
      });

      const fileName = `qoe-export-${Date.now()}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, csv);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export QoE Data',
        });
        Alert.alert('Success', 'Data exported to CSV successfully !');
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('[Settings] CSV export error:', error);
      Alert.alert('Error', 'Failed to export CSV: ' + error.message);
    }
  };

  const handleResetMetrics = () => {
    Alert.alert(
      'Reset Metrics',
      'Are you sure you want to reset all current metrics? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetMetrics();
            Alert.alert('Success', 'Metrics reset successfully!');
          },
        },
      ]
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all history entries? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearHistory();
            Alert.alert('Success', 'History cleared successfully!');
          },
        },
      ]
    );
  };

  const saveBackendSettings = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem(BACKEND_API_KEY, apiKey),
        AsyncStorage.setItem(AUTO_SYNC_KEY, autoSync.toString()),
      ]);
      // backendApi.setBackendUrl(backendUrl); // Set on load based on ENV
      backendApi.setApiKey(apiKey);
      Alert.alert('Success', 'Backend settings saved!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save backend settings: ' + error.message);
    }
  };

  const testBackendConnection = async () => {
    setIsSyncing(true);
    setSyncStatus('Testing connection...');
    try {
      const result = await backendApi.testConnection();
      setSyncStatus(result.message);
      Alert.alert(
        result.success ? 'Success' : 'Failed',
        result.message
      );
    } catch (error) {
      setSyncStatus('Connection test failed');
      Alert.alert('Error', 'Connection test failed: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // const syncToBackend = async () => {
  //   if (isSyncing) return;

  //   setIsSyncing(true);
  //   setSyncStatus('Syncing...');

  //   try {
  //     // Get device info
  //     const deviceInfo = {
  //       platform: Platform.OS,
  //       model: Device.modelName || 'unknown',
  //       osVersion: Platform.Version.toString(),
  //       appVersion: '1.0.0',
  //     };

  //     // Get location if available
  //     let location = null;
  //     try {
  //       const { status } = await Location.getForegroundPermissionsAsync();
  //       if (status === 'granted') {
  //         const loc = await Location.getCurrentPositionAsync({
  //           accuracy: Location.Accuracy.Balanced,
  //         });
  //         location = {
  //           latitude: loc.coords.latitude,
  //           longitude: loc.coords.longitude,
  //           accuracy: loc.coords.accuracy,
  //           timestamp: loc.timestamp,
  //         };
  //       }
  //     } catch (locError) {
  //       console.warn('[Settings] Failed to get location:', locError);
  //     }

  //     const result = await backendApi.sendMetrics(metrics, scores, deviceInfo, location);

  //     if (result.success) {
  //       setSyncStatus('Sync successful');
  //       Alert.alert('Success', 'Data synced to backend successfully!');
  //     } else {
  //       setSyncStatus('Sync failed: ' + result.error);
  //       Alert.alert('Warning', 'Sync failed: ' + result.error);
  //     }
  //   } catch (error) {
  //     setSyncStatus('Sync error: ' + error.message);
  //     Alert.alert('Error', 'Failed to sync: ' + error.message);
  //   } finally {
  //     setIsSyncing(false);
  //   }
  // };
  const syncToBackend = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatus('Syncing...');

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

      // 2. Assemble ONE FLAT Object
      // We remove "signalQuality", "cellIdentity", etc. 
      // This allows the backend to see "rsrp", "cellId", etc. as individual fields.
      const deviceInfo = {
        // Device Details
        platform: Platform.OS,
        model: Device.modelName || 'unknown',
        osVersion: Platform.Version.toString(),
        appVersion: '1.0.0',
        brand: diagnostics?.brand || Device.brand || 'N/A',
        Android_version: diagnostics?.Version || Platform.Version.toString(),
        operator: diagnostics?.operator || 'N/A',

        // Signal KPIs (Now at root level)
        rsrp: diagnostics?.rsrp ?? 'N/A',
        rsrq: diagnostics?.rsrq ?? 'N/A',
        rssnr: diagnostics?.rssnr ?? 'N/A',
        cqi: diagnostics?.cqi ?? 'N/A',
        netType: diagnostics?.netType ?? 'N/A',

        // Cell Identity KPIs (Now at root level)
        enb: diagnostics?.enb ?? 'N/A',
        cellId: diagnostics?.cellId ?? 'N/A',
        pci: diagnostics?.pci ?? 'N/A',
        tac: diagnostics?.tac ?? 'N/A',
        eci: diagnostics?.eci ?? 'N/A',

        // Network State KPIs (Now at root level)
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

      // 4. Send the flattened data to the backend
      const result = await backendApi.sendMetrics(metrics, scores, deviceInfo, location);

      if (result.success) {
        setSyncStatus('Sync successful');
        Alert.alert('Success', 'Data synced successfully!');
      } else {
        setSyncStatus('Sync failed: ' + result.error);
        Alert.alert('Warning', 'Sync failed: ' + result.error);
      }
    } catch (error) {
      setSyncStatus('Error: ' + error.message);
      Alert.alert('Sync Error', error.message);
    } finally {
      setIsSyncing(false);
    }
  };
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>
        Configure app settings, export data, and manage your QoE measurements.
      </Text>

      {/* Data Export Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Export</Text>
        <SettingItem
          title="Export to JSON"
          description="Export all QoE data including current metrics and history"
          onPress={exportToJSON}
        />
        <SettingItem
          title="Export to CSV"
          description="Export QoE data in CSV format for spreadsheet analysis"
          onPress={exportToCSV}
        />
      </View>

      {/* Data Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        <SettingItem
          title="Reset Current Metrics"
          description="Clear all current QoE measurements (history will be preserved)"
          onPress={handleResetMetrics}
          danger={true}
        />
        <SettingItem
          title="Clear History"
          description={`Delete all ${history.length} saved history entries`}
          onPress={handleClearHistory}
          danger={true}
        />
      </View>

      {/* Statistics Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>History Entries</Text>
            <Text style={styles.statValue}>{history.length}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Voice Attempts</Text>
            <Text style={styles.statValue}>{metrics.voice.attempts}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Data Tests</Text>
            <Text style={styles.statValue}>
              {metrics.data.browsing.requests +
                metrics.data.streaming.requests +
                metrics.data.http.dl.requests +
                metrics.data.http.ul.requests +
                metrics.data.social.requests}
            </Text>
          </View>
        </View>
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

      {/* Backend Sync Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Backend Sync</Text>
        <View style={styles.backendConfig}>
          <Text style={styles.inputLabel}>Backend URL</Text>
          <Text style={[styles.inputLabel, { fontSize: 13, fontWeight: '400', marginBottom: 15, color: theme.colors.text.secondary }]}>
            {process.env.EXPO_PUBLIC_BACKEND_URL || 'Using default configuration'}
          </Text>
          <Text style={styles.inputLabel}>API Key (Optional)</Text>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="Enter API key for authentication"
            placeholderTextColor="#6b7280"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Auto Sync (every 5 min)</Text>
            <Switch
              value={autoSync}
              onValueChange={setAutoSync}
              trackColor={{ false: theme.colors.border.medium, true: theme.colors.primary }}
              thumbColor={theme.colors.white}
            />
          </View>
          <View style={styles.buttonRow}>
            <BrandedButton
              title="Save Settings"
              onPress={saveBackendSettings}
              variant="outline"
              style={{ flex: 1 }}
            />
            <BrandedButton
              title="Test Connection"
              onPress={testBackendConnection}
              disabled={isSyncing}
              loading={isSyncing}
              variant="outline"
              style={{ flex: 1 }}
            />
          </View>
          <BrandedButton
            title={isSyncing ? 'Syncing...' : 'Sync Now'}
            onPress={syncToBackend}
            disabled={isSyncing || !backendUrl}
            loading={isSyncing}
            style={{ marginTop: theme.spacing.sm }}
          />
          {syncStatus ? (
            <Text style={styles.syncStatus}>{syncStatus}</Text>
          ) : null}
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
    marginBottom: theme.spacing.lg,
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
  button: {
    flex: 1,
    padding: theme.spacing.sm + 4,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
  },
  buttonSecondary: {
    backgroundColor: theme.colors.gray,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  syncStatus: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
});
