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
import ScreenHeader from '../../src/components/ScreenHeader';

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
              "Background Location Permission Needed to get your device network coverage information while you are not using this app! Would you please select 'Allow all time' in the next screen.",
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
    <View style={styles.container}>
      <ScreenHeader title="Network Monitor" />
      <ScrollView style={styles.scrollContent}>
        {/* Signal Strength */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Network Quality</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Signal Strength (RSRP):</Text>
            <Text style={styles.infoValue}>{data?.rsrp ? `${data.rsrp} dBm` : 'N/A'}</Text>
          </View>
        </View>

        {/* Network States - Simplified */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Network States</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Data State:</Text>
            <Text style={styles.infoValue}>{data?.dataState || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Roaming:</Text>
            <Text style={styles.infoValue}>{data?.isRoaming ? 'Yes' : 'No'}</Text>
          </View>
        </View>

        {/* Device Information */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Device Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Model:</Text>
            <Text style={styles.infoValue}>{data?.model || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Manufacturer:</Text>
            <Text style={styles.infoValue}>{data?.brand || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>OS Version:</Text>
            <Text style={styles.infoValue}>{data?.version || 'N/A'}</Text>
          </View>
        </View>

        {/* GPS Location Info */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>GPS Location Info</Text>
          {data?.lat && data?.lon ? (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Latitude:</Text>
                <Text style={styles.infoValue}>{data.lat.toFixed(6)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Longitude:</Text>
                <Text style={styles.infoValue}>{data.lon.toFixed(6)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Accuracy:</Text>
                <Text style={styles.infoValue}>{data.accuracy ? data.accuracy.toFixed(1) + 'm' : 'N/A'}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.infoValue}>Waiting for location...</Text>
          )}
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
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  infoCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    ...theme.shadows.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  }
});