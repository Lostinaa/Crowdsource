/**
 * GlobalAutoSync — runs inside QoEProvider in the root layout,
 * so it syncs QoE metrics to the backend every 5 minutes
 * regardless of which tab the user is on.
 */
import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQoE } from '../context/QoEContext';
import { backendApi } from '../services/backendApi';

const AUTO_SYNC_KEY = '@auto_sync_enabled';
const SYNC_INTERVAL_MS = 300_000; // 5 minutes
const INITIAL_DELAY_MS = 15_000;  // 15 seconds after launch

// Try to load native diagnostics module safely
let DeviceDiagnosticModule = null;
try {
    const { requireNativeModule } = require('expo-modules-core');
    DeviceDiagnosticModule = requireNativeModule('DeviceDiagnosticModule');
} catch (_) {
    // Not available (Expo Go or web)
}

export default function GlobalAutoSync() {
    const { metrics, scores } = useQoE();
    const metricsRef = useRef(metrics);
    const scoresRef = useRef(scores);
    const isSyncingRef = useRef(false);

    // Keep refs in sync with latest context values
    useEffect(() => { metricsRef.current = metrics; }, [metrics]);
    useEffect(() => { scoresRef.current = scores; }, [scores]);

    const syncOnce = useCallback(async () => {
        if (isSyncingRef.current) return;

        // Check if auto-sync is enabled
        try {
            const enabled = await AsyncStorage.getItem(AUTO_SYNC_KEY);
            if (enabled === 'false') return; // user disabled
        } catch (_) { }

        const currentMetrics = metricsRef.current;
        const currentScores = scoresRef.current;

        // Don't send if there are no meaningful metrics
        const hasVoice = (currentMetrics?.voice?.attempts || 0) > 0;
        const hasData = (currentMetrics?.data?.browsing?.requests || 0) > 0
            || (currentMetrics?.data?.http?.dl?.requests || 0) > 0
            || (currentMetrics?.data?.streaming?.requests || 0) > 0;

        if (!hasVoice && !hasData) {
            console.log('[AutoSync] No new metrics to send, skipping');
            return;
        }

        isSyncingRef.current = true;
        try {
            // 1. Diagnostics
            let diagnostics = null;
            if (DeviceDiagnosticModule) {
                try {
                    diagnostics = await DeviceDiagnosticModule.getFullDiagnostics();
                } catch (e) {
                    console.warn('[AutoSync] Diagnostics failed', e);
                }
            }

            // 2. Device info
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

            // 3. Location
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
                console.warn('[AutoSync] Location error', locError);
            }

            // 4. Send
            const result = await backendApi.sendMetrics(currentMetrics, currentScores, deviceInfo, location);
            console.log('[AutoSync] Sync result:', result.success ? 'OK' : result.error);

        } catch (error) {
            console.error('[AutoSync] Sync failed:', error);
        } finally {
            isSyncingRef.current = false;
        }
    }, []);

    useEffect(() => {
        // Initial sync after a delay
        const timeout = setTimeout(syncOnce, INITIAL_DELAY_MS);
        // Then every 5 minutes
        const interval = setInterval(syncOnce, SYNC_INTERVAL_MS);

        return () => {
            clearTimeout(timeout);
            clearInterval(interval);
        };
    }, [syncOnce]);

    // Render nothing — this is a headless component
    return null;
}
