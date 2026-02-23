import NetInfo from '@react-native-community/netinfo';
import { FTP_CONFIG } from '../constants/config';
import * as FileSystem from 'expo-file-system/legacy';

let FTPClient = null;
const getFTPClient = () => {
    if (FTPClient) return FTPClient;
    try {
        const mod = require('react-native-ftp-client');
        FTPClient = mod.default || mod;
    } catch (e) {
        FTPClient = null;
    }
    return FTPClient;
};

/**
 * Shared measurement utilities for QoE tests.
 * These functions perform network requests and update the QoE state.
 */

// QA-specified browsing URLs (rotated sequentially through all 5)
const BROWSING_URLS = [
    'https://www.google.com/',
    'https://www.facebook.com/',
    'https://www.amazon.com/',
    'https://www.chatgpt.com/',
    'https://www.wikipedia.org/',
];
let browsingUrlIndex = 0;

export const runBrowsingTest = async ({ addBrowsingSample, silent = false }) => {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return { success: false, error: 'No Internet' };

    // Rotate through all browsing URLs (QA requirement)
    const testUrl = BROWSING_URLS[browsingUrlIndex % BROWSING_URLS.length];
    browsingUrlIndex++;

    const startTime = Date.now();
    addBrowsingSample({ request: true });

    try {
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
            ? (sizeBytes * 8) / effectiveTime
            : 0;

        if (response.ok) {
            addBrowsingSample({
                completed: true,
                durationMs: duration,
                dnsResolutionTimeMs: dnsTime,
                throughputKbps: throughputKbps,
            });
            return { success: true, duration, throughputKbps, url: testUrl };
        }
        throw new Error(`HTTP ${response.status}`);
    } catch (error) {
        console.error('[Measurements] Browsing test error:', error);
        return { success: false, error: error.message };
    }
};

export const runStreamingTest = async ({ addStreamingSample, silent = false }) => {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return { success: false, error: 'No Internet' };

    const startTime = Date.now();
    addStreamingSample({ request: true });

    try {
        // QA-specified: YouTube short video URL for streaming test
        const testUrls = [
            'https://www.youtube.com/watch?v=aJq936yAUbc',
            'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png',
            'https://httpbin.org/image/png',
        ];

        let response = null;
        let setupStart = null;

        for (const url of testUrls) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);
                setupStart = Date.now();
                response = await fetch(url, { method: 'GET', cache: 'no-cache', signal: controller.signal });
                clearTimeout(timeoutId);
                if (response.ok) break;
            } catch (e) { continue; }
        }

        if (!response || !response.ok) throw new Error('All streaming URLs failed');

        const setupDelay = Date.now() - (setupStart || Date.now());
        addStreamingSample({ request: false, setupTimeMs: setupDelay });

        const streamStart = Date.now();
        const blob = await response.blob();
        const totalBytes = blob.size;
        const streamTime = Date.now() - streamStart;
        const totalTime = Date.now() - startTime;

        const effectiveTime = Math.max(streamTime, totalTime, 1);
        const throughputKbps = totalBytes > 0 && effectiveTime > 0 ? (totalBytes * 8) / effectiveTime : 0;

        // MOS and resolution mapping per ITU-T G.1035
        const mos = throughputKbps > 8000 ? 4.5 : throughputKbps > 4000 ? 4.0 : throughputKbps > 2000 ? 3.5 : throughputKbps > 500 ? 3.0 : 2.5;
        const resolution = throughputKbps > 8000 ? '1080p' : throughputKbps > 4000 ? 'HD (720p)' : throughputKbps > 2000 ? 'SD (480p)' : '360p';
        const bufferingCount = throughputKbps > 8000 ? 0 : throughputKbps > 4000 ? 1 : 2;

        addStreamingSample({
            request: false,
            completed: true,
            mos,
            throughputKbps,
            bufferingCount,
            resolution,
        });

        return { success: true, throughputKbps, mos, resolution };
    } catch (error) {
        console.error('[Measurements] Streaming test error:', error);
        return { success: false, error: error.message };
    }
};

export const runLatencyTest = async ({ addLatencySample, silent = false }) => {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return { success: false, error: 'No Internet' };

    addLatencySample({ request: true });

    try {
        const testUrls = ['https://www.google.com', 'https://www.cloudflare.com', 'https://www.bing.com'];
        let latencies = [];
        let successCount = 0;

        for (const url of testUrls) {
            try {
                const startTime = Date.now();
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                const response = await fetch(url, { method: 'HEAD', cache: 'no-cache', signal: controller.signal });
                clearTimeout(timeoutId);
                if (response.ok) {
                    successCount++;
                    latencies.push(Date.now() - startTime);
                }
            } catch (e) { }
        }

        const successRatio = testUrls.length > 0 ? successCount / testUrls.length : 0;
        const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 1000;
        const latencyScore = Math.max(0, Math.min(100, 100 - ((avgLatency - 100) / 9)));
        const interactivityScore = Math.round((successRatio * 50) + (latencyScore * 0.5));

        addLatencySample({ completed: true, score: interactivityScore, latencyMs: avgLatency });
        return { success: true, score: interactivityScore, avgLatency };
    } catch (error) {
        console.error('[Measurements] Latency test error:', error);
        return { success: false, error: error.message };
    }
};

export const runHttpDownloadTest = async ({ addHttpSample, silent = false }) => {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return { success: false, error: 'No Internet' };

    addHttpSample('dl', { request: true });

    try {
        // QA-specified: 10MB test file
        const testUrls = [
            'https://speed.hetzner.de/10MB.bin',
            'https://proof.ovh.net/files/10Mb.dat',
            'https://httpbin.org/bytes/10485760',
        ];

        // Start timer BEFORE fetch so we capture connection + transfer + blob read
        const startTime = Date.now();
        let response = null;
        for (const url of testUrls) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);
                response = await fetch(url, { method: 'GET', cache: 'no-cache', signal: controller.signal });
                clearTimeout(timeoutId);
                if (response.ok) break;
            } catch (e) { response = null; continue; }
        }

        if (!response || !response.ok) throw new Error('All DL URLs failed');

        const blob = await response.blob();
        const duration = Date.now() - startTime; // Total: connection + transfer + blob read
        const throughputMbps = (blob.size * 8 * 1000) / (Math.max(duration, 1) * 1000000);

        addHttpSample('dl', { completed: true, throughputMbps });
        return { success: true, throughputMbps, sizeBytes: blob.size };
    } catch (error) {
        console.error('[Measurements] HTTP DL test error:', error);
        return { success: false, error: error.message };
    }
};

export const runHttpUploadTest = async ({ addHttpSample, silent = false }) => {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return { success: false, error: 'No Internet' };

    addHttpSample('ul', { request: true });

    try {
        // QA-specified: 5MB upload
        const testData = 'x'.repeat(5 * 1024 * 1024); // 5MB
        const startTime = Date.now();
        const response = await fetch('https://httpbin.org/post', {
            method: 'POST',
            body: testData,
            headers: { 'Content-Type': 'text/plain' },
        });
        const duration = Date.now() - startTime;
        const throughputMbps = (testData.length * 8 * 1000) / (Math.max(duration, 1) * 1000000);

        addHttpSample('ul', { completed: true, throughputMbps });
        return { success: true, throughputMbps };
    } catch (error) {
        console.error('[Measurements] HTTP UL test error:', error);
        return { success: false, error: error.message };
    }
};

export const runSocialTest = async ({ addSocialSample, silent = false }) => {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return { success: false, error: 'No Internet' };

    const startTime = Date.now();
    addSocialSample({ request: true });

    try {
        // QA-specified: Facebook and X (Twitter)
        const testUrls = [
            'https://www.facebook.com/',
            'https://www.x.com/',
            'https://m.facebook.com/',
        ];

        let response = null;
        let requestStart = null;

        for (const url of testUrls) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);
                requestStart = Date.now();
                response = await fetch(url, { method: 'GET', cache: 'no-cache', signal: controller.signal });
                clearTimeout(timeoutId);
                if (response.ok) break;
            } catch (e) {
                response = null;
                requestStart = null;
                continue;
            }
        }

        if (!response || !response.ok) throw new Error('All social media URLs failed');

        const contentType = response.headers.get('content-type') || '';
        let responseData;
        if (contentType.includes('application/json')) {
            responseData = await response.json();
        } else {
            responseData = await response.text();
        }

        const duration = Date.now() - startTime;
        const requestTime = requestStart ? Date.now() - requestStart : duration;
        const responseSize = typeof responseData === 'string'
            ? responseData.length
            : JSON.stringify(responseData).length;
        const throughputKbps = requestTime > 0 ? (responseSize * 8) / requestTime : 0;

        addSocialSample({
            completed: true,
            durationMs: duration,
            throughputKbps: throughputKbps,
        });

        return { success: true, duration, throughputKbps };
    } catch (error) {
        console.error('[Measurements] Social test error:', error);
        return { success: false, error: error.message };
    }
};

export const runFtpDownloadTest = async ({ addFtpSample, silent = false }) => {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return { success: false, error: 'No Internet' };

    const FTP = getFTPClient();
    if (!FTP) return { success: false, error: 'FTP not available (requires custom build)' };

    addFtpSample('dl', { request: true });

    try {
        FTP.setup({
            ip_address: FTP_CONFIG.host,
            port: FTP_CONFIG.port,
            username: FTP_CONFIG.username,
            password: FTP_CONFIG.password,
        });

        const localPath = `${FileSystem.cacheDirectory}ftp-download-test.bin`;
        const cleanLocalPath = localPath.replace('file://', '');
        const startTime = Date.now();

        const downloadPromise = FTP.downloadFile(cleanLocalPath, FTP_CONFIG.downloadPath);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('FTP timeout')), 15000));
        await Promise.race([downloadPromise, timeoutPromise]);

        const totalTime = Math.max(Date.now() - startTime, 200); // Min 200ms guard
        const info = await FileSystem.getInfoAsync(localPath);
        const sizeBytes = info?.size || 0;

        if (sizeBytes === 0) throw new Error('Downloaded file is empty');

        const throughputKbps = (sizeBytes * 8 * 1000) / totalTime;
        // Cap at 100 Mbps — anything higher on mobile is a bad reading from instant FTP resolve
        const cappedThroughputKbps = Math.min(throughputKbps, 100 * 1000);

        addFtpSample('dl', { completed: true, throughputKbps: cappedThroughputKbps });

        if (info?.exists) await FileSystem.deleteAsync(localPath, { idempotent: true });

        return { success: true, throughputKbps: cappedThroughputKbps, sizeBytes };
    } catch (error) {
        console.error('[Measurements] FTP DL error:', error);
        return { success: false, error: error.message };
    }
};

export const runFtpUploadTest = async ({ addFtpSample, silent = false }) => {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return { success: false, error: 'No Internet' };

    const FTP = getFTPClient();
    if (!FTP) return { success: false, error: 'FTP not available' };

    addFtpSample('ul', { request: true });

    try {
        FTP.setup({
            ip_address: FTP_CONFIG.host,
            port: FTP_CONFIG.port,
            username: FTP_CONFIG.username,
            password: FTP_CONFIG.password,
        });

        const testDataSize = 5 * 1024 * 1024; // 5MB
        const testData = 'x'.repeat(testDataSize);
        const localPath = `${FileSystem.cacheDirectory}ftp-upload-test.txt`;
        const cleanLocalPath = localPath.replace('file://', '');

        await FileSystem.writeAsStringAsync(localPath, testData);
        const startTime = Date.now();

        const uploadPromise = FTP.uploadFile(cleanLocalPath, FTP_CONFIG.uploadPath);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('FTP timeout')), 15000));
        await Promise.race([uploadPromise, timeoutPromise]);

        const uploadTime = Math.max(Date.now() - startTime, 200); // Min 200ms guard
        const throughputKbps = (testDataSize * 8 * 1000) / uploadTime;
        // Cap at 100 Mbps — anything higher on mobile is a bad reading
        const cappedThroughputKbps = Math.min(throughputKbps, 100 * 1000);

        addFtpSample('ul', { completed: true, throughputKbps: cappedThroughputKbps });

        await FileSystem.deleteAsync(localPath, { idempotent: true });

        return { success: true, throughputKbps: cappedThroughputKbps, sizeBytes: testDataSize };
    } catch (error) {
        console.error('[Measurements] FTP UL error:', error);
        return { success: false, error: error.message };
    }
};
