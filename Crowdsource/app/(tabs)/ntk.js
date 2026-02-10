import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { requireNativeModule } from 'expo-modules-core';
import { theme } from '../../src/constants/theme';
import ScreenHeader from '../../src/components/ScreenHeader';

// Modern Expo Modules way to import Kotlin module
const DeviceDiagnosticModule = requireNativeModule('DeviceDiagnosticModule');

const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || 'N/A'}</Text>
  </View>
);

export default function NetworkTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDiagnostics = useCallback(async () => {
    try {
      const res = await DeviceDiagnosticModule.getFullDiagnostics();
      setData({ ...res, _ts: new Date().toLocaleTimeString() });
    } catch (error) {
      console.error("Diagnostic Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Just fetch diagnostics — location permissions are handled by the map tab
    fetchDiagnostics();
    const interval = setInterval(fetchDiagnostics, 2000);
    return () => clearInterval(interval);
  }, [fetchDiagnostics]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Network Monitor" />
      <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Signal Strength */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Signal Quality</Text>
          <InfoRow label="RSRP" value={data?.rsrp ? `${data.rsrp} dBm` : null} />
          <InfoRow label="RSRQ" value={data?.rsrq ? `${data.rsrq} dB` : null} />
          <InfoRow label="SINR" value={data?.rssnr ? `${data.rssnr} dB` : null} />
        </View>

        {/* Serving Cell */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Serving Cell</Text>
          <InfoRow label="eNB (Site ID)" value={data?.enb} />
          <InfoRow label="Cell ID" value={data?.cellId} />
          <InfoRow label="PCI" value={data?.pci} />
          <InfoRow label="TAC" value={data?.tac} />
          <InfoRow label="Network Type" value={data?.netType} />
        </View>

        {/* Network States */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Network States</Text>
          <InfoRow label="Data State" value={data?.dataState} />
          <InfoRow label="Roaming" value={data?.isRoaming ? 'Yes' : 'No'} />
        </View>

        {/* GPS Location */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>GPS Location</Text>
          {data?.lat && data?.lon ? (
            <>
              <InfoRow label="Latitude" value={Number(data.lat).toFixed(6)} />
              <InfoRow label="Longitude" value={Number(data.lon).toFixed(6)} />
              <InfoRow label="Accuracy" value={data.accuracy ? `${Number(data.accuracy).toFixed(1)}m` : null} />
            </>
          ) : (
            <Text style={styles.infoValue}>Waiting for location...</Text>
          )}
        </View>

        {/* Device Information */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Device Information</Text>
          <InfoRow label="Model" value={data?.model} />
          <InfoRow label="Manufacturer" value={data?.brand} />
          <InfoRow label="OS Version" value={data?.version} />
        </View>

        {/* Last updated */}
        <Text style={styles.updateText}>Last updated: {data?._ts || '--'}</Text>
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
  },
  updateText: {
    fontSize: 11,
    color: theme.colors.text.light,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
});