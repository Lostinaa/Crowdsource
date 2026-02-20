import { View, Text, StyleSheet, ScrollView, Alert, Platform, PermissionsAndroid } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { MapView, Camera, PointAnnotation } from '@maplibre/maplibre-react-native';
import NetInfo from '@react-native-community/netinfo';
import { useQoE } from '../../src/context/QoEContext';
import { theme } from '../../src/constants/theme';
import DeviceDiagnosticModule from '../../CallMetrics/src/DeviceDiagnosticModule';
import { backendApi } from '../../src/services/backendApi';
import ScreenHeader from '../../src/components/ScreenHeader';

// Ethio Telecom regions (simplified - you can expand this with actual region boundaries)
const ETHIO_TELECOM_REGIONS = [
  { name: 'Addis Ababa', bounds: { latitude: 9.02497, longitude: 38.74689, latitudeDelta: 0.5, longitudeDelta: 0.5 } },
  { name: 'Oromia', bounds: { latitude: 8.9806, longitude: 38.7578, latitudeDelta: 2.0, longitudeDelta: 2.0 } },
  { name: 'Amhara', bounds: { latitude: 11.8251, longitude: 37.7815, latitudeDelta: 2.0, longitudeDelta: 2.0 } },
  { name: 'Tigray', bounds: { latitude: 14.0324, longitude: 38.3166, latitudeDelta: 2.0, longitudeDelta: 2.0 } },
  { name: 'SNNPR', bounds: { latitude: 6.5157, longitude: 36.9541, latitudeDelta: 2.0, longitudeDelta: 2.0 } },
  { name: 'Afar', bounds: { latitude: 11.7556, longitude: 40.9587, latitudeDelta: 2.0, longitudeDelta: 2.0 } },
  { name: 'Somali', bounds: { latitude: 6.6612, longitude: 43.7908, latitudeDelta: 2.0, longitudeDelta: 2.0 } },
  { name: 'Gambela', bounds: { latitude: 8.1280, longitude: 34.5621, latitudeDelta: 1.0, longitudeDelta: 1.0 } },
  { name: 'Harari', bounds: { latitude: 9.3099, longitude: 42.1283, latitudeDelta: 0.5, longitudeDelta: 0.5 } },
  { name: 'Dire Dawa', bounds: { latitude: 9.6009, longitude: 41.8501, latitudeDelta: 0.5, longitudeDelta: 0.5 } },
];

// Network technology color codes (using theme colors where appropriate)
const NETWORK_COLORS = {
  '2G': '#ef4444',      // Red (danger)
  '3G': '#FACC15',      // Yellow (warning from theme)
  '4G': '#8ec63f',      // Green (success from theme)
  '5G': '#3b82f6',      // Blue (info)
  'unknown': '#6b7280', // Gray
};

const getNetworkCategory = (value: string | null | undefined): keyof typeof NETWORK_COLORS => {
  if (!value) return 'unknown';
  const upper = value.toUpperCase();
  if (upper.includes('5G') || upper.includes('NR')) return '5G';
  if (upper.includes('4G') || upper.includes('LTE')) return '4G';
  if (upper.includes('3G') || upper.includes('UMTS') || upper.includes('HSPA')) return '3G';
  if (upper.includes('2G') || upper.includes('EDGE') || upper.includes('GPRS')) return '2G';
  return 'unknown';
};

/** Returns human-readable network technology label from native or NetInfo data. */
const getNetworkLabel = (
  netType: string | null | undefined,
  category: keyof typeof NETWORK_COLORS,
  cellularGen: string | null | undefined,
): string => {
  // Native netType is most accurate (handles 5G NSA, NR, etc.)
  if (netType) {
    const upper = netType.toUpperCase();
    if (upper.includes('NR') || upper.includes('5G')) return '5G NR';
    if (upper.includes('LTE')) return '4G LTE';
    if (upper.includes('HSPA+') || upper.includes('HSPAP')) return '3G HSPA+';
    if (upper.includes('HSPA')) return '3G HSPA';
    if (upper.includes('UMTS')) return '3G UMTS';
    if (upper.includes('EDGE')) return '2G EDGE';
    if (upper.includes('GPRS')) return '2G GPRS';
    return netType; // Return as-is if unrecognized but not null
  }
  // NetInfo cellular generation fallback
  if (cellularGen) {
    const g = cellularGen.toLowerCase();
    if (g === '5g') return '5G';
    if (g === '4g') return '4G LTE';
    if (g === '3g') return '3G';
    if (g === '2g') return '2G';
  }
  // Category-only fallback
  if (category !== 'unknown') return category;
  return 'Detecting...';
};

export default function MapScreen() {
  const { metrics } = useQoE();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [phoneStatePermission, setPhoneStatePermission] = useState(false);
  const [networkState, setNetworkState] = useState<any>(null);
  const [diagnostics, setDiagnostics] = useState<{
    netType?: string;
    enb?: string;
    cellId?: string;
    rsrp?: string;
    rsrq?: string;
    rssnr?: string;
    cqi?: string;
    pci?: string;
    tac?: string;
    eci?: string;
    lat?: string;
    lon?: string;
    accuracy?: string;
  } | null>(null);
  const [trackPoints, setTrackPoints] = useState<
    {
      id: string;
      longitude: number;
      latitude: number;
      category: keyof typeof NETWORK_COLORS;
      rsrp?: string;
    }[]
  >([]);
  const [historicalSamples, setHistoricalSamples] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [currentRegion, setCurrentRegion] = useState<string>('Unknown');
  const [mapError, setMapError] = useState(false);
  const cameraRef = useRef<any>(null);
  const hasSetInitialCamera = useRef(false);

  // Request location permission
  useEffect(() => {
    const requestLocationPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
          ]);

          const fineGranted =
            granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
          const phoneGranted =
            granted[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] === PermissionsAndroid.RESULTS.GRANTED;

          setLocationPermission(fineGranted);
          setPhoneStatePermission(phoneGranted);
        } catch (err) {
          console.warn('[Map] Permission error:', err);
          setLocationPermission(false);
          setPhoneStatePermission(false);
        }
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(status === 'granted');
        setPhoneStatePermission(false);
      }
    };

    requestLocationPermission();
  }, []);

  // Get current location
  useEffect(() => {
    if (!locationPermission) return;

    const getLocation = async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(loc);

        // Set initial camera position on first location fix
        if (!hasSetInitialCamera.current && cameraRef.current) {
          try {
            cameraRef.current.setCamera({
              centerCoordinate: [loc.coords.longitude, loc.coords.latitude],
              zoomLevel: 15,
              animationDuration: 0,
            });
            hasSetInitialCamera.current = true;
          } catch (error) {
            console.error('[Map] Camera setup error:', error);
          }
        } else if (cameraRef.current) {
          // Update camera position for subsequent updates
          try {
            cameraRef.current.setCamera({
              centerCoordinate: [loc.coords.longitude, loc.coords.latitude],
              zoomLevel: 15,
              animationDuration: 1000,
            });
          } catch (error) {
            console.error('[Map] Camera update error:', error);
          }
        }

        // Determine which region we're in
        const region = ETHIO_TELECOM_REGIONS.find(r => {
          const bounds = r.bounds;
          return (
            loc.coords.latitude >= bounds.latitude - bounds.latitudeDelta / 2 &&
            loc.coords.latitude <= bounds.latitude + bounds.latitudeDelta / 2 &&
            loc.coords.longitude >= bounds.longitude - bounds.longitudeDelta / 2 &&
            loc.coords.longitude <= bounds.longitude + bounds.longitudeDelta / 2
          );
        });
        setCurrentRegion(region?.name || 'Unknown');
      } catch (error) {
        console.error('[Map] Location error:', error);
        Alert.alert('Error', 'Failed to get location: ' + (error as Error).message);
      }
    };

    getLocation();

    // Update location periodically
    const interval = setInterval(getLocation, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [locationPermission]);

  // Poll native diagnostics (signal + cell info) where available (Android)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let isMounted = true;

    const tick = async () => {
      try {
        const res = await DeviceDiagnosticModule.getFullDiagnostics();
        if (!isMounted) return;
        setDiagnostics(res ?? null);
      } catch (error) {
        // Don't spam alerts; just log once per tick.
        console.warn('[Map] Diagnostics error:', error);
      }
    };

    if (Platform.OS === 'android' && locationPermission && phoneStatePermission) {
      tick();
      interval = setInterval(tick, 2000);
    }

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [locationPermission, phoneStatePermission]);

  // Monitor network state
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkState(state);
    });

    NetInfo.fetch().then(state => {
      setNetworkState(state);
    });

    return () => unsubscribe();
  }, []);

  // Prefer native diagnostics netType when available (handles 5G NSA correctly),
  // otherwise fall back to NetInfo.
  const networkCategory = diagnostics?.netType
    ? getNetworkCategory(diagnostics.netType)
    : getNetworkCategory(networkState?.details?.cellularGeneration || networkState?.type || null);
  const networkColor = NETWORK_COLORS[networkCategory] || NETWORK_COLORS.unknown;

  // Build an nPerf-like trail: record points as we move with current network quality
  useEffect(() => {
    if (!location) return;

    const category = networkCategory;
    const { latitude, longitude } = location.coords;

    // Skip if coordinates are obviously invalid
    if (!latitude || !longitude) return;

    setTrackPoints(prev => {
      const next = [
        ...prev,
        {
          id: `${Date.now()}-${prev.length}`,
          latitude,
          longitude,
          category,
          rsrp: diagnostics?.rsrp,
        },
      ];
      // Keep last 500 points to avoid unbounded growth
      if (next.length > 500) {
        return next.slice(next.length - 500);
      }
      return next;
    });
  }, [location, networkCategory, diagnostics?.rsrp]);

  // Load historical coverage samples from backend when map screen loads
  useEffect(() => {
    const loadHistoricalSamples = async () => {
      setIsLoadingHistory(true);
      try {
        // Load last 1000 samples from the last 7 days
        const endDate = new Date().toISOString();
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const result = await backendApi.getCoverageSamples({
          startDate,
          endDate,
          limit: 1000,
        });

        if (result.success && result.data) {
          console.log('[Map] Loaded', result.count, 'historical coverage samples');
          // Convert backend samples to track points format
          const samples = result.data.map((sample: any) => ({
            id: `historical-${sample.id}`,
            latitude: parseFloat(sample.latitude),
            longitude: parseFloat(sample.longitude),
            category: (sample.network_category || 'unknown') as keyof typeof NETWORK_COLORS,
            rsrp: sample.rsrp,
          }));
          setHistoricalSamples(samples);
        }
      } catch (error) {
        console.warn('[Map] Failed to load historical samples:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistoricalSamples();
  }, []); // Load once when component mounts

  // Push latest point to backend (fire-and-forget)
  useEffect(() => {
    if (!trackPoints.length) return;
    const last = trackPoints[trackPoints.length - 1];
    const sample = {
      timestamp: new Date().toISOString(),
      latitude: last.latitude,
      longitude: last.longitude,
      accuracy: location?.coords?.accuracy,
      networkType: diagnostics?.netType || networkCategory,
      networkCategory,
      rsrp: diagnostics?.rsrp,
      rsrq: diagnostics?.rsrq,
      rssnr: diagnostics?.rssnr,
      cqi: diagnostics?.cqi,
      enb: diagnostics?.enb,
      cellId: diagnostics?.cellId,
      pci: diagnostics?.pci,
      tac: diagnostics?.tac,
      eci: diagnostics?.eci,
      raw: {
        diagnostics,
        networkStateType: networkState?.type,
        netinfoGeneration: networkState?.details?.cellularGeneration,
      },
    };

    backendApi.sendCoverageSample(sample).catch(err => {
      console.warn('[Map] Failed to send coverage sample:', err);
    });
  }, [trackPoints]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Coverage Map" />

      {/* Network Info Cards (Moved from Network Tab) */}
      <View style={styles.cardsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsScrollContent}>
          {/* Signal Quality Card */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Signal Quality</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>RSRP</Text>
              <Text style={styles.infoValue}>{diagnostics?.rsrp ? `${diagnostics.rsrp} dBm` : 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>RSRQ</Text>
              <Text style={styles.infoValue}>{diagnostics?.rsrq ? `${diagnostics.rsrq} dB` : 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>SINR</Text>
              <Text style={styles.infoValue}>{diagnostics?.rssnr ? `${diagnostics.rssnr} dB` : 'N/A'}</Text>
            </View>
          </View>

          {/* Serving Cell Card */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Serving Cell</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>eNB / Cell ID</Text>
              <Text style={styles.infoValue}>
                {diagnostics?.enb || 'N/A'} / {diagnostics?.cellId || 'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>PCI / TAC</Text>
              <Text style={styles.infoValue}>
                {diagnostics?.pci || 'N/A'} / {diagnostics?.tac || 'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Network</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.networkIndicator, { backgroundColor: networkColor }]} />
                <Text style={styles.infoValue}>
                  {getNetworkLabel(
                    diagnostics?.netType,
                    networkCategory,
                    networkState?.details?.cellularGeneration,
                  )}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Map View */}
      <View style={styles.mapContainer}>
        {locationPermission ? (
          mapError ? (
            <View style={styles.mapPlaceholder}>
              <Text style={styles.placeholderText}>
                Unable to load map. Please check your internet connection.
              </Text>
            </View>
          ) : (
            <MapView
              style={styles.map}
              mapStyle="https://api.maptiler.com/maps/streets-v2/style.json?key=akWntIEAlqH2TssZK7gt"
              onDidFailLoadingMap={() => {
                console.error("MapLibre: Failed to load map");
                setMapError(true);
              }}
            >
              {/* Camera will be positioned once on first location fix */}
              <Camera ref={cameraRef} />

              {/* User location marker */}
              {location && (
                <PointAnnotation
                  key={`user-location-${networkCategory}`}
                  id="user-location"
                  coordinate={[location.coords.longitude, location.coords.latitude]}
                  title="Your Location"
                >
                  <View
                    style={{
                      backgroundColor: networkColor,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 3,
                      borderColor: '#fff',
                      elevation: 4,
                    }}
                  />
                </PointAnnotation>
              )}

              {/* Historical coverage samples from backend */}
              {historicalSamples.map(point => (
                <PointAnnotation
                  key={point.id}
                  id={point.id}
                  coordinate={[point.longitude, point.latitude]}
                >
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: NETWORK_COLORS[point.category],
                      borderWidth: 1,
                      borderColor: 'white',
                      opacity: 0.7,
                    }}
                  />
                </PointAnnotation>
              ))}

              {/* Current session coverage trail markers (nPerf-style dots) */}
              {trackPoints.map(point => (
                <PointAnnotation
                  key={point.id}
                  id={point.id}
                  coordinate={[point.longitude, point.latitude]}
                >
                  <View
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 7,
                      backgroundColor: NETWORK_COLORS[point.category],
                      borderWidth: 1,
                      borderColor: 'white',
                      opacity: 0.9,
                    }}
                  />
                </PointAnnotation>
              ))}

              {/* Region markers */}
              {ETHIO_TELECOM_REGIONS.map((region, index) => (
                <PointAnnotation
                  key={index}
                  id={`region-${index}`}
                  coordinate={[region.bounds.longitude, region.bounds.latitude]}
                  title={region.name}
                >
                  <View
                    style={{
                      backgroundColor: '#6b7280',
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      borderWidth: 2,
                      borderColor: '#fff',
                    }}
                  />
                </PointAnnotation>
              ))}
            </MapView>
          )
        ) : (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.placeholderText}>
              Location permission required to display map
            </Text>
          </View>
        )}
      </View>

      {/* Compact legend at the bottom, aligned horizontally */}
      <View style={styles.legendBar}>
        {Object.entries(NETWORK_COLORS).map(([tech, color]) => (
          <View key={tech} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendLabel}>{tech}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  cardsContainer: {
    paddingVertical: theme.spacing.sm,
  },
  cardsScrollContent: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
  },
  infoCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    width: 280,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    ...theme.shadows.sm,
  },
  cardTitle: {
    fontSize: 13,
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
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  networkIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.card,
    padding: theme.spacing.lg,
  },
  placeholderText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    lineHeight: 20,
  },
  legendBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  legendLabel: {
    color: theme.colors.text.secondary,
    fontSize: 12,
  },
});

