/**
 * Backend API Client for QoE Data Ingestion
 * Handles secure data transmission to backend analytics platform
 */

const DEFAULT_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.5:8000/api';

class BackendApiClient {
  constructor(baseUrl = DEFAULT_BACKEND_URL, apiKey = null) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.syncQueue = [];
    this.isSyncing = false;
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
      console.error('[BackendAPI] Failed to send metrics:', error);
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
      console.error('[BackendAPI] Failed to send coverage sample:', error);
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
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return {
        success: response.ok,
        status: response.status,
        message: response.ok ? 'Connection successful' : `Connection failed: ${response.statusText}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Connection failed: ${error.message}`,
      };
    }
  }
}

// Export singleton instance
export const backendApi = new BackendApiClient();

// Export class for custom instances
export default BackendApiClient;

