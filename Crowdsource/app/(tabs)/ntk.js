import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Linking
} from 'react-native';
import { requireNativeModule } from 'expo-modules-core';
import { theme } from '../../src/constants/theme';

// ✅ Modern Expo Modules way to import your Kotlin module
const DeviceDiagnosticModule = requireNativeModule('DeviceDiagnosticModule');

const Card = ({ title, children, accent = "#007AFF" }) => (
  <View style={[styles.card, { borderTopColor: accent }]}>
    <Text style={[styles.cardTitle, { color: accent }]}>{title}</Text>
    <View style={styles.grid}>{children}</View>
  </View>
);

const Kpi = ({ label, value, color = "#1C1C1E" }) => (
  <View style={styles.kpiContainer}>
    <Text style={styles.kpiLabel}>{label}</Text>
    <Text style={[styles.kpiValue, { color }]}>{value || '---'}</Text>
  </View>
);

export default function NetworkTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDiagnostics = useCallback(async () => {
    try {
      // ✅ Using the AsyncFunction defined in our Kotlin module
      const res = await DeviceDiagnosticModule.getFullDiagnostics();
      setData({ ...res, _ts: new Date().toLocaleTimeString() });
    } catch (error) {
      console.error("Diagnostic Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const requestFullPermissions = async () => {
      if (Platform.OS !== 'android') return;

      try {
        // STEP 1: Request Foreground Location & Phone State
        const foregroundPerms = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        ];

        const granted = await PermissionsAndroid.requestMultiple(foregroundPerms);

        const isFineLocationGranted =
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

        // STEP 2: Request Background Location (Only if Foreground is granted first)
        if (isFineLocationGranted && Platform.Version >= 29) {
          const backgroundStatus = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
          );

          if (!backgroundStatus) {
            Alert.alert(
              "Permission Needed!",
              "Background Location Permission Needed to get  your device network coverage information while you are not using this app! Would you please select 'Allow all time' in the next screen.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "OK",
                  onPress: async () => {
                    // Triggering the direct system request
                    // NOTE: On Android 11+, this triggers the system settings redirect
                    const bgGranted = await PermissionsAndroid.request(
                      PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
                    );

                    if (bgGranted !== PermissionsAndroid.RESULTS.GRANTED) {
                      // If they didn't select 'Allow all the time', we prompt them to go to settings manually
                      Alert.alert(
                        "Action Required",
                        "You selected 'Only while using'. To get full coverage info, please go to Permissions > Location and select 'Allow all the time'.",
                        [
                          { text: "Later", style: "cancel" },
                          { text: "Go to Settings", onPress: () => Linking.openSettings() }
                        ]
                      );
                    }
                  }
                }
              ]
            );
          }
        }

        // Initial fetch
        fetchDiagnostics();
      } catch (err) {
        console.warn(err);
      }
    };

    requestFullPermissions();
    const interval = setInterval(fetchDiagnostics, 2000);
    return () => clearInterval(interval);
  }, [fetchDiagnostics]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Network Monitor</Text>
      <Text style={styles.subtitle}>
        Real-time network signal and cell identity metrics.
      </Text>

      <Text style={styles.updateText}>Last Refresh: {data?._ts}</Text>

      <Card title="DEVICE INFORMATION" accent={theme.colors.purple}>
        <Kpi label="Brand" value={data?.brand} />
        <Kpi label="Model" value={data?.model} />
        <Kpi label="Android Ver" value={data?.version} />
        <Kpi label="Operator" value={data?.operator} color={theme.colors.primary} />
      </Card>

      <Card title={`SIGNAL QUALITY (${data?.netType || 'N/A'})`} accent={theme.colors.primary}>
        <Kpi label="RSRP" value={data?.rsrp ? data.rsrp + " dBm" : "---"} color={theme.colors.primary} />
        <Kpi label="RSRQ" value={data?.rsrq ? data.rsrq + " dB" : "---"} color={theme.colors.warning} />
        <Kpi label="RSSNR" value={data?.rssnr} color={theme.colors.success} />
        <Kpi label="CQI" value={data?.cqi} color={theme.colors.purple} />
      </Card>

      <Card title="CELL IDENTITY" accent={theme.colors.success}>
        <Kpi label="Site ID (eNB)" value={data?.enb} />
        <Kpi label="Cell ID" value={data?.cellId} />
        <Kpi label="PCI" value={data?.pci} />
        <Kpi label="TAC" value={data?.tac} />
        <Kpi label="ECI" value={data?.eci} />
      </Card>

      <Card title="NETWORK STATES" accent={theme.colors.primary}>
        <Kpi label="Data State" value={data?.dataState} />
        <Kpi label="Data Activity" value={data?.dataActivity} />
        <Kpi label="Call State" value={data?.callState} />
        <Kpi label="SIM State" value={data?.simState} />
        <Kpi label="Roaming" value={data?.isRoaming} />
      </Card>

      <Card title="GPS LOCATION" accent={theme.colors.warning}>
        <Kpi label="Latitude" value={data?.lat} />
        <Kpi label="Longitude" value={data?.lon} />
        <Kpi label="Accuracy" value={data?.accuracy ? data.accuracy + "m" : "---"} />
        <Kpi label="Altitude" value={data?.alt ? data.alt + "m" : "---"} />
      </Card>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  updateText: { fontSize: 11, color: theme.colors.text.light, marginBottom: 15 },
  card: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md - 1,
    marginBottom: theme.spacing.md - 1,
    borderTopWidth: 4,
    ...theme.shadows.md
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: theme.spacing.md - 1,
    textTransform: 'uppercase'
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  kpiContainer: { width: '50%', marginBottom: theme.spacing.sm },
  kpiLabel: { fontSize: 11, color: theme.colors.text.light, textTransform: 'uppercase' },
  kpiValue: { fontSize: 16, fontWeight: '600', marginTop: 2, color: theme.colors.text.primary }
});