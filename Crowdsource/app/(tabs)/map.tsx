import { View, Text, StyleSheet, ScrollView, Alert, Platform, PermissionsAndroid } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { MapView, Camera, PointAnnotation } from '@maplibre/maplibre-react-native';
import NetInfo from '@react-native-community/netinfo';
import { useQoE } from '../../src/context/QoEContext';
import { theme } from '../../src/constants/theme';
import DeviceDiagnosticModule from '../../CallMetrics/src/DeviceDiagnosticModule';
import { backendApi } from '../../src/services/backendApi';

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
      <ScrollView style={styles.infoPanel} contentContainerStyle={styles.infoContent}>
        <Text style={styles.title}>Network Coverage Map</Text>
        <Text style={styles.subtitle}>
          Displaying your geographic position and network technology distribution
        </Text>

        {/* Location Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Geographic Position</Text>
          {location ? (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Latitude:</Text>
                <Text style={styles.infoValue}>{location.coords.latitude.toFixed(6)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Longitude:</Text>
                <Text style={styles.infoValue}>{location.coords.longitude.toFixed(6)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Accuracy:</Text>
                <Text style={styles.infoValue}>{Math.round(location.coords.accuracy)}m</Text>
              </View>
            </>
          ) : (
            <Text style={styles.infoValue}>Location not available</Text>
          )}
        </View>

        {/* Region Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Ethio Telecom Region</Text>
          <Text style={styles.infoValue}>{currentRegion}</Text>
        </View>

        {/* Network Technology Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Network Technology</Text>
          <View style={styles.infoRow}>
            <View style={[styles.networkIndicator, { backgroundColor: networkColor }]} />
            <Text style={styles.infoValue}>{diagnostics?.netType || networkCategory}</Text>
          </View>
          {/* Debug: show how we're categorizing for color */}
          <Text style={styles.infoSubtext}>
            Category (color driver): {networkCategory} ({networkColor})
          </Text>
          {diagnostics?.netType && (
            <Text style={styles.infoSubtext}>
              Reported: {diagnostics.netType}
            </Text>
          )}
          {networkState?.details?.cellularGeneration && (
            <Text style={styles.infoSubtext}>
              Generation: {networkState.details.cellularGeneration}
            </Text>
          )}
        </View>

        {/* Network Technology Distribution Legend */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Network Technology Colors</Text>
          {Object.entries(NETWORK_COLORS).map(([tech, color]) => (
            <View key={tech} style={styles.legendRow}>
              <View style={[styles.legendColor, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{tech}</Text>
            </View>
          ))}
        </View>

        {/* Serving Site Info (placeholder - would need actual cell tower data) */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Serving Site</Text>
          <Text style={styles.infoSubtext}>
            Site ID (eNB): {diagnostics?.enb || 'N/A'}
          </Text>
          <Text style={styles.infoSubtext}>
            Cell ID: {diagnostics?.cellId || networkState?.details?.cellId || 'N/A'}
          </Text>
          <Text style={styles.infoSubtext}>
            RSRP: {diagnostics?.rsrp ? `${diagnostics.rsrp} dBm` : 'N/A'}
          </Text>
          {networkState?.details?.carrier && (
            <Text style={styles.infoSubtext}>
              Carrier: {networkState.details.carrier}
            </Text>
          )}
        </View>
      </ScrollView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  infoPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    maxHeight: '40%',
    zIndex: 1,
    backgroundColor: theme.colors.background.secondary,
    opacity: 0.95,
  },
  infoContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xl + 20,
    paddingBottom: theme.spacing.md,
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
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.sm + 4,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    ...theme.shadows.sm,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoLabel: {
    color: theme.colors.text.secondary,
    fontSize: 12,
  },
  infoValue: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  infoSubtext: {
    color: theme.colors.text.secondary,
    fontSize: 11,
    marginTop: 4,
  },
  networkIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: theme.spacing.xs,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: theme.spacing.xs,
  },
  legendText: {
    color: theme.colors.text.primary,
    fontSize: 12,
  },
  mapContainer: {
    flex: 1,
    marginTop: '40%',
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
  placeholderTitle: {
    color: theme.colors.text.primary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  placeholderText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    lineHeight: 20,
  },
  errorOverlay: {
    position: 'absolute',
    bottom: theme.spacing.md,
    left: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: theme.colors.danger + 'DD',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.md,
  },
  errorText: {
    color: theme.colors.white,
    fontSize: 12,
    textAlign: 'center',
  },
});

