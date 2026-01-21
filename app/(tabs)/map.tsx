import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, PermissionsAndroid, ActivityIndicator } from 'react-native';
import { MapView, Camera, PointAnnotation } from '@maplibre/maplibre-react-native';
import { requireNativeModule } from 'expo-modules-core';
import { theme } from '../../src/constants/theme';

const DeviceDiagnosticModule = requireNativeModule('DeviceDiagnosticModule');

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

const NETWORK_COLORS = {
  '5G': '#3b82f6',      // Blue
  '4G': '#8ec63f',      // Green
  '3G': '#FACC15',      // Yellow
  '2G': '#ef4444',      // Red
  'UNKNOWN': '#6b7280', // Gray (Fallback)
};

export default function MapScreen() {
  const [data, setData] = useState({
    latitude: 0,
    longitude: 0,
    accuracy: 0,
    netType: 'Searching...',
    enb: 'N/A',
    rsrp: '---',
    loading: true
  });
  
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [currentRegion, setCurrentRegion] = useState('Unknown');
  const cameraRef = useRef(null);
  const hasSetInitialCamera = useRef(false);

  useEffect(() => {
    const requestAllPermissions = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
          ]);
          if (granted['android.permission.ACCESS_FINE_LOCATION'] === 'granted' &&
              granted['android.permission.READ_PHONE_STATE'] === 'granted') {
            setPermissionsGranted(true);
          }
        } catch (err) { console.warn(err); }
      } else { setPermissionsGranted(true); }
    };
    requestAllPermissions();
  }, []);

  const updateDiagnostics = useCallback(async () => {
    if (!permissionsGranted) return;
    try {
      const res = await DeviceDiagnosticModule.getFullDiagnostics();
      if (res && res.lat && res.lat !== "0.0") {
        const lat = parseFloat(res.lat);
        const lon = parseFloat(res.lon);
        
        setData({
          latitude: lat,
          longitude: lon,
          accuracy: res.accuracy ? parseFloat(res.accuracy) : 0,
          netType: res.netType || 'UNKNOWN',
          enb: res.enb || 'N/A',
          rsrp: res.rsrp || '---',
          loading: false
        });

        const region = ETHIO_TELECOM_REGIONS.find(r => {
          const b = r.bounds;
          return (lat >= b.latitude - b.latitudeDelta / 2 && lat <= b.latitude + b.latitudeDelta / 2 &&
                  lon >= b.longitude - b.longitudeDelta / 2 && lon <= b.longitude + b.longitudeDelta / 2);
        });
        setCurrentRegion(region?.name || 'Unknown');

        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [lon, lat],
            zoomLevel: 16,
            animationDuration: 1000,
          });
          hasSetInitialCamera.current = true;
        }
      }
    } catch (e) { console.error(e); }
  }, [permissionsGranted]);

  useEffect(() => {
    if (permissionsGranted) {
      const interval = setInterval(updateDiagnostics, 2000);
      return () => clearInterval(interval);
    }
  }, [updateDiagnostics, permissionsGranted]);

  // FIXED COLOR LOGIC: This checks if the netType string CONTAINS 5G, 4G, etc.
  const getMarkerColor = (type) => {
    const t = type.toUpperCase();
    if (t.includes('5G')) return NETWORK_COLORS['5G'];
    if (t.includes('4G') || t.includes('LTE')) return NETWORK_COLORS['4G'];
    if (t.includes('3G') || t.includes('HSPA') || t.includes('UMTS')) return NETWORK_COLORS['3G'];
    if (t.includes('2G') || t.includes('EDGE') || t.includes('GPRS')) return NETWORK_COLORS['2G'];
    return NETWORK_COLORS['UNKNOWN'];
  };

  const activeColor = getMarkerColor(data.netType);

  if (data.loading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.infoPanel} contentContainerStyle={styles.infoContent}>
        <Text style={styles.title}>Network Coverage Map</Text>
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Status</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Region:</Text><Text style={styles.infoValue}>{currentRegion}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Tech:</Text><Text style={[styles.infoValue, {color: activeColor}]}>{data.netType}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Site ID:</Text><Text style={styles.infoValue}>{data.enb}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Signal:</Text><Text style={styles.infoValue}>{data.rsrp} dBm</Text></View>
        
          <Text style={styles.infoTitle}>Location</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Lat/Lon:</Text><Text style={styles.infoValue}>{data.latitude.toFixed(5)}, {data.longitude.toFixed(5)}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Accuracy:</Text><Text style={styles.infoValue}>{data.accuracy.toFixed(1)}m</Text></View>
          
        </View>
      </ScrollView>

      <View style={styles.mapContainer}>
        <MapView style={styles.map} mapStyle="https://api.maptiler.com/maps/streets-v2/style.json?key=akWntIEAlqH2TssZK7gt">
          <Camera ref={cameraRef} />
          
          <PointAnnotation key={`marker-${activeColor}`} id="user" coordinate={[data.longitude, data.latitude]}>
            <View style={[styles.cursorSolid, { backgroundColor: activeColor }]} />
          </PointAnnotation>
        </MapView>

        <View style={styles.horizontalLegend}>
          {['5G', '4G', '3G', '2G'].map(tech => (
            <View key={tech} style={styles.legendItem}>
              <View style={[styles.miniDot, {backgroundColor: NETWORK_COLORS[tech]}]} />
              <Text style={styles.miniText}>{tech}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  centerLoading: { flex: 1, justifyContent: 'center' },
  infoPanel: { position: 'absolute', top: 0, left: 0, right: 0, maxHeight: '35%', zIndex: 10, backgroundColor: '#F2F2F7', paddingTop: 45 },
  infoContent: { padding: 7 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  infoBox: { backgroundColor: '#FFF', borderRadius: 12, padding: 10, marginBottom: 8, elevation: 2 },
  infoTitle: { fontSize: 10, fontWeight: 'bold', color: '#8E8E93', marginBottom: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  infoLabel: { fontSize: 12 },
  infoValue: { fontSize: 12, fontWeight: 'bold' },
  mapContainer: { flex: 1, marginTop: '35%' },
  map: { flex: 1 },
  cursorSolid: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 3, borderColor: '#FFFFFF',
    elevation: 10, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 5
  },
  horizontalLegend: { position: 'absolute', bottom: 3, left: 50, right: 2, backgroundColor: '#FFF', flexDirection: 'row', justifyContent: 'space-around', padding: 12, borderRadius: 25, elevation: 5 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  miniDot: { width: 12, height: 12, borderRadius: 6, marginRight: 5 },
  miniText: { fontSize: 12, fontWeight: 'bold' }
});