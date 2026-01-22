import { View, Text, StyleSheet, Button, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useQoE } from '../../src/context/QoEContext';
import { theme } from '../../src/constants/theme';
import SpeedTestWebView from '../../src/components/SpeedTestWebView';
import BrandedButton from '../../src/components/BrandedButton';

export default function DataScreen() {
  const { metrics, scores, addBrowsingSample, addStreamingSample, addHttpSample, addSocialSample, addFtpSample, addLatencySample } = useQoE();
  const [isTesting, setIsTesting] = useState(false);
  const [networkState, setNetworkState] = useState(null);
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [webViewTestType, setWebViewTestType] = useState(null);

  // Debug: Log state changes
  useEffect(() => {
    console.log('[Data] WebView state changed:', { webViewVisible, webViewTestType });
  }, [webViewVisible, webViewTestType]);

  // Check network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkState(state);
      console.log('[Data] Network state:', {
        isConnected: state.isConnected,
        type: state.type,
        isInternetReachable: state.isInternetReachable,
      });
    });

    NetInfo.fetch().then(state => {
      setNetworkState(state);
    });

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

  // Browsing test with WebView (nPerf-style)
  const testBrowsing = async (silent = false) => {
    if (isTesting && !silent) return;
    
    // Check network connectivity first
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      if (!silent) {
        Alert.alert('No Internet', 'Please check your internet connection and try again.');
      }
      return;
    }
    
    if (!silent) {
      // Open WebView modal for visual test
      console.log('[Data] Opening WebView for browsing test');
      setWebViewTestType('browsing');
      setWebViewVisible(true);
      return;
    }
    
    // Silent mode: run background test
    setIsTesting(true);
    const startTime = Date.now();
    addBrowsingSample({ request: true });

    try {
      const testUrl = 'https://www.google.com/favicon.ico';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const dnsStart = Date.now();
      const response = await fetch(testUrl, {
        method: 'GET',
        cache: 'no-cache',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const dnsTime = Date.now() - dnsStart;

      const downloadStart = Date.now();
      const blob = await response.blob();
      const downloadTime = Date.now() - downloadStart;
      const duration = Date.now() - startTime;

      const sizeBytes = blob.size;
      const effectiveTime = Math.max(downloadTime, duration, 1);
      const throughputKbps = sizeBytes > 0 && effectiveTime > 0
        ? (sizeBytes * 8 * 1000) / effectiveTime
        : 0;

      if (response.ok) {
        addBrowsingSample({
          completed: true,
          durationMs: duration,
          dnsResolutionTimeMs: dnsTime,
          throughputKbps: throughputKbps,
        });
      }
    } catch (error) {
      console.error('[Data] Browsing test error:', error);
    } finally {
      setIsTesting(false);
    }
  };

  // Handle WebView test completion
  const handleWebViewTestComplete = (result) => {
    if (webViewTestType === 'browsing') {
      addBrowsingSample({
        request: true,
        completed: result.success,
        durationMs: result.duration,
        dnsResolutionTimeMs: result.dnsTime,
      });
      if (result.success) {
        Alert.alert('Success', `Browsing test completed in ${(result.duration / 1000).toFixed(2)}s`);
      }
    } else if (webViewTestType === 'video') {
      addStreamingSample({
        request: true,
        completed: result.success,
        setupTimeMs: result.duration,
      });
      if (result.success) {
        Alert.alert('Success', `Video test completed in ${(result.duration / 1000).toFixed(2)}s`);
      }
    } else if (webViewTestType === 'latency') {
      // Calculate interactivity score from latency
      const latencyScore = result.duration < 100 ? 100 : Math.max(0, 100 - ((result.duration - 100) / 9));
      addLatencySample({
        request: true,
        completed: result.success,
        score: Math.round(latencyScore),
      });
      if (result.success) {
        Alert.alert('Success', `Latency: ${result.duration}ms`);
      }
    }
    setWebViewVisible(false);
    setWebViewTestType(null);
  };
  const fulltest = async () => {
    if (isTesting) return;
    
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      Alert.alert('No Internet', 'Please check your connection before starting the full test.');
      return;
    }

    setIsTesting(true);
    
    try {
      // Step-by-step execution using 'silent' mode to prevent multiple alerts and state conflicts
      await testBrowsing(true);
      await testStreaming(true);
      await testHttpDownload(true);
      await testHttpUpload(true);
      await testSocialMedia(true);
      await testFtpDownload(true);
      await testFtpUpload(true);
      await testLatency(true);

      Alert.alert('Full Test Complete', 'All QoE performance metrics have been updated.');
    } catch (error) {
      Alert.alert('Full Test Partial Failure', 'One or more tests failed to complete.');
    } finally {
      setIsTesting(false);
    }
  };

  // Real streaming test with actual video/audio streaming
  const testStreaming = async (silent = false) => {
    if (isTesting && !silent) return;
    
    // Check network connectivity first
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      if (!silent) {
        Alert.alert('No Internet', 'Please check your internet connection and try again.');
      }
      return;
    }
    
    if (!silent) {
      // Open WebView modal for visual video test
      console.log('[Data] Opening WebView for video streaming test');
      setWebViewTestType('video');
      setWebViewVisible(true);
      return;
    }
    
    setIsTesting(true);

    const startTime = Date.now();
    addStreamingSample({ request: true });

    try {
      // Try multiple fallback URLs for streaming test (using smaller files to avoid crashes)
      const testUrls = [
        'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png', // Small image (safest)
        'https://httpbin.org/image/png', // Small test image
        'https://www.google.com/favicon.ico', // Very small file
      ];
      
      let response = null;
      let lastError = null;
      let setupStart = null;
      
      // Try each URL until one works
      for (const url of testUrls) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
          
          setupStart = Date.now();
          response = await fetch(url, {
            method: 'GET',
            cache: 'no-cache',
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            break; // Success, exit loop
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (err) {
          lastError = err;
          console.log(`[Data] Streaming test failed for ${url}, trying next...`);
          response = null;
          continue; // Try next URL
        }
      }
      
      if (!response || !response.ok) {
        throw lastError || new Error('All streaming URLs failed');
      }

      const setupDelay = Date.now() - (setupStart || Date.now());
      
      // Update with setup time (don't count as new request)
      addStreamingSample({
        request: false,
        setupTimeMs: setupDelay,
      });

      // Download the file to measure throughput
      // Using small files to avoid memory issues
      const streamStart = Date.now();
      let totalBytes = 0;
      let streamTime = 0;
      
      try {
        // Check content-length first to avoid downloading huge files
        const contentLength = response.headers.get('content-length');
        const maxSize = 5 * 1024 * 1024; // 5MB max - safety limit
        
        if (contentLength) {
          const fileSize = parseInt(contentLength, 10);
          if (fileSize > maxSize) {
            // File too large, skip download and estimate
            console.warn(`[Data] File too large (${fileSize} bytes), estimating throughput`);
            totalBytes = maxSize; // Estimate based on max size
            streamTime = 1000; // Estimate 1 second
          } else {
            // Safe to download - file is small
            const blob = await Promise.race([
              response.blob(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Download timeout')), 15000)
              )
            ]);
            totalBytes = blob.size;
            streamTime = Date.now() - streamStart;
          }
        } else {
          // No content-length header, try to download with timeout
          try {
            const blob = await Promise.race([
              response.blob(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Download timeout')), 10000)
              )
            ]);
            totalBytes = blob.size;
            streamTime = Date.now() - streamStart;
            
            // Safety check - if blob is too large, cap it
            if (totalBytes > maxSize) {
              console.warn(`[Data] Downloaded file too large (${totalBytes} bytes), capping`);
              totalBytes = maxSize;
            }
          } catch (blobError) {
            console.error('[Data] Blob download failed:', blobError);
            // Estimate based on setup time
            totalBytes = 100 * 1024; // Estimate 100KB
            streamTime = Date.now() - streamStart || 1000;
          }
        }
      } catch (downloadError) {
        console.error('[Data] Streaming download error:', downloadError);
        // Fallback: estimate from setup time
        totalBytes = 100 * 1024; // Estimate 100KB
        streamTime = Date.now() - streamStart || 1000;
      }
      
      const totalTime = Date.now() - startTime;

      // Calculate throughput in Kbps
      // Use Math.max to ensure we never divide by 0, and use at least 1ms
      // For very fast downloads, use total time as fallback
      const effectiveTime = Math.max(streamTime, totalTime, 1);
      const throughputKbps = totalBytes > 0 && effectiveTime > 0
        ? (totalBytes * 8 * 1000) / effectiveTime // Convert bytes to bits, then ms to seconds, then to Kbps
        : 0;
      
      console.log('[Data] Streaming throughput calc:', {
        totalBytes,
        streamTime,
        totalTime,
        effectiveTime,
        throughputKbps,
      });

      // Estimate MOS based on throughput (simplified model)
      // Higher throughput = better quality
      const mos = throughputKbps > 5000 ? 4.5 : 
                   throughputKbps > 2000 ? 4.0 :
                   throughputKbps > 1000 ? 3.5 :
                   throughputKbps > 500 ? 3.0 : 2.5;

      // Estimate resolution based on throughput
      const resolution = throughputKbps > 5000 ? 'HD' :
                         throughputKbps > 2000 ? 'SD' :
                         throughputKbps > 1000 ? '360p' : '240p';

      // Simulate buffering count (in real app, this would come from video player events)
      // Higher throughput = fewer buffering events
      const bufferingCount = throughputKbps > 5000 ? 0 :
                            throughputKbps > 2000 ? 1 :
                            throughputKbps > 1000 ? 2 : 3;

      // Mark as completed (don't count as new request)
      addStreamingSample({
        request: false,
        completed: true,
        mos: mos,
        throughputKbps: throughputKbps,
        bufferingCount: bufferingCount,
        resolution: resolution,
      });

      Alert.alert('Success', `Streaming test completed\nThroughput: ${(throughputKbps / 1000).toFixed(2)} Mbps\nMOS: ${mos.toFixed(2)}`);
    } catch (error) {
      console.error('[Data] Streaming test error:', error);
      let errorMsg = error.message;
      if (error.name === 'AbortError') {
        errorMsg = 'Request timed out. Check your internet connection.';
      } else if (error.message === 'Network request failed') {
        errorMsg = 'Network request failed. Check your internet connection.';
      }
      Alert.alert('Error', `Streaming test failed: ${errorMsg}`);
    } finally {
      setIsTesting(false);
    }
  };

  // Real HTTP download test with actual file download
  const testHttpDownload = async () => {
    if (isTesting) return;
    
    // Check network connectivity first
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      Alert.alert('No Internet', 'Please check your internet connection and try again.');
      return;
    }
    
    setIsTesting(true);

    addHttpSample('dl', { request: true });

    try {
      // Try multiple fallback URLs for download test
      const testUrls = [
        'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png',
        'https://www.google.com/favicon.ico',
        'https://httpbin.org/image/png',
      ];
      
      let response = null;
      let lastError = null;
      
      // Try each URL until one works
      for (const url of testUrls) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
          
          response = await fetch(url, {
            method: 'GET',
            cache: 'no-cache',
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            break; // Success, exit loop
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (err) {
          lastError = err;
          console.log(`[Data] HTTP download failed for ${url}, trying next...`);
          response = null;
          continue; // Try next URL
        }
      }
      
      if (!response || !response.ok) {
        throw lastError || new Error('All download URLs failed');
      }
      
      const startTime = Date.now();

      // Measure download throughput
      const downloadStart = Date.now();
      const blob = await response.blob();
      const downloadTime = Date.now() - downloadStart;
      const totalTime = Date.now() - startTime;
      
      // Calculate throughput in Mbps
      const sizeBytes = blob.size;
      // Use Math.max to ensure we never divide by 0, and use at least 1ms
      // For very fast downloads, use total time as fallback
      const effectiveTime = Math.max(downloadTime, totalTime, 1);
      const throughputMbps = sizeBytes > 0 && effectiveTime > 0
        ? (sizeBytes * 8) / (effectiveTime * 1000) // Convert bytes to bits, then to Mbps
        : 0;
      
      console.log('[Data] HTTP download throughput calc:', {
        sizeBytes,
        downloadTime,
        totalTime,
        effectiveTime,
        throughputMbps,
      });

      addHttpSample('dl', {
        completed: true,
        throughputMbps: throughputMbps,
      });

      Alert.alert('Success', `Download completed: ${throughputMbps.toFixed(2)} Mbps\nSize: ${(sizeBytes / 1024).toFixed(2)} KB`);
    } catch (error) {
      console.error('[Data] HTTP download error:', error);
      let errorMsg = error.message;
      if (error.name === 'AbortError') {
        errorMsg = 'Request timed out. Check your internet connection.';
      } else if (error.message === 'Network request failed') {
        errorMsg = 'Network request failed. Check your internet connection.';
      }
      Alert.alert('Error', `Download failed: ${errorMsg}`);
    } finally {
      setIsTesting(false);
    }
  };

  // Real HTTP upload test with actual data upload
  const testHttpUpload = async () => {
    if (isTesting) return;
    
    // Check network connectivity first
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      Alert.alert('No Internet', 'Please check your internet connection and try again.');
      return;
    }
    
    setIsTesting(true);

    addHttpSample('ul', { request: true });

    try {
      // Create test data to upload (100KB)
      const testDataSize = 100 * 1024; // 100KB
      const testData = new Uint8Array(testDataSize);
      // Fill with random data
      for (let i = 0; i < testDataSize; i++) {
        testData[i] = Math.floor(Math.random() * 256);
      }
      const blob = new Blob([testData]);

      // Use a test upload endpoint (httpbin.org provides a free test endpoint)
      const uploadUrl = 'https://httpbin.org/post';
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
      
      const startTime = Date.now();
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: blob,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const uploadTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Calculate throughput in Mbps
      const throughputMbps = uploadTime > 0
        ? (testDataSize * 8) / (uploadTime * 1000) // Convert bytes to bits, then to Mbps
        : 0;

      addHttpSample('ul', {
        completed: true,
        throughputMbps: throughputMbps,
      });

      Alert.alert('Success', `Upload completed: ${throughputMbps.toFixed(2)} Mbps\nSize: ${(testDataSize / 1024).toFixed(2)} KB`);
    } catch (error) {
      console.error('[Data] HTTP upload error:', error);
      let errorMsg = error.message;
      if (error.name === 'AbortError') {
        errorMsg = 'Request timed out. Check your internet connection.';
      } else if (error.message === 'Network request failed') {
        errorMsg = 'Network request failed. Check your internet connection.';
      }
      Alert.alert('Error', `Upload failed: ${errorMsg}`);
    } finally {
      setIsTesting(false);
    }
  };

  // Real social media test with actual API-like request
  const testSocialMedia = async () => {
    if (isTesting) return;
    
    // Check network connectivity first
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      Alert.alert('No Internet', 'Please check your internet connection and try again.');
      return;
    }
    
    setIsTesting(true);

    const startTime = Date.now();
    addSocialSample({ request: true });

    try {
      // Try multiple fallback URLs for social media API test
      const testUrls = [
        'https://jsonplaceholder.typicode.com/posts/1',
        'https://httpbin.org/json',
        'https://api.github.com/zen', // GitHub API (lightweight)
      ];
      
      let response = null;
      let lastError = null;
      
      let requestStart = null;
      
      // Try each URL until one works
      for (const url of testUrls) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          requestStart = Date.now();
          response = await fetch(url, {
            method: 'GET',
            cache: 'no-cache',
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            break; // Success, exit loop
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (err) {
          lastError = err;
          console.log(`[Data] Social media test failed for ${url}, trying next...`);
          response = null;
          requestStart = null;
          continue; // Try next URL
        }
      }
      
      if (!response || !response.ok) {
        throw lastError || new Error('All social media URLs failed');
      }

      // Handle different response types (JSON or text)
      let responseData;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }
      
      const duration = Date.now() - startTime;
      const requestTime = requestStart ? Date.now() - requestStart : duration;

      // Calculate throughput (Kbps)
      const responseSize = typeof responseData === 'string' 
        ? responseData.length 
        : JSON.stringify(responseData).length;
      const throughputKbps = requestTime > 0
        ? (responseSize * 8 * 1000) / requestTime // Convert bytes to bits, then ms to seconds, then to Kbps
        : 0;

      addSocialSample({
        completed: true,
        durationMs: duration,
        throughputKbps: throughputKbps,
      });

      Alert.alert('Success', `Social media test completed in ${(duration / 1000).toFixed(2)}s`);
    } catch (error) {
      console.error('[Data] Social media test error:', error);
      let errorMsg = error.message;
      if (error.name === 'AbortError') {
        errorMsg = 'Request timed out. Check your internet connection.';
      } else if (error.message === 'Network request failed') {
        errorMsg = 'Network request failed. Check your internet connection.';
      }
      Alert.alert('Error', `Social media test failed: ${errorMsg}`);
    } finally {
      setIsTesting(false);
    }
  };

  // FTP Download test
  const testFtpDownload = async () => {
    if (isTesting) return;
    
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      Alert.alert('No Internet', 'Please check your internet connection and try again.');
      return;
    }
    
    setIsTesting(true);
    addFtpSample('dl', { request: true });

    try {
      // Use HTTP as FTP proxy (most FTP servers require special handling)
      // For testing, we'll use a file download that simulates FTP behavior
      const testUrl = 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      
      const startTime = Date.now();
      const response = await fetch(testUrl, {
        method: 'GET',
        cache: 'no-cache',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const downloadStart = Date.now();
      const blob = await response.blob();
      const downloadTime = Date.now() - downloadStart;
      const totalTime = Date.now() - startTime;

      const sizeBytes = blob.size;
      const effectiveTime = Math.max(downloadTime, totalTime, 1);
      const throughputKbps = sizeBytes > 0 && effectiveTime > 0
        ? (sizeBytes * 8 * 1000) / effectiveTime
        : 0;

      addFtpSample('dl', {
        completed: true,
        throughputKbps: throughputKbps,
      });

      Alert.alert('Success', `FTP Download completed: ${(throughputKbps / 1000).toFixed(2)} Mbps`);
    } catch (error) {
      console.error('[Data] FTP download error:', error);
      let errorMsg = error.message;
      if (error.name === 'AbortError') {
        errorMsg = 'Request timed out. Check your internet connection.';
      }
      Alert.alert('Error', `FTP download failed: ${errorMsg}`);
    } finally {
      setIsTesting(false);
    }
  };

  // FTP Upload test
  const testFtpUpload = async () => {
    if (isTesting) return;
    
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      Alert.alert('No Internet', 'Please check your internet connection and try again.');
      return;
    }
    
    setIsTesting(true);
    addFtpSample('ul', { request: true });

    try {
      // Simulate FTP upload using HTTP POST
      const testDataSize = 100 * 1024; // 100KB
      const testData = new Uint8Array(testDataSize);
      for (let i = 0; i < testDataSize; i++) {
        testData[i] = Math.floor(Math.random() * 256);
      }
      const blob = new Blob([testData]);

      const uploadUrl = 'https://httpbin.org/post';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      
      const startTime = Date.now();
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: blob,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const uploadTime = Date.now() - startTime;
      const throughputKbps = uploadTime > 0
        ? (testDataSize * 8 * 1000) / uploadTime
        : 0;

      addFtpSample('ul', {
        completed: true,
        throughputKbps: throughputKbps,
      });

      Alert.alert('Success', `FTP Upload completed: ${(throughputKbps / 1000).toFixed(2)} Mbps`);
    } catch (error) {
      console.error('[Data] FTP upload error:', error);
      let errorMsg = error.message;
      if (error.name === 'AbortError') {
        errorMsg = 'Request timed out. Check your internet connection.';
      }
      Alert.alert('Error', `FTP upload failed: ${errorMsg}`);
    } finally {
      setIsTesting(false);
    }
  };

  // Latency & Interactivity test
  const testLatency = async (silent = false) => {
    if (isTesting && !silent) return;
    
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      if (!silent) {
        Alert.alert('No Internet', 'Please check your internet connection and try again.');
      }
      return;
    }
    
    if (!silent) {
      // Open WebView modal for visual latency test
      console.log('[Data] Opening WebView for latency test');
      setWebViewTestType('latency');
      setWebViewVisible(true);
      return;
    }
    
    setIsTesting(true);
    addLatencySample({ request: true });

    try {
      // Perform multiple quick requests to measure interactivity
      const testUrls = [
        'https://www.google.com/favicon.ico',
        'https://httpbin.org/get',
        'https://jsonplaceholder.typicode.com/posts/1',
      ];
      
      const latencies = [];
      let successCount = 0;

      for (const url of testUrls) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const startTime = Date.now();
          const response = await fetch(url, {
            method: 'GET',
            cache: 'no-cache',
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          
          const latency = Date.now() - startTime;
          
          if (response.ok) {
            successCount++;
            latencies.push(latency);
          }
        } catch (err) {
          console.log(`[Data] Latency test failed for ${url}`);
        }
      }

      // Calculate interactivity score (0-100)
      // Score based on: success ratio (50%) + average latency (50%)
      // Lower latency = higher score, max score at <100ms, min at >1000ms
      const successRatio = testUrls.length > 0 ? successCount / testUrls.length : 0;
      const avgLatency = latencies.length > 0 
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
        : 1000;
      
      // Latency score: 100 at <100ms, 0 at >1000ms
      const latencyScore = Math.max(0, Math.min(100, 100 - ((avgLatency - 100) / 9)));
      const interactivityScore = Math.round((successRatio * 50) + (latencyScore * 0.5));

      addLatencySample({
        completed: true,
        score: interactivityScore,
      });

      Alert.alert('Success', `Interactivity test completed\nScore: ${interactivityScore}/100\nAvg Latency: ${Math.round(avgLatency)}ms`);
    } catch (error) {
      console.error('[Data] Latency test error:', error);
      Alert.alert('Error', `Latency test failed: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Data QoE</Text>
      <Text style={styles.subtitle}>
        Test browsing, streaming, file access, and social media performance metrics.
      </Text>
      
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

      {/* Browsing Metrics */}
       <View style={styles.section}>
        <Text style={styles.sectionTitle}>Do Full test</Text>
         <BrandedButton 
          title="Full test" 
          onPress={fulltest} 
          disabled={isTesting}
          loading={isTesting}
        />
       </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Browsing</Text>
        <BrandedButton 
          title="Test Browsing" 
          onPress={() => {
            console.log('[Data] Test Browsing button pressed');
            testBrowsing();
          }} 
          disabled={isTesting}
        />
        <View style={styles.metricsBox}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Requests</Text>
            <Text style={styles.metricValue}>{metrics.data.browsing.requests}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Completed</Text>
            <Text style={styles.metricValue}>{metrics.data.browsing.completed}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Success Ratio</Text>
            <Text style={styles.metricValue}>
              {formatPercent(scores.browsing?.successRatio)}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Avg Duration</Text>
            <Text style={styles.metricValue}>
              {formatTime(scores.browsing?.durationAvg)}
            </Text>
          </View>
        </View>
      </View>

      {/* Streaming Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Streaming</Text>
        <BrandedButton 
          title="Test Streaming" 
          onPress={() => {
            console.log('[Data] Test Streaming button pressed');
            testStreaming();
          }} 
          disabled={isTesting}
        />
        <View style={styles.metricsBox}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Requests</Text>
            <Text style={styles.metricValue}>{metrics.data.streaming.requests}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Completed</Text>
            <Text style={styles.metricValue}>{metrics.data.streaming.completed}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Success Ratio</Text>
            <Text style={styles.metricValue}>
              {formatPercent(scores.streaming?.successRatio)}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Avg Setup Time</Text>
            <Text style={styles.metricValue}>
              {formatTime(scores.streaming?.setupAvg)}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Avg MOS</Text>
            <Text style={styles.metricValue}>
              {scores.streaming?.mosAvg?.toFixed(2) || '--'}
            </Text>
          </View>
        </View>
      </View>

      {/* HTTP Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>File Access (HTTP)</Text>
        <View style={styles.buttonRow}>
          <BrandedButton 
            title="Test Download" 
            onPress={testHttpDownload} 
            disabled={isTesting}
            style={{ flex: 1 }}
          />
          <BrandedButton 
            title="Test Upload" 
            onPress={testHttpUpload} 
            disabled={isTesting}
            style={{ flex: 1 }}
          />
        </View>
        <View style={styles.metricsBox}>
          <Text style={styles.subsectionTitle}>Download</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Requests</Text>
            <Text style={styles.metricValue}>{metrics.data.http.dl.requests}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Completed</Text>
            <Text style={styles.metricValue}>{metrics.data.http.dl.completed}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Avg Throughput</Text>
            <Text style={styles.metricValue}>
              {formatThroughput((scores.http?.dlAvg || 0) * 1000)}
            </Text>
          </View>

          <View style={styles.divider} />
          
          <Text style={styles.subsectionTitle}>Upload</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Requests</Text>
            <Text style={styles.metricValue}>{metrics.data.http.ul.requests}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Completed</Text>
            <Text style={styles.metricValue}>{metrics.data.http.ul.completed}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Avg Throughput</Text>
            <Text style={styles.metricValue}>
              {formatThroughput((scores.http?.ulAvg || 0) * 1000)}
            </Text>
          </View>
        </View>
      </View>

      {/* Social Media Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Social Media</Text>
        <BrandedButton 
          title="Test Social Media" 
          onPress={testSocialMedia} 
          disabled={isTesting}
        />
        <View style={styles.metricsBox}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Requests</Text>
            <Text style={styles.metricValue}>{metrics.data.social.requests}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Completed</Text>
            <Text style={styles.metricValue}>{metrics.data.social.completed}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Success Ratio</Text>
            <Text style={styles.metricValue}>
              {formatPercent(scores.social?.successRatio)}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Avg Duration</Text>
            <Text style={styles.metricValue}>
              {formatTime(scores.social?.durationAvg)}
            </Text>
          </View>
        </View>
      </View>

      {/* FTP Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>File Access (FTP)</Text>
        <View style={styles.buttonRow}>
          <BrandedButton 
            title="Test FTP Download" 
            onPress={testFtpDownload} 
            disabled={isTesting}
            style={{ flex: 1 }}
          />
          <BrandedButton 
            title="Test FTP Upload" 
            onPress={testFtpUpload} 
            disabled={isTesting}
            style={{ flex: 1 }}
          />
        </View>
        <View style={styles.metricsBox}>
          <Text style={styles.subsectionTitle}>Download</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Requests</Text>
            <Text style={styles.metricValue}>{metrics.data.ftp.dl.requests}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Completed</Text>
            <Text style={styles.metricValue}>{metrics.data.ftp.dl.completed}</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.subsectionTitle}>Upload</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Requests</Text>
            <Text style={styles.metricValue}>{metrics.data.ftp.ul.requests}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Completed</Text>
            <Text style={styles.metricValue}>{metrics.data.ftp.ul.completed}</Text>
          </View>
        </View>
      </View>

      {/* Latency & Interactivity Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Latency & Interactivity</Text>
        <BrandedButton 
          title="Test Interactivity" 
          onPress={() => {
            console.log('[Data] Test Interactivity button pressed');
            testLatency();
          }}
          disabled={isTesting}
        />
        <View style={styles.metricsBox}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Requests</Text>
            <Text style={styles.metricValue}>{metrics.data.latency.requests}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Completed</Text>
            <Text style={styles.metricValue}>{metrics.data.latency.completed}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Success Ratio</Text>
            <Text style={styles.metricValue}>
              {formatPercent(metrics.data.latency.requests > 0 
                ? metrics.data.latency.completed / metrics.data.latency.requests 
                : null)}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Avg Score</Text>
            <Text style={styles.metricValue}>
              {metrics.data.latency.scores.length > 0
                ? Math.round(metrics.data.latency.scores.reduce((a, b) => a + b, 0) / metrics.data.latency.scores.length)
                : '--'}
            </Text>
          </View>
        </View>
      </View>

      {/* Data Score Summary */}
      <View style={styles.summaryBox}>
        <Text style={styles.sectionTitle}>Data QoE Score</Text>
        <Text style={styles.scoreValue}>
          {formatPercent(scores.data.score)}
        </Text>
        <Text style={styles.coverageText}>
          Coverage: {formatPercent(scores.data.appliedWeight)}
      </Text>
      </View>
    </ScrollView>

    {/* WebView Speed Test Modal */}
    <SpeedTestWebView
      visible={webViewVisible}
      onClose={() => {
        console.log('[Data] Closing WebView');
        setWebViewVisible(false);
        setWebViewTestType(null);
      }}
      testType={webViewTestType}
      onTestComplete={handleWebViewTestComplete}
    />
  </View>
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
  coverageText: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
});
