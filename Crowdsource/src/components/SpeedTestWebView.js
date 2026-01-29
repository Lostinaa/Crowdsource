import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Platform, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { theme } from '../constants/theme';

/**
 * WebView-based speed test component (nPerf-style)
 * Shows a modal with WebView that loads test content and measures performance
 */
export default function SpeedTestWebView({ 
  visible, 
  onClose, 
  testType, // 'browsing', 'video', 'latency'
  onTestComplete 
}) {
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState(null);
  const [loadTime, setLoadTime] = useState(null);
  const [dnsTime, setDnsTime] = useState(null);
  const [webSource, setWebSource] = useState(null);
  const webViewRef = useRef(null);
  const dnsStartRef = useRef(null);

  // Set test URL based on test type
  useEffect(() => {
    if (visible && testType) {
      console.log('[SpeedTestWebView] Setting up test:', testType);
      setLoading(true);
      setLoadTime(null);
      setDnsTime(null);
      setStartTime(Date.now());
      dnsStartRef.current = Date.now();

      switch (testType) {
        case 'browsing':
          setWebSource({ uri: 'https://www.google.com' });
          break;
        case 'video': {
          // Inline HTML with real video stream and multiple resolutions
          const videoHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  body { margin: 0; background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; }
                  video { width: 100%; height: auto; max-height: 100vh; }
                </style>
              </head>
              <body>
                <video controls autoplay muted playsinline>
                  <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4">
                  Your device does not support HTML5 video.
                </video>
              </body>
            </html>
          `;
          setWebSource({ html: videoHtml });
          break;
        }
        case 'latency':
          // Simple lightweight page for latency test (use a full HTML page, not favicon)
          setWebSource({ uri: 'https://www.google.com' });
          break;
        default:
          setWebSource({ uri: 'https://www.google.com' });
      }
      console.log('[SpeedTestWebView] Source set for type:', testType);
    }
  }, [visible, testType]);

  const handleLoadStart = () => {
    console.log('[SpeedTestWebView] Load started');
    setLoading(true);
    dnsStartRef.current = Date.now();
  };

  const handleLoadEnd = () => {
    console.log('[SpeedTestWebView] Load ended');
    const endTime = Date.now();
    const totalTime = endTime - (startTime || endTime);
    const dnsTime = dnsStartRef.current ? (endTime - dnsStartRef.current) : null;
    
    console.log('[SpeedTestWebView] Load time:', totalTime, 'ms, DNS time:', dnsTime, 'ms');
    setLoadTime(totalTime);
    setDnsTime(dnsTime);
    setLoading(false);

    // For browsing test, try to get page size from WebView
    if (testType === 'browsing' && webViewRef.current) {
      // Inject JavaScript to get page metrics
      webViewRef.current.injectJavaScript(`
        (function() {
          try {
            const perfData = window.performance.timing;
            const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
            const dnsTime = perfData.domainLookupEnd - perfData.domainLookupStart;
            const connectTime = perfData.connectEnd - perfData.connectStart;
            const responseTime = perfData.responseEnd - perfData.requestStart;
            
            // Get page size (approximate)
            const pageSize = document.documentElement.innerHTML.length;
            
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'metrics',
              pageLoadTime: pageLoadTime,
              dnsTime: dnsTime,
              connectTime: connectTime,
              responseTime: responseTime,
              pageSize: pageSize,
            }));
          } catch(e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              error: e.message
            }));
          }
        })();
        true; // Required for iOS
      `);
    }

    // Call completion callback with results
    if (onTestComplete) {
      onTestComplete({
        duration: totalTime,
        dnsTime: dnsTime,
        loadTime: totalTime,
        success: true,
      });
    }
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'metrics' && onTestComplete) {
        // Use more accurate metrics from WebView
        onTestComplete({
          duration: data.pageLoadTime || loadTime,
          dnsTime: data.dnsTime || dnsTime,
          loadTime: data.pageLoadTime || loadTime,
          connectTime: data.connectTime,
          responseTime: data.responseTime,
          pageSize: data.pageSize,
          success: true,
        });
      }
    } catch (error) {
      console.warn('[SpeedTestWebView] Failed to parse message:', error);
    }
  };

  const handleError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('[SpeedTestWebView] WebView error:', nativeEvent);
    setLoading(false);
    
    if (onTestComplete) {
      onTestComplete({
        duration: Date.now() - (startTime || Date.now()),
        error: nativeEvent.description || 'Failed to load page',
        success: false,
      });
    }
  };

  const getTestTitle = () => {
    switch (testType) {
      case 'browsing':
        return 'Browsing Test';
      case 'video':
        return 'Video Streaming Test';
      case 'latency':
        return 'Latency Test';
      default:
        return 'Speed Test';
    }
  };

  // Don't render if testType is not set
  if (!testType || !visible) {
    console.log('[SpeedTestWebView] Not rendering - visible:', visible, 'testType:', testType);
    return null;
  }

  console.log('[SpeedTestWebView] Rendering Modal, visible:', visible, 'testType:', testType, 'hasSource:', !!webSource);

  return (
    <Modal
      visible={visible && !!testType}
      animationType="fade"
      onRequestClose={onClose}
      transparent={true}
      statusBarTranslucent={true}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{getTestTitle()}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Test Info */}
          <View style={styles.infoBar}>
            {loading && (
              <View style={styles.infoRow}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.infoText}>Loading test page...</Text>
              </View>
            )}
            {loadTime !== null && (
              <View style={styles.metricsContainer}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Load Time:</Text>
                  <Text style={styles.metricValue}>{(loadTime / 1000).toFixed(2)}s</Text>
                </View>
                {dnsTime !== null && (
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>DNS Time:</Text>
                    <Text style={styles.metricValue}>{(dnsTime / 1000).toFixed(2)}s</Text>
                  </View>
                )}
              </View>
            )}
          </View>

              {/* WebView */}
              {webSource ? (
                <WebView
                  ref={webViewRef}
                  source={webSource}
                  style={styles.webview}
                  onLoadStart={handleLoadStart}
                  onLoadEnd={handleLoadEnd}
                  onError={handleError}
                  onMessage={handleMessage}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  startInLoadingState={true}
                  cacheEnabled={false}
                  mediaPlaybackRequiresUserAction={false}
                  allowsInlineMediaPlayback={true}
                  mixedContentMode="always"
                />
              ) : (
                <View style={[styles.webview, { justifyContent: 'center', alignItems: 'center' }]}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={{ marginTop: theme.spacing.md, color: theme.colors.text.secondary }}>
                    Preparing test...
                  </Text>
                </View>
              )}

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  {testType === 'browsing' && 'Testing page load performance...'}
                  {testType === 'video' && 'Testing video playback...'}
                  {testType === 'latency' && 'Testing connection latency...'}
                </Text>
                {loadTime !== null && (
                  <TouchableOpacity 
                    style={styles.doneButton}
                    onPress={onClose}
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    // Hard height so the WebView actually renders (prevents zero-height flex issues)
    height: Math.min(560, Math.max(420, Dimensions.get('window').height * 0.75)),
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  infoBar: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  metricItem: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  metricLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  webview: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  footer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  doneButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  doneButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
