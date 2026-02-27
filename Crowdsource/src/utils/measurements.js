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

        // Resolution and score mapping per QA specification:
        // 2160p(4K)→5, 1440p(2K)→5, 1080p→5, 720p→4, 480p→3, 360p→2, 240p→1
        let resolution, resolutionScore;
        if (throughputKbps > 20000) { resolution = '2160p (4K)'; resolutionScore = 5; }
        else if (throughputKbps > 12000) { resolution = '1440p (2K)'; resolutionScore = 5; }
        else if (throughputKbps > 8000) { resolution = '1080p (Full HD)'; resolutionScore = 5; }
        else if (throughputKbps > 4000) { resolution = '720p (HD)'; resolutionScore = 4; }
        else if (throughputKbps > 2000) { resolution = '480p (SD)'; resolutionScore = 3; }
        else if (throughputKbps > 500) { resolution = '360p'; resolutionScore = 2; }
        else { resolution = '240p'; resolutionScore = 1; }

        const mos = resolutionScore >= 5 ? 4.5 : resolutionScore === 4 ? 4.0 : resolutionScore === 3 ? 3.5 : resolutionScore === 2 ? 3.0 : 2.5;
        const bufferingCount = throughputKbps > 8000 ? 0 : throughputKbps > 4000 ? 1 : 2;

        addStreamingSample({
            request: false,
            completed: true,
            mos,
            throughputKbps,
            bufferingCount,
            resolution,
            resolutionScore,
        });

        return { success: true, throughputKbps, mos, resolution, resolutionScore };
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
        // Ping multiple endpoints for a more accurate and variable measurement
        const testUrls = [
            'https://www.google.com/generate_204',
            'https://1.1.1.1/cdn-cgi/trace',
            'https://www.bing.com',
            'https://www.amazon.com',
            'https://www.apple.com',
        ];
        let latencies = [];
        let successCount = 0;

        // Run 2 rounds for better accuracy
        for (let round = 0; round < 2; round++) {
            for (const url of testUrls) {
                try {
                    const startTime = Date.now();
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);
                    const response = await fetch(url, { method: 'HEAD', cache: 'no-cache', signal: controller.signal });
                    clearTimeout(timeoutId);
                    const rtt = Date.now() - startTime;
                    if (response.ok || response.status === 204) {
                        successCount++;
                        latencies.push(rtt);
                    }
                } catch (e) { /* skip failed endpoints */ }
            }
        }

        const totalAttempts = testUrls.length * 2;
        const successRatio = totalAttempts > 0 ? successCount / totalAttempts : 0;
        const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 1000;

        console.log(`[Latency] ${latencies.length} pings, avg=${avgLatency.toFixed(0)}ms, latencies=${JSON.stringify(latencies)}`);

        // ITU-based interactivity scoring:
        // < 50ms: 100, < 100ms: 85, < 150ms: 70, < 300ms: 50, < 500ms: 30, >= 500ms: 10
        let latencyScore;
        if (avgLatency < 50) latencyScore = 100;
        else if (avgLatency < 100) latencyScore = 85 + (100 - avgLatency) / 50 * 15;
        else if (avgLatency < 150) latencyScore = 70 + (150 - avgLatency) / 50 * 15;
        else if (avgLatency < 300) latencyScore = 50 + (300 - avgLatency) / 150 * 20;
        else if (avgLatency < 500) latencyScore = 30 + (500 - avgLatency) / 200 * 20;
        else latencyScore = Math.max(5, 30 - (avgLatency - 500) / 100 * 5);

        const interactivityScore = Math.round((successRatio * 40) + (latencyScore * 0.6));

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
        // Multiple CDN sources - ordered by reliability from Ethiopia
        const testUrls = [
            'https://speed.hetzner.de/10MB.bin',
            'https://proof.ovh.net/files/10Mb.dat',
            'https://speed.cloudflare.com/__down?bytes=10485760',
        ];

        const startTime = Date.now();
        let response = null;
        let usedUrl = '';
        for (const url of testUrls) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 60000);
                response = await fetch(url, { method: 'GET', cache: 'no-cache', signal: controller.signal });
                clearTimeout(timeoutId);
                if (response.ok) { usedUrl = url; break; }
            } catch (e) { response = null; continue; }
        }

        if (!response || !response.ok) throw new Error('All DL URLs failed');

        const blob = await response.blob();
        const duration = Date.now() - startTime;
        const throughputMbps = (blob.size * 8) / (Math.max(duration, 1) * 1000);

        console.log(`[HTTP DL] ${blob.size} bytes in ${duration}ms = ${throughputMbps.toFixed(2)} Mbps from ${usedUrl}`);

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
        // 5MB upload
        const testData = 'x'.repeat(5 * 1024 * 1024);
        const startTime = Date.now();

        // Try multiple upload endpoints
        const uploadUrls = [
            'https://httpbin.org/post',
            'https://postman-echo.com/post',
        ];

        let response = null;
        for (const url of uploadUrls) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 60000);
                response = await fetch(url, {
                    method: 'POST',
                    body: testData,
                    headers: { 'Content-Type': 'text/plain' },
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                if (response.ok) break;
            } catch (e) { response = null; continue; }
        }

        if (!response || !response.ok) throw new Error('Upload failed');

        const duration = Date.now() - startTime;
        const throughputMbps = (testData.length * 8) / (Math.max(duration, 1) * 1000);

        console.log(`[HTTP UL] ${testData.length} bytes in ${duration}ms = ${throughputMbps.toFixed(2)} Mbps`);

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

        // Use unique filename to avoid native crash when file already exists
        const localPath = `${FileSystem.cacheDirectory}ftp-dl-${Date.now()}.bin`;
        const cleanLocalPath = localPath.replace('file://', '');

        // Safety: delete any leftover file before download (native module throws Error if file exists)
        try { await FileSystem.deleteAsync(localPath, { idempotent: true }); } catch (e) { /* ignore */ }

        const startTime = Date.now();

        const downloadPromise = FTP.downloadFile(cleanLocalPath, FTP_CONFIG.downloadPath);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('FTP timeout')), 30000));
        await Promise.race([downloadPromise, timeoutPromise]);

        const totalTime = Date.now() - startTime;
        const info = await FileSystem.getInfoAsync(localPath);
        const sizeBytes = info?.size || 0;

        if (sizeBytes === 0) throw new Error('Downloaded file is empty');

        // Calculate real throughput — no artificial caps or minimum times
        const throughputKbps = (sizeBytes * 8) / Math.max(totalTime, 1);

        console.log(`[FTP DL] ${sizeBytes} bytes in ${totalTime}ms = ${(throughputKbps / 1000).toFixed(2)} Mbps`);

        addFtpSample('dl', { completed: true, throughputKbps });

        // Cleanup downloaded file
        try { await FileSystem.deleteAsync(localPath, { idempotent: true }); } catch (e) { /* ignore */ }

        return { success: true, throughputKbps, sizeBytes };
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
        const localPath = `${FileSystem.cacheDirectory}ftp-ul-${Date.now()}.txt`;
        const cleanLocalPath = localPath.replace('file://', '');

        // Delete any leftover file first
        try { await FileSystem.deleteAsync(localPath, { idempotent: true }); } catch (e) { /* ignore */ }

        await FileSystem.writeAsStringAsync(localPath, testData);
        const startTime = Date.now();

        const uploadPromise = FTP.uploadFile(cleanLocalPath, FTP_CONFIG.uploadPath);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('FTP timeout')), 30000));
        await Promise.race([uploadPromise, timeoutPromise]);

        const uploadTime = Date.now() - startTime;

        // Calculate real throughput — no artificial caps or minimum times
        const throughputKbps = (testDataSize * 8) / Math.max(uploadTime, 1);

        console.log(`[FTP UL] ${testDataSize} bytes in ${uploadTime}ms = ${(throughputKbps / 1000).toFixed(2)} Mbps`);

        addFtpSample('ul', { completed: true, throughputKbps });

        try { await FileSystem.deleteAsync(localPath, { idempotent: true }); } catch (e) { /* ignore */ }

        return { success: true, throughputKbps, sizeBytes: testDataSize };
    } catch (error) {
        console.error('[Measurements] FTP UL error:', error);
        return { success: false, error: error.message };
    }
};
