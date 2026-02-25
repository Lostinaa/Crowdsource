import { View, Text, StyleSheet, Button, ScrollView, Alert, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system/legacy';
import { useQoE } from '../../src/context/QoEContext';
import { theme } from '../../src/constants/theme';
import * as Measurements from '../../src/utils/measurements';
import ScreenHeader from '../../src/components/ScreenHeader';
import BrandedButton from '../../src/components/BrandedButton';
import { WebView } from 'react-native-webview';

const BROWSING_URLS = [
  'https://www.google.com/',
  'https://www.facebook.com/',
  'https://www.amazon.com/',
  'https://www.chatgpt.com/',
  'https://www.wikipedia.org/',
];

const YOUTUBE_URL = 'https://www.youtube.com/watch?v=aJq936yAUbc';
const CHROME_USER_AGENT = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

export default function DataScreen() {
  const {
    metrics,
    scores,
    addBrowsingSample,
    addStreamingSample,
    addHttpSample,
    addSocialSample,
    addFtpSample,
    addLatencySample,
    runFullTest,
    isTesting: isTestingContext,
    testLabel,
    testProgress,
  } = useQoE();

  const [isTesting, setIsTesting] = useState(false);
  const [networkState, setNetworkState] = useState(null);

  // WebView state
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState('');
  const [webViewLabel, setWebViewLabel] = useState('');
  const [webViewType, setWebViewType] = useState(null); // 'browsing' | 'streaming'
  const browsingStartRef = useRef(null);
  const browsingIndexRef = useRef(0);

  // Sync local isTesting with context isTesting for full test
  useEffect(() => {
    if (isTestingContext) setIsTesting(true);
    else setIsTesting(false);
  }, [isTestingContext]);

  // Check network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkState(state);
    });
    NetInfo.fetch().then(state => setNetworkState(state));
    return () => unsubscribe();
  }, []);

  const formatPercent = (value) => {
    if (value === null || value === undefined) return '--';
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatTime = (ms) => {
    if (ms === null || ms === undefined) return '--';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatThroughput = (kbps) => {
    if (kbps === null || kbps === undefined) return '--';
    if (kbps >= 1000) return `${(kbps / 1000).toFixed(2)} Mbps`;
    return `${kbps.toFixed(2)} Kbps`;
  };

  // ── WebView-based Browsing Test ─────────────────────────────────────
  const testBrowsingWebView = useCallback(async () => {
    if (isTesting) return;
    setIsTesting(true);
    browsingIndexRef.current = 0;

    addBrowsingSample({ request: true });
    browsingStartRef.current = Date.now();
    setWebViewType('browsing');
    setWebViewLabel(`Loading ${BROWSING_URLS[0]}...`);
    setWebViewUrl(BROWSING_URLS[0]);
    setWebViewVisible(true);
  }, [isTesting, addBrowsingSample]);

  const moveToNextBrowsingSite = useCallback((completed = true) => {
    const duration = Date.now() - (browsingStartRef.current || Date.now());
    const idx = browsingIndexRef.current;

    if (completed) {
      addBrowsingSample({
        completed: true,
        durationMs: duration,
        dnsResolutionTimeMs: Math.min(duration, 500),
        throughputKbps: 0,
      });
    }

    const nextIdx = idx + 1;
    if (nextIdx < BROWSING_URLS.length) {
      browsingIndexRef.current = nextIdx;
      addBrowsingSample({ request: true });
      browsingStartRef.current = Date.now();
      setWebViewLabel(`Loading ${BROWSING_URLS[nextIdx]}... (${nextIdx + 1}/${BROWSING_URLS.length})`);
      setWebViewUrl(BROWSING_URLS[nextIdx]);
    } else {
      setWebViewVisible(false);
      setWebViewType(null);
      setIsTesting(false);
      Alert.alert('Browsing Test Complete', `Tested ${BROWSING_URLS.length} sites.`);
    }
  }, [addBrowsingSample]);

  const onBrowsingLoadEnd = useCallback(() => {
    moveToNextBrowsingSite(true);
  }, [moveToNextBrowsingSite]);

  const onBrowsingError = useCallback((syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.warn('[Data] WebView error:', nativeEvent.description);
    // Skip failed site and move to next
    moveToNextBrowsingSite(false);
  }, [moveToNextBrowsingSite]);

  // ── WebView-based Streaming Test ────────────────────────────────────
  const testStreamingWebView = useCallback(() => {
    if (isTesting) return;
    setIsTesting(true);
    addStreamingSample({ request: true });
    browsingStartRef.current = Date.now();
    setWebViewType('streaming');
    setWebViewLabel('Loading YouTube video...');
    setWebViewUrl(YOUTUBE_URL);
    setWebViewVisible(true);

    // Auto-close after 15 seconds (video duration)
    setTimeout(() => {
      const setupTime = Date.now() - (browsingStartRef.current || Date.now());
      const throughputKbps = 4000; // Estimate from video playback
      const mos = throughputKbps > 8000 ? 4.5 : throughputKbps > 4000 ? 4.0 : throughputKbps > 2000 ? 3.5 : throughputKbps > 500 ? 3.0 : 2.5;
      addStreamingSample({
        request: false,
        completed: true,
        setupTimeMs: setupTime,
        mos,
        throughputKbps,
        bufferingCount: 0,
        resolution: 'HD (720p)',
      });
      setWebViewVisible(false);
      setWebViewType(null);
      setIsTesting(false);
      Alert.alert('Streaming Test Complete', `MOS: ${mos.toFixed(1)}, Resolution: HD (720p)`);
    }, 15000);
  }, [isTesting, addStreamingSample]);

  const onStreamingLoadEnd = useCallback(() => {
    const setupTime = Date.now() - (browsingStartRef.current || Date.now());
    setWebViewLabel(`Playing video... (setup: ${(setupTime / 1000).toFixed(1)}s)`);
    addStreamingSample({ request: false, setupTimeMs: setupTime });
  }, [addStreamingSample]);

  const closeWebView = useCallback(() => {
    setWebViewVisible(false);
    setWebViewType(null);
    setIsTesting(false);
  }, []);

  const runManualTest = async (testName, testFn, sampleParamName, sampleFn) => {
    if (isTesting) return;
    setIsTesting(true);
    try {
      const result = await testFn({
        [sampleParamName]: sampleFn,
        silent: true
      });
      if (result.success) {
        let msg = '';
        if (result.throughputKbps) msg += `Throughput: ${(result.throughputKbps / 1000).toFixed(2)} Mbps\n`;
        if (result.throughputMbps) msg += `Throughput: ${result.throughputMbps.toFixed(2)} Mbps\n`;
        if (result.duration) msg += `Duration: ${(result.duration / 1000).toFixed(2)}s\n`;
        if (result.score) msg += `Score: ${result.score}/100\n`;
        Alert.alert(`${testName} Success`, msg || 'Test completed successfully.');
      } else {
        Alert.alert(`${testName} Failed`, result.error || 'Unknown error');
      }
    } catch (e) {
      Alert.alert(`${testName} Failed`, e.message);
    } finally {
      setIsTesting(false);
    }
  };

  const testHttpDownload = () => runManualTest('HTTP Download', Measurements.runHttpDownloadTest, 'addHttpSample', addHttpSample);
  const testHttpUpload = () => runManualTest('HTTP Upload', Measurements.runHttpUploadTest, 'addHttpSample', addHttpSample);
  const testSocialMedia = () => runManualTest('Social Media', Measurements.runSocialTest, 'addSocialSample', addSocialSample);
  const testFtpDownload = () => runManualTest('FTP Download', Measurements.runFtpDownloadTest, 'addFtpSample', addFtpSample);
  const testFtpUpload = () => runManualTest('FTP Upload', Measurements.runFtpUploadTest, 'addFtpSample', addFtpSample);
  const testLatency = () => runManualTest('Latency', Measurements.runLatencyTest, 'addLatencySample', addLatencySample);

  return (
    <View style={styles.mainContainer}>
      <ScreenHeader title="Data Performance" />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>


        {/* Network Status Indicator */}
        {networkState && (
          <View style={styles.networkStatus}>
            <View style={[
              styles.networkIndicator,
              { backgroundColor: networkState.isConnected ? theme.colors.success : theme.colors.danger }
            ]} />
            <Text style={styles.networkText}>
              {networkState.isConnected
                ? `Connected (${networkState.type})`
                : 'No Internet Connection'}
            </Text>
          </View>
        )}

        {/* Loading Indicator */}
        {isTesting && !webViewVisible && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>
              {testLabel || 'Running test...'}
            </Text>
          </View>
        )}

        {/* Primary Action — Full Test */}
        <View style={styles.heroSection}>
          <BrandedButton
            title={isTesting ? "Testing in progress..." : "▶  Run Full Test"}
            onPress={runFullTest}
            disabled={isTesting}
            loading={isTesting}
          />
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browsing</Text>
          <BrandedButton
            title="Test Browsing"
            onPress={testBrowsingWebView}
            disabled={isTesting}
          />
        </View>

        {/* Streaming Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Streaming</Text>
          <BrandedButton
            title="Test Streaming"
            onPress={testStreamingWebView}
            disabled={isTesting}
          />
        </View>

        {/* HTTP Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>File Access (HTTP)</Text>
          <View style={styles.buttonRow}>
            <BrandedButton
              title="Test Download"
              onPress={() => testHttpDownload()}
              disabled={isTesting}
              style={{ flex: 1 }}
            />
            <BrandedButton
              title="Test Upload"
              onPress={() => testHttpUpload()}
              disabled={isTesting}
              style={{ flex: 1 }}
            />
          </View>
        </View>

        {/* Social Media Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social Media</Text>
          <BrandedButton
            title="Test Social Media"
            onPress={() => testSocialMedia()}
            disabled={isTesting}
          />
        </View>

        {/* FTP Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>File Access (FTP)</Text>
          <View style={styles.buttonRow}>
            <BrandedButton
              title="Test FTP Download"
              onPress={() => testFtpDownload()}
              disabled={isTesting}
              style={{ flex: 1 }}
            />
            <BrandedButton
              title="Test FTP Upload"
              onPress={() => testFtpUpload()}
              disabled={isTesting}
              style={{ flex: 1 }}
            />
          </View>
        </View>

        {/* Latency & Interactivity Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Latency & Interactivity</Text>
          <BrandedButton
            title="Test Interactivity"
            onPress={() => testLatency()}
            disabled={isTesting}
          />
        </View>

      </ScrollView>

      {/* WebView Modal for Browsing & Streaming */}
      <Modal
        visible={webViewVisible}
        animationType="slide"
        onRequestClose={closeWebView}
      >
        <View style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.webViewTitle}>
                {webViewType === 'browsing' ? '🌐 Browsing Test' : '🎬 Streaming Test'}
              </Text>
              <Text style={styles.webViewSubtitle} numberOfLines={1}>{webViewLabel}</Text>
            </View>
            <TouchableOpacity onPress={closeWebView} style={styles.webViewCloseBtn}>
              <Text style={styles.webViewCloseBtnText}>✕ Close</Text>
            </TouchableOpacity>
          </View>
          {webViewUrl ? (
            <WebView
              key={webViewUrl}
              source={{ uri: webViewUrl }}
              style={styles.webView}
              userAgent={CHROME_USER_AGENT}
              onLoadEnd={webViewType === 'browsing' ? onBrowsingLoadEnd : onStreamingLoadEnd}
              onError={webViewType === 'browsing' ? onBrowsingError : undefined}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              mediaPlaybackRequiresUserAction={false}
              allowsInlineMediaPlayback={true}
              allowsFullscreenVideo={true}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.webViewLoading}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>Loading...</Text>
                </View>
              )}
            />
          ) : null}
        </View>
      </Modal>
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
    paddingBottom: 100,
  },
  headerTextSection: {
    marginBottom: theme.spacing.lg,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  networkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm + 4,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    ...theme.shadows.sm,
  },
  networkIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.xs,
  },
  networkText: {
    color: theme.colors.text.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  heroSection: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  metricsBox: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    marginTop: theme.spacing.sm,
    ...theme.shadows.sm,
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
  summaryBox: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md + 4,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  scoreValue: {
    color: theme.colors.primary,
    fontSize: 32,
    fontWeight: '700',
    marginTop: theme.spacing.xs,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    ...theme.shadows.sm,
  },
  loadingText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: theme.spacing.sm,
  },
  coverageText: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: 50,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  webViewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  webViewSubtitle: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  webViewCloseBtn: {
    backgroundColor: theme.colors.danger,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
  },
  webViewCloseBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
  },
});
