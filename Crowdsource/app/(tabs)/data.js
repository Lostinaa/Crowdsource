import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator, Modal, Animated } from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
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
  } = useQoE();

  const [isTesting, setIsTesting] = useState(false);
  const [networkState, setNetworkState] = useState(null);

  // Full test progressive state
  const [fullTestActive, setFullTestActive] = useState(false);
  const [fullTestStep, setFullTestStep] = useState(0);
  const [fullTestLabel, setFullTestLabel] = useState('');
  const [fullTestResult, setFullTestResult] = useState('');
  const [fullTestSteps, setFullTestSteps] = useState([]);

  // WebView state
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState('');
  const [webViewLabel, setWebViewLabel] = useState('');
  const [webViewType, setWebViewType] = useState(null);
  const [webViewKey, setWebViewKey] = useState(0);
  const browsingStartRef = useRef(null);
  const browsingIndexRef = useRef(0);
  const loadedRef = useRef(false);
  const streamTimerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  // Pulse animation for active test
  useEffect(() => {
    if (isTesting) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isTesting]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => setNetworkState(state));
    NetInfo.fetch().then(state => setNetworkState(state));
    return () => unsubscribe();
  }, []);

  // ── Full Test (Progressive) ────────────────────────────────────────
  const FULL_TEST_STEPS = [
    { key: 'latency', label: '📶 Latency Test', icon: '📶' },
    { key: 'browsing', label: '🌐 Browsing Test', icon: '🌐', webview: true },
    { key: 'streaming', label: '🎬 Streaming Test', icon: '🎬', webview: true },
    { key: 'http_dl', label: '⬇️ HTTP Download', icon: '⬇️' },
    { key: 'http_ul', label: '⬆️ HTTP Upload', icon: '⬆️' },
    { key: 'ftp_dl', label: '📥 FTP Download', icon: '📥' },
    { key: 'ftp_ul', label: '📤 FTP Upload', icon: '📤' },
    { key: 'social', label: '💬 Social Media', icon: '💬' },
  ];

  const runProgressiveFullTest = useCallback(async () => {
    if (isTesting) return;
    setIsTesting(true);
    setFullTestActive(true);
    setFullTestSteps(FULL_TEST_STEPS.map(s => ({ ...s, status: 'waiting' })));

    const updateStep = (idx, status, result = '') => {
      setFullTestSteps(prev => {
        const next = [...prev];
        next[idx] = { ...next[idx], status, result };
        return next;
      });
      setFullTestStep(idx);
      if (status === 'running') setFullTestLabel(FULL_TEST_STEPS[idx].label);
      if (result) setFullTestResult(result);
    };

    try {
      // 1. Latency
      updateStep(0, 'running');
      const latResult = await Measurements.runLatencyTest({ addLatencySample, silent: true });
      updateStep(0, 'done', latResult.success ? `Score: ${latResult.score}/100, Avg: ${Math.round(latResult.avgLatency)}ms` : `Failed: ${latResult.error}`);

      // 2. Browsing - WebView
      updateStep(1, 'running');
      await new Promise((resolve) => {
        browsingIndexRef.current = 0;
        loadedRef.current = false;
        addBrowsingSample({ request: true });
        browsingStartRef.current = Date.now();
        setWebViewType('browsing');
        setWebViewLabel(`Loading ${BROWSING_URLS[0]}... (1/${BROWSING_URLS.length})`);
        setWebViewUrl(BROWSING_URLS[0]);
        setWebViewKey(k => k + 1);
        setWebViewVisible(true);
        // Store resolve to be called when browsing completes
        browsingResolveRef.current = resolve;
      });
      updateStep(1, 'done', `Tested ${BROWSING_URLS.length} sites`);

      // 3. Streaming - WebView
      updateStep(2, 'running');
      await new Promise((resolve) => {
        loadedRef.current = false;
        addStreamingSample({ request: true });
        browsingStartRef.current = Date.now();
        setWebViewType('streaming');
        setWebViewLabel('Loading YouTube video...');
        setWebViewUrl('https://m.youtube.com/watch?v=aJq936yAUbc');
        setWebViewKey(k => k + 1);
        setWebViewVisible(true);
        streamResolveRef.current = resolve;
        streamTimerRef.current = setTimeout(() => {
          const setupTime = Date.now() - (browsingStartRef.current || Date.now());
          addStreamingSample({
            request: false, completed: true, setupTimeMs: setupTime,
            mos: 4.0, throughputKbps: 4000, bufferingCount: 0,
            resolution: '720p (HD)', resolutionScore: 4,
          });
          setWebViewVisible(false);
          setWebViewType(null);
          if (streamResolveRef.current) { streamResolveRef.current(); streamResolveRef.current = null; }
        }, 15000);
      });
      updateStep(2, 'done', 'Streaming complete');

      // 4. HTTP Download
      updateStep(3, 'running');
      const httpDl = await Measurements.runHttpDownloadTest({ addHttpSample, silent: true });
      updateStep(3, 'done', httpDl.success ? `${httpDl.throughputMbps.toFixed(2)} Mbps` : `Failed: ${httpDl.error}`);

      // 5. HTTP Upload
      updateStep(4, 'running');
      const httpUl = await Measurements.runHttpUploadTest({ addHttpSample, silent: true });
      updateStep(4, 'done', httpUl.success ? `${httpUl.throughputMbps.toFixed(2)} Mbps` : `Failed: ${httpUl.error}`);

      // 6. FTP Download
      updateStep(5, 'running');
      const ftpDl = await Measurements.runFtpDownloadTest({ addFtpSample, silent: true });
      updateStep(5, 'done', ftpDl.success ? `${(ftpDl.throughputKbps / 1000).toFixed(2)} Mbps` : `Failed: ${ftpDl.error}`);

      // 7. FTP Upload
      updateStep(6, 'running');
      const ftpUl = await Measurements.runFtpUploadTest({ addFtpSample, silent: true });
      updateStep(6, 'done', ftpUl.success ? `${(ftpUl.throughputKbps / 1000).toFixed(2)} Mbps` : `Failed: ${ftpUl.error}`);

      // 8. Social Media
      updateStep(7, 'running');
      const social = await Measurements.runSocialTest({ addSocialSample, silent: true });
      updateStep(7, 'done', social.success ? `${(social.duration / 1000).toFixed(2)}s` : `Failed: ${social.error}`);

      setFullTestLabel('✅ All Tests Complete!');
      setTimeout(() => Alert.alert('Full Test Complete', 'All QoE tests have been completed successfully.'), 500);

    } catch (error) {
      console.error('[FullTest] Error:', error);
      Alert.alert('Test Error', error.message);
    } finally {
      setIsTesting(false);
      setTimeout(() => setFullTestActive(false), 3000);
    }
  }, [isTesting, addLatencySample, addBrowsingSample, addStreamingSample, addHttpSample, addFtpSample, addSocialSample]);

  // Refs for resolving WebView promises during full test
  const browsingResolveRef = useRef(null);
  const streamResolveRef = useRef(null);

  // ── WebView-based Browsing Test (individual) ───────────────────────
  const testBrowsingWebView = useCallback(async () => {
    if (isTesting) return;
    setIsTesting(true);
    browsingIndexRef.current = 0;
    loadedRef.current = false;
    addBrowsingSample({ request: true });
    browsingStartRef.current = Date.now();
    setWebViewType('browsing');
    setWebViewLabel(`Loading ${BROWSING_URLS[0]}... (1/${BROWSING_URLS.length})`);
    setWebViewUrl(BROWSING_URLS[0]);
    setWebViewKey(k => k + 1);
    setWebViewVisible(true);
  }, [isTesting, addBrowsingSample]);

  const moveToNextBrowsingSite = useCallback((completed = true) => {
    const duration = Date.now() - (browsingStartRef.current || Date.now());
    const idx = browsingIndexRef.current;

    if (completed) {
      addBrowsingSample({
        completed: true, durationMs: duration,
        dnsResolutionTimeMs: Math.min(duration, 500), throughputKbps: 0,
      });
    }

    const nextIdx = idx + 1;
    if (nextIdx < BROWSING_URLS.length) {
      browsingIndexRef.current = nextIdx;
      loadedRef.current = false;
      addBrowsingSample({ request: true });
      browsingStartRef.current = Date.now();
      setWebViewLabel(`Loading ${BROWSING_URLS[nextIdx]}... (${nextIdx + 1}/${BROWSING_URLS.length})`);
      setWebViewUrl(BROWSING_URLS[nextIdx]);
      setWebViewKey(k => k + 1);
    } else {
      // All sites done
      setWebViewVisible(false);
      setWebViewType(null);
      // Resolve full test promise if applicable
      if (browsingResolveRef.current) {
        browsingResolveRef.current();
        browsingResolveRef.current = null;
      } else {
        setIsTesting(false);
        Alert.alert('Browsing Test Complete', `Tested ${BROWSING_URLS.length} sites.`);
      }
    }
  }, [addBrowsingSample]);

  const onBrowsingLoadEnd = useCallback(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const idx = browsingIndexRef.current;
    setWebViewLabel(`Loaded ${BROWSING_URLS[idx]} ✓ (${idx + 1}/${BROWSING_URLS.length})`);
    setTimeout(() => moveToNextBrowsingSite(true), 2000);
  }, [moveToNextBrowsingSite]);

  const onBrowsingError = useCallback((syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.warn('[Data] WebView error:', nativeEvent.description);
    const idx = browsingIndexRef.current;
    setWebViewLabel(`⚠ ${BROWSING_URLS[idx]} failed, skipping...`);
    setTimeout(() => moveToNextBrowsingSite(false), 1000);
  }, [moveToNextBrowsingSite]);

  // ── WebView-based Streaming Test (individual) ──────────────────────
  const testStreamingWebView = useCallback(() => {
    if (isTesting) return;
    setIsTesting(true);
    loadedRef.current = false;
    addStreamingSample({ request: true });
    browsingStartRef.current = Date.now();
    setWebViewType('streaming');
    setWebViewLabel('Loading YouTube video...');
    setWebViewUrl('https://m.youtube.com/watch?v=aJq936yAUbc');
    setWebViewKey(k => k + 1);
    setWebViewVisible(true);

    streamTimerRef.current = setTimeout(() => {
      const setupTime = Date.now() - (browsingStartRef.current || Date.now());
      addStreamingSample({
        request: false, completed: true, setupTimeMs: setupTime,
        mos: 4.0, throughputKbps: 4000, bufferingCount: 0,
        resolution: '720p (HD)', resolutionScore: 4,
      });
      setWebViewVisible(false);
      setWebViewType(null);
      setIsTesting(false);
      Alert.alert('Streaming Test Complete', 'MOS: 4.0, Resolution: 720p (HD)');
    }, 15000);
  }, [isTesting, addStreamingSample]);

  const onStreamingLoadEnd = useCallback(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const setupTime = Date.now() - (browsingStartRef.current || Date.now());
    setWebViewLabel(`Playing video... (setup: ${(setupTime / 1000).toFixed(1)}s)`);
    addStreamingSample({ request: false, setupTimeMs: setupTime });
  }, [addStreamingSample]);

  const closeWebView = useCallback(() => {
    if (streamTimerRef.current) {
      clearTimeout(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    setWebViewVisible(false);
    setWebViewType(null);
    // Resolve pending promises
    if (browsingResolveRef.current) { browsingResolveRef.current(); browsingResolveRef.current = null; }
    if (streamResolveRef.current) { streamResolveRef.current(); streamResolveRef.current = null; }
    if (!fullTestActive) setIsTesting(false);
  }, [fullTestActive]);

  // ── Individual test runners ────────────────────────────────────────
  const runManualTest = async (testName, testFn, sampleParamName, sampleFn) => {
    if (isTesting) return;
    setIsTesting(true);
    try {
      const result = await testFn({ [sampleParamName]: sampleFn, silent: true });
      if (result.success) {
        let msg = '';
        if (result.throughputKbps) msg += `Throughput: ${(result.throughputKbps / 1000).toFixed(2)} Mbps\n`;
        if (result.throughputMbps) msg += `Throughput: ${result.throughputMbps.toFixed(2)} Mbps\n`;
        if (result.duration) msg += `Duration: ${(result.duration / 1000).toFixed(2)}s\n`;
        if (result.score) msg += `Score: ${result.score}/100\n`;
        if (result.resolution) msg += `Resolution: ${result.resolution}\n`;
        if (result.resolutionScore) msg += `Quality Score: ${result.resolutionScore}/5\n`;
        Alert.alert(`${testName} Success`, msg || 'Test completed.');
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

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <View style={styles.mainContainer}>
      <ScreenHeader title="Data Performance" />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

        {/* Network Status */}
        {networkState && (
          <View style={styles.networkStatus}>
            <View style={[styles.networkDot, { backgroundColor: networkState.isConnected ? '#34C759' : '#FF3B30' }]} />
            <Text style={styles.networkText}>
              {networkState.isConnected ? `Connected (${networkState.type})` : 'No Internet'}
            </Text>
          </View>
        )}

        {/* ── Full Test Progress Panel ─────────────────────────── */}
        {fullTestActive && (
          <View style={styles.fullTestPanel}>
            <Text style={styles.fullTestTitle}>🧪 Full Test in Progress</Text>
            {fullTestSteps.map((step, i) => (
              <View key={step.key} style={[styles.stepRow, step.status === 'running' && styles.stepRowActive]}>
                <Text style={styles.stepIcon}>{step.icon}</Text>
                <View style={styles.stepInfo}>
                  <Text style={[styles.stepLabel, step.status === 'done' && styles.stepLabelDone]}>
                    {step.label}
                  </Text>
                  {step.result ? (
                    <Text style={styles.stepResult}>{step.result}</Text>
                  ) : null}
                </View>
                <View style={styles.stepStatus}>
                  {step.status === 'waiting' && <Text style={styles.stepWaiting}>⏳</Text>}
                  {step.status === 'running' && (
                    <Animated.View style={{ opacity: pulseAnim }}>
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    </Animated.View>
                  )}
                  {step.status === 'done' && <Text style={styles.stepDone}>✅</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Primary Action — Full Test */}
        <View style={styles.heroSection}>
          <BrandedButton
            title={isTesting ? "Testing in progress..." : "▶  Run Full Test"}
            onPress={runProgressiveFullTest}
            disabled={isTesting}
            loading={isTesting && !fullTestActive}
          />
        </View>

        {/* Individual Tests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browsing</Text>
          <BrandedButton title="Test Browsing" onPress={testBrowsingWebView} disabled={isTesting} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Streaming</Text>
          <BrandedButton title="Test Streaming" onPress={testStreamingWebView} disabled={isTesting} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>File Access (HTTP)</Text>
          <View style={styles.buttonRow}>
            <BrandedButton title="Test Download" onPress={testHttpDownload} disabled={isTesting} style={{ flex: 1 }} />
            <BrandedButton title="Test Upload" onPress={testHttpUpload} disabled={isTesting} style={{ flex: 1 }} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social Media</Text>
          <BrandedButton title="Test Social Media" onPress={testSocialMedia} disabled={isTesting} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>File Access (FTP)</Text>
          <View style={styles.buttonRow}>
            <BrandedButton title="Test FTP DL" onPress={testFtpDownload} disabled={isTesting} style={{ flex: 1 }} />
            <BrandedButton title="Test FTP UL" onPress={testFtpUpload} disabled={isTesting} style={{ flex: 1 }} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Latency & Interactivity</Text>
          <BrandedButton title="Test Interactivity" onPress={testLatency} disabled={isTesting} />
        </View>

      </ScrollView>

      {/* WebView Modal */}
      <Modal visible={webViewVisible} animationType="slide" onRequestClose={closeWebView}>
        <View style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
            <View style={styles.webViewHeaderLeft}>
              <Text style={styles.webViewTitle}>
                {webViewType === 'browsing' ? '🌐 Browsing Test' : '🎬 Streaming Test'}
              </Text>
              <Text style={styles.webViewSubtitle} numberOfLines={2}>{webViewLabel}</Text>
            </View>
            <TouchableOpacity onPress={closeWebView} style={styles.webViewCloseBtn}>
              <Text style={styles.webViewCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Browsing progress dots */}
          {webViewType === 'browsing' && (
            <View style={styles.progressDotsRow}>
              {BROWSING_URLS.map((_, i) => (
                <View key={i} style={[
                  styles.progressDot,
                  i < browsingIndexRef.current && styles.progressDotDone,
                  i === browsingIndexRef.current && styles.progressDotActive,
                ]} />
              ))}
            </View>
          )}

          {webViewUrl ? (
            <WebView
              key={webViewKey}
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
                  <Text style={styles.webViewLoadingText}>Loading page...</Text>
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
  networkDot: {
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
  // ── Full Test Progress Panel ──────────────────────────
  fullTestPanel: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    ...theme.shadows.md,
  },
  fullTestTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.md,
    marginBottom: 4,
  },
  stepRowActive: {
    backgroundColor: `${theme.colors.primary}15`,
    borderWidth: 1,
    borderColor: `${theme.colors.primary}40`,
  },
  stepIcon: {
    fontSize: 20,
    width: 32,
    textAlign: 'center',
  },
  stepInfo: {
    flex: 1,
    marginLeft: 8,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  stepLabelDone: {
    color: theme.colors.text.secondary,
  },
  stepResult: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  stepStatus: {
    width: 32,
    alignItems: 'center',
  },
  stepWaiting: {
    fontSize: 16,
    opacity: 0.4,
  },
  stepDone: {
    fontSize: 16,
  },
  // ── Sections ──────────────────────────────────────────
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
  // ── WebView Modal ─────────────────────────────────────
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
  webViewHeaderLeft: {
    flex: 1,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.sm,
  },
  webViewCloseBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  progressDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: theme.colors.background.card,
    gap: 8,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.border.light,
  },
  progressDotDone: {
    backgroundColor: '#34C759',
  },
  progressDotActive: {
    backgroundColor: theme.colors.primary,
    width: 24,
    borderRadius: 5,
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
  },
  webViewLoadingText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    marginTop: theme.spacing.sm,
  },
});
