/**
 * TypeScript Type Definitions for QoE Metrics
 * Provides type safety for the scoring engine and API client
 */

// ============================================================================
// Voice Metrics Types
// ============================================================================

export interface VoiceMetrics {
    /** Total number of call attempts */
    attempts: number;
    /** Number of successful call setups */
    setupOk: number;
    /** Number of completed calls */
    completed: number;
    /** Number of dropped calls */
    dropped: number;
    /** Array of setup times in milliseconds */
    setupTimes: number[];
    /** Array of MOS (Mean Opinion Score) samples (1.0 - 5.0) */
    mosSamples: number[];
    /** Array of drop/failure reasons */
    reasons?: string[];
}

export interface VoiceScoreResult {
    /** Overall voice score (0-1) */
    score: number | null;
    /** Applied weight of metrics used */
    appliedWeight: number;
    /** Call Setup Success Ratio */
    cssr: number | null;
    /** Call Drop Ratio */
    cdr: number | null;
    /** Average Call Setup Time (ms) */
    cstAvg: number | null;
    /** Ratio of calls with setup time > 15s */
    cstOver15: number | null;
    /** Average MOS */
    mosAvg: number | null;
    /** Ratio of MOS samples below 1.6 */
    mosUnder16: number | null;
}

// ============================================================================
// Data Metrics Types
// ============================================================================

export interface TransferMetrics {
    /** Number of transfer requests */
    requests: number;
    /** Number of completed transfers */
    completed: number;
    /** Array of throughput measurements in Kbps */
    throughputs: number[];
}

export interface HttpMetrics {
    /** Download metrics */
    dl: TransferMetrics;
    /** Upload metrics */
    ul: TransferMetrics;
}

export interface BrowsingMetrics {
    /** Number of browsing requests */
    requests: number;
    /** Number of completed page loads */
    completed: number;
    /** Array of page load durations in milliseconds */
    durations: number[];
    /** Array of DNS resolution times in milliseconds */
    dnsResolutionTimes?: number[];
    /** Array of throughput measurements in Kbps */
    throughputs?: number[];
}

export interface StreamingMetrics {
    /** Number of streaming requests */
    requests: number;
    /** Number of completed streams */
    completed: number;
    /** Array of video quality MOS samples */
    mosSamples: number[];
    /** Array of video access/setup times in milliseconds */
    setupTimes: number[];
    /** Array of throughput measurements in Kbps */
    throughputs?: number[];
    /** Array of buffering event counts */
    bufferingCounts?: number[];
    /** Array of video resolutions achieved */
    resolutions?: string[];
}

export interface SocialMetrics {
    /** Number of social media requests */
    requests: number;
    /** Number of completed interactions */
    completed: number;
    /** Array of interaction durations in milliseconds */
    durations: number[];
    /** Array of throughput measurements in Kbps */
    throughputs?: number[];
}

export interface LatencyMetrics {
    /** Number of latency test requests */
    requests: number;
    /** Number of completed tests */
    completed: number;
    /** Array of interactivity scores (0-100) */
    scores: number[];
}

export interface FtpMetrics {
    /** Download metrics */
    dl: TransferMetrics;
    /** Upload metrics */
    ul: TransferMetrics;
}

export interface DataMetrics {
    browsing?: BrowsingMetrics;
    streaming?: StreamingMetrics;
    http?: HttpMetrics;
    ftp?: FtpMetrics;
    social?: SocialMetrics;
    latency?: LatencyMetrics;
}

// ============================================================================
// Score Result Types
// ============================================================================

export interface HttpScoreResult {
    score: number | null;
    appliedWeight: number;
    dlSuccess: number | null;
    dlAvg: number | null;
    dlP10: number | null;
    dlP90: number | null;
    ulSuccess: number | null;
    ulAvg: number | null;
    ulP10: number | null;
    ulP90: number | null;
}

export interface BrowsingScoreResult {
    score: number | null;
    appliedWeight: number;
    successRatio: number | null;
    durationAvg: number | null;
}

export interface StreamingScoreResult {
    score: number | null;
    appliedWeight: number;
    successRatio: number | null;
    mosAvg: number | null;
    setupAvg: number | null;
    setupOver5: number | null;
}

export interface SocialScoreResult {
    score: number | null;
    appliedWeight: number;
    successRatio: number | null;
    durationAvg: number | null;
    durationOver5: number | null;
}

export interface LatencyScoreResult {
    score: number | null;
    appliedWeight: number;
    successRatio: number | null;
    avgScore: number | null;
}

export interface DataScoreResult {
    score: number | null;
    appliedWeight: number;
}

export interface OverallScoreResult {
    score: number | null;
    appliedWeight: number;
}

export interface AllScores {
    voice: VoiceScoreResult;
    http: HttpScoreResult;
    browsing: BrowsingScoreResult;
    streaming: StreamingScoreResult;
    social: SocialScoreResult;
    latency: LatencyScoreResult;
    data: DataScoreResult;
    overall: OverallScoreResult;
}

// ============================================================================
// Complete Metrics Container
// ============================================================================

export interface QoEMetrics {
    voice?: VoiceMetrics;
    data?: DataMetrics;
}

// ============================================================================
// Location Types
// ============================================================================

export interface LocationData {
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number;
    timestamp?: string;
}

// ============================================================================
// Device Information Types
// ============================================================================

export interface DeviceInfo {
    platform: 'android' | 'ios' | 'web';
    model: string;
    osVersion: string;
    appVersion: string;
    deviceId?: string;
    manufacturer?: string;
}

// ============================================================================
// Coverage Sample Types (for Map)
// ============================================================================

export interface CoverageSample {
    timestamp: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    networkType: string;
    networkCategory: '2G' | '3G' | '4G' | '5G' | 'WiFi' | 'Unknown';
    rsrp?: number;
    rsrq?: number;
    rssnr?: number;
    cqi?: number;
    enb?: string;
    cellId?: string;
    pci?: number;
    tac?: number;
    eci?: string;
    raw?: Record<string, unknown>;
}

// ============================================================================
// API Types
// ============================================================================

export interface MetricsPayload {
    timestamp: string;
    device: DeviceInfo;
    location: LocationData | null;
    metrics: {
        voice: Partial<VoiceMetrics>;
        data: Partial<DataMetrics>;
    };
    scores: {
        overall: number | null;
        voice: number | null;
        data: number | null;
        browsing: number | null;
        streaming: number | null;
        http: number | null;
        social: number | null;
    };
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface CoverageSamplesResponse {
    data: CoverageSample[];
    count: number;
}

export interface CoverageStatistics {
    totalSamples: number;
    networkDistribution: Record<string, number>;
    averageRsrp?: number;
    dateRange?: {
        start: string;
        end: string;
    };
}

// ============================================================================
// History Entry Type
// ============================================================================

export interface HistoryEntry {
    id: string;
    timestamp: string;
    metrics: QoEMetrics;
    scores: AllScores;
    location?: LocationData;
    deviceInfo?: DeviceInfo;
}

// ============================================================================
// Threshold Configuration Types
// ============================================================================

export interface ThresholdConfig {
    good: number;
    bad: number;
    higherIsBetter: boolean;
}

export interface VoiceThresholds {
    cssr: ThresholdConfig;
    cdr: ThresholdConfig;
    cstAvg: ThresholdConfig;
    cstOver15: ThresholdConfig;
    cstP10: ThresholdConfig;
    mosAvg: ThresholdConfig;
    mosUnder16: ThresholdConfig;
    mosP90: ThresholdConfig;
}

export interface HttpThresholds {
    successRatio: ThresholdConfig;
    dlAvg: ThresholdConfig;
    dlP10: ThresholdConfig;
    dlP90: ThresholdConfig;
    ulAvg: ThresholdConfig;
    ulP10: ThresholdConfig;
    ulP90: ThresholdConfig;
}

// ============================================================================
// FTP Configuration Type
// ============================================================================

export interface FtpConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    downloadPath: string;
    uploadPath: string;
    enableRealFtp: boolean;
}
