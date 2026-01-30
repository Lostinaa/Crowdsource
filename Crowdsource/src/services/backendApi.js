/**
 * Backend API Client for QoE Data Ingestion
 * Handles secure data transmission to backend analytics platform
 */

import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { BACKEND_CONFIG } from '../constants/config';

/**
 * Determines the appropriate backend URL based on environment and platform.
 * 
 * Priority:
 * 1. Environment variable EXPO_PUBLIC_BACKEND_URL (if set)
 * 2. Android emulator special IP (10.0.2.2)
 * 3. iOS simulator localhost
 * 4. Default fallback (localhost)
 * 
 * For real devices, you MUST set EXPO_PUBLIC_BACKEND_URL in your .env file
 * to your server's actual IP address or domain.
 */
const getDefaultBackendUrl = () => {
  // Use centralized configuration
  return BACKEND_CONFIG.url;

  // For Android emulator, use 10.0.2.2 (special IP that maps to host's localhost)
  if (Platform.OS === 'android' && !Device.isDevice) {
    return 'http://10.0.2.2:8000/api';
  }

  // For iOS simulator, use localhost
  if (Platform.OS === 'ios' && !Device.isDevice) {
    return 'http://localhost:8000/api';
  }

  // For real devices without env config, warn and use localhost (will likely fail)
  // Users should configure EXPO_PUBLIC_BACKEND_URL in .env
  console.warn(
    '[BackendAPI] No EXPO_PUBLIC_BACKEND_URL configured. ' +
    'For real devices, create a .env file with EXPO_PUBLIC_BACKEND_URL=http://YOUR_SERVER_IP:8000/api'
  );
  return 'http://localhost:8000/api';
};

const DEFAULT_BACKEND_URL = getDefaultBackendUrl();

// Log the detected URL for debugging
console.log('[BackendAPI] Initialized with URL:', DEFAULT_BACKEND_URL,
  Device.isDevice ? '(Real Device)' : `(${Platform.OS} Emulator/Simulator)`);

class BackendApiClient {
  constructor(baseUrl = DEFAULT_BACKEND_URL, apiKey = null) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.syncQueue = [];
    this.isSyncing = false;
    console.log('[BackendAPI] BackendApiClient created with baseUrl:', this.baseUrl);
  }

  /**
   * Set API key for authentication
   */
  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * Set backend URL
   */
  setBackendUrl(url) {
    console.log('[BackendAPI] URL changed from', this.baseUrl, 'to', url);
    this.baseUrl = url;
  }

  /**
   * Get default headers for API requests
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  /**
   * Send QoE metrics to backend
   */
  async sendMetrics(metrics, scores, deviceInfo = {}, location = null) {
    const payload = {
      timestamp: new Date().toISOString(),
      device: {
        platform: deviceInfo.platform || 'unknown',
        model: deviceInfo.model || 'unknown',
        osVersion: deviceInfo.osVersion || 'unknown',
        appVersion: deviceInfo.appVersion || '1.0.0',
        ...deviceInfo,
      },
      location: location ? {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: location.timestamp,
      } : null,
      metrics: {
        voice: {
          attempts: metrics.voice?.attempts || 0,
          setupOk: metrics.voice?.setupOk || 0,
          completed: metrics.voice?.completed || 0,
          dropped: metrics.voice?.dropped || 0,
          setupTimes: metrics.voice?.setupTimes || [],
          mosSamples: metrics.voice?.mosSamples || [],
          reasons: metrics.voice?.reasons || [],
        },
        data: {
          browsing: {
            requests: metrics.data?.browsing?.requests || 0,
            completed: metrics.data?.browsing?.completed || 0,
            durations: metrics.data?.browsing?.durations || [],
            dnsResolutionTimes: metrics.data?.browsing?.dnsResolutionTimes || [],
            throughputs: metrics.data?.browsing?.throughputs || [],
          },
          streaming: {
            requests: metrics.data?.streaming?.requests || 0,
            completed: metrics.data?.streaming?.completed || 0,
            mosSamples: metrics.data?.streaming?.mosSamples || [],
            setupTimes: metrics.data?.streaming?.setupTimes || [],
            throughputs: metrics.data?.streaming?.throughputs || [],
            bufferingCounts: metrics.data?.streaming?.bufferingCounts || [],
            resolutions: metrics.data?.streaming?.resolutions || [],
          },
          http: {
            dl: {
              requests: metrics.data?.http?.dl?.requests || 0,
              completed: metrics.data?.http?.dl?.completed || 0,
              throughputs: metrics.data?.http?.dl?.throughputs || [],
            },
            ul: {
              requests: metrics.data?.http?.ul?.requests || 0,
              completed: metrics.data?.http?.ul?.completed || 0,
              throughputs: metrics.data?.http?.ul?.throughputs || [],
            },
          },
          ftp: {
            dl: {
              requests: metrics.data?.ftp?.dl?.requests || 0,
              completed: metrics.data?.ftp?.dl?.completed || 0,
              throughputs: metrics.data?.ftp?.dl?.throughputs || [],
            },
            ul: {
              requests: metrics.data?.ftp?.ul?.requests || 0,
              completed: metrics.data?.ftp?.ul?.completed || 0,
              throughputs: metrics.data?.ftp?.ul?.throughputs || [],
            },
          },
          social: {
            requests: metrics.data?.social?.requests || 0,
            completed: metrics.data?.social?.completed || 0,
            durations: metrics.data?.social?.durations || [],
            throughputs: metrics.data?.social?.throughputs || [],
          },
          latency: {
            requests: metrics.data?.latency?.requests || 0,
            completed: metrics.data?.latency?.completed || 0,
            scores: metrics.data?.latency?.scores || [],
          },
        },
      },
      scores: {
        overall: scores.overall?.score || null,
        voice: scores.voice?.score || null,
        data: scores.data?.score || null,
        browsing: scores.browsing?.score || null,
        streaming: scores.streaming?.score || null,
        http: scores.http?.score || null,
        social: scores.social?.score || null,
      },
    };

    try {
      console.log('[BackendAPI] Sending metrics to:', `${this.baseUrl}/metrics`);
      const response = await fetch(`${this.baseUrl}/metrics`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      console.error('[BackendAPI] Failed to send metrics:', error.message, 'URL:', this.baseUrl);
      // Queue for retry
      this.syncQueue.push({ type: 'metrics', payload, timestamp: Date.now() });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a single coverage sample (map trail point) to backend
   */
  async sendCoverageSample(sample) {
    const payload = {
      timestamp: sample.timestamp || new Date().toISOString(),
      latitude: sample.latitude,
      longitude: sample.longitude,
      accuracy: sample.accuracy,
      network_type: sample.networkType,
      network_category: sample.networkCategory,
      rsrp: sample.rsrp,
      rsrq: sample.rsrq,
      rssnr: sample.rssnr,
      cqi: sample.cqi,
      enb: sample.enb,
      cell_id: sample.cellId,
      pci: sample.pci,
      tac: sample.tac,
      eci: sample.eci,
      raw: sample.raw || null,
    };

    try {
      const response = await fetch(`${this.baseUrl}/coverage-samples`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }

      return { success: true, data: await response.json() };
    } catch (error) {
      console.error('[BackendAPI] Failed to send coverage sample:', error.message, 'URL:', this.baseUrl);
      this.syncQueue.push({ type: 'coverage', payload, timestamp: Date.now(), retryCount: 0 });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send history entry to backend
   */
  async sendHistoryEntry(historyEntry, deviceInfo = {}, location = null) {
    return this.sendMetrics(
      historyEntry.metrics,
      historyEntry.scores,
      deviceInfo,
      location
    );
  }

  /**
   * Get coverage samples from backend
   */
  async getCoverageSamples(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);
      if (filters.networkCategory) params.append('network_category', filters.networkCategory);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.bounds) {
        params.append('bounds[min_lat]', filters.bounds.minLat);
        params.append('bounds[max_lat]', filters.bounds.maxLat);
        params.append('bounds[min_lon]', filters.bounds.minLon);
        params.append('bounds[max_lon]', filters.bounds.maxLon);
      }

      const url = `${this.baseUrl}/coverage-samples${params.toString() ? '?' + params.toString() : ''}`;
      console.log('[BackendAPI] Fetching coverage samples:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return { success: true, data: result.data || [], count: result.count || 0 };
    } catch (error) {
      console.error('[BackendAPI] Failed to get coverage samples:', error.message);
      return { success: false, error: error.message, data: [], count: 0 };
    }
  }

  /**
   * Get coverage statistics
   */
  async getCoverageStatistics(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);

      const url = `${this.baseUrl}/coverage-samples/statistics${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return { success: true, data: result.data || {} };
    } catch (error) {
      console.error('[BackendAPI] Failed to get coverage statistics:', error.message);
      return { success: false, error: error.message, data: {} };
    }
  }

  /**
   * Sync queued items
   */
  async syncQueue() {
    if (this.isSyncing || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;
    const items = [...this.syncQueue];
    this.syncQueue = [];

    for (const item of items) {
      try {
        if (item.type === 'metrics') {
          await this.sendMetrics(item.payload.metrics, item.payload.scores, item.payload.deviceInfo, item.payload.location);
        } else if (item.type === 'coverage') {
          await this.sendCoverageSample(item.payload);
        }
      } catch (error) {
        console.error('[BackendAPI] Failed to sync queued item:', error);
        // Re-queue if failed (with limit to prevent infinite retries)
        if (item.retryCount < 3) {
          this.syncQueue.push({ ...item, retryCount: (item.retryCount || 0) + 1 });
        }
      }
    }

    this.isSyncing = false;
  }

  /**
   * Test backend connection
   */
  async testConnection() {
    console.log('[BackendAPI] Testing connection to:', this.baseUrl);
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      console.log('[BackendAPI] Health check response:', response.status, response.statusText);

      return {
        success: response.ok,
        status: response.status,
        message: response.ok ? 'Connection successful' : `Connection failed: ${response.status} ${response.statusText}`,
      };
    } catch (error) {
      console.error('[BackendAPI] Connection test error:', error.message, 'URL:', this.baseUrl);
      return {
        success: false,
        error: error.message,
        message: `Connection failed: ${error.message} (URL: ${this.baseUrl})`,
      };
    }
  }
}

// Export singleton instance
export const backendApi = new BackendApiClient();

// Export class for custom instances
export default BackendApiClient;

