import {
  DATA_WEIGHTS,
  OVERALL_WEIGHTS,
  THRESHOLDS,
  VOICE_WEIGHTS,
} from '../constants/scoring';
import { percentile, ratio, safeAverage, scoreLinear, weightedScore } from './math';

const buildEntries = (metricsConfig = []) =>
  metricsConfig
    .filter((config) => config.score !== null && config.score !== undefined)
    .map((config) => ({ weight: config.weight, score: config.score }));

const evaluateMetric = (value, threshold) => {
  if (value === null || value === undefined) return null;
  return scoreLinear(value, threshold.good, threshold.bad, threshold.higherIsBetter);
};

const calculateVoiceScore = (voiceMetrics) => {
  const {
    attempts = 0,
    setupOk = 0,
    completed = 0,
    dropped = 0,
    setupTimes = [],
    mosSamples = [],
  } = voiceMetrics || {};

  console.log('[Scoring] Voice metrics input:', {
    attempts,
    setupOk,
    completed,
    dropped,
    setupTimesCount: setupTimes.length,
    mosSamplesCount: mosSamples.length,
  });

  const cssr = ratio(setupOk, attempts);
  // CDR = dropped calls / total answered calls (completed + dropped)
  // This handles the case where all calls are dropped (completed = 0)
  const totalAnswered = completed + dropped;
  const cdr = ratio(dropped, totalAnswered);
  // Call Setup Time average in seconds (setupTimes are stored in ms)
  const cstAvg = safeAverage(setupTimes.map(t => t / 1000));

  console.log('[Scoring] Voice calculations:', {
    cssr,
    cdr,
    cstAvg,
    cssrFormula: `setupOk(${setupOk}) / attempts(${attempts})`,
    cdrFormula: `dropped(${dropped}) / (completed(${completed}) + dropped(${dropped})) = ${totalAnswered}`,
  });
  // Call Setup Time > 10s (per calculator table, threshold: 3% bad, 0% good)
  const cstOver10 = ratio(
    setupTimes.filter((val) => val > 10_000).length, // > 10 seconds in milliseconds
    setupTimes.length
  );
  const mosAvg = safeAverage(mosSamples);
  const mosUnder16 = ratio(
    mosSamples.filter((val) => val < 1.6).length,
    mosSamples.length
  );

  // Per QoE Calculator table, only these metrics are used:
  const metrics = buildEntries([
    { score: evaluateMetric(cssr, THRESHOLDS.voice.cssr), weight: VOICE_WEIGHTS.cssr },
    { score: evaluateMetric(cdr, THRESHOLDS.voice.cdr), weight: VOICE_WEIGHTS.cdr },
    { score: evaluateMetric(mosAvg, THRESHOLDS.voice.mosAvg), weight: VOICE_WEIGHTS.mosAvg },
    { score: evaluateMetric(mosUnder16, THRESHOLDS.voice.mosUnder16), weight: VOICE_WEIGHTS.mosUnder16 },
    { score: evaluateMetric(cstAvg, THRESHOLDS.voice.cstAvg), weight: VOICE_WEIGHTS.cstAvg },
    { score: evaluateMetric(cstOver10, THRESHOLDS.voice.cstOver15), weight: VOICE_WEIGHTS.cstOver15 }, // Using cstOver15 threshold (3% bad, 0% good)
  ]);

  const { score, appliedWeight } = weightedScore(metrics);
  return {
    score,
    appliedWeight,
    cssr,
    cdr,
    cstAvg,
    cstOver15: cstOver10, // Renamed for consistency but using >10s threshold
    mosAvg,
    mosUnder16,
  };
};

const calculateHttpScore = (httpMetrics) => {
  const {
    dl = { requests: 0, completed: 0, throughputs: [] },
    ul = { requests: 0, completed: 0, throughputs: [] },
  } = httpMetrics || {};

  console.log('[Scoring] HTTP metrics input:', {
    dlRequests: dl.requests,
    dlCompleted: dl.completed,
    dlThroughputsCount: dl.throughputs.length,
    ulRequests: ul.requests,
    ulCompleted: ul.completed,
    ulThroughputsCount: ul.throughputs.length,
  });

  const dlSuccess = ratio(dl.completed, dl.requests);
  const ulSuccess = ratio(ul.completed, ul.requests);
  const dlAvg = safeAverage(dl.throughputs);
  const dlP10 = percentile(dl.throughputs, 0.1);
  const dlP90 = percentile(dl.throughputs, 0.9);
  const ulAvg = safeAverage(ul.throughputs);
  const ulP10 = percentile(ul.throughputs, 0.1);
  const ulP90 = percentile(ul.throughputs, 0.9);

  console.log('[Scoring] HTTP calculations:', {
    dlSuccess,
    dlAvg,
    ulSuccess,
    ulAvg,
  });

  const metrics = buildEntries([
    {
      score: evaluateMetric(dlSuccess, THRESHOLDS.http.successRatio),
      weight: DATA_WEIGHTS.http.successRatioDl,
    },
    { score: evaluateMetric(dlAvg, THRESHOLDS.http.dlAvg), weight: DATA_WEIGHTS.http.dlAvg },
    { score: evaluateMetric(dlP10, THRESHOLDS.http.dlP10), weight: DATA_WEIGHTS.http.dlP10 },
    { score: evaluateMetric(dlP90, THRESHOLDS.http.dlP90), weight: DATA_WEIGHTS.http.dlP90 },
    {
      score: evaluateMetric(ulSuccess, THRESHOLDS.http.successRatio),
      weight: DATA_WEIGHTS.http.successRatioUl,
    },
    { score: evaluateMetric(ulAvg, THRESHOLDS.http.ulAvg), weight: DATA_WEIGHTS.http.ulAvg },
    { score: evaluateMetric(ulP10, THRESHOLDS.http.ulP10), weight: DATA_WEIGHTS.http.ulP10 },
    { score: evaluateMetric(ulP90, THRESHOLDS.http.ulP90), weight: DATA_WEIGHTS.http.ulP90 },
  ]);

  const { score, appliedWeight } = weightedScore(metrics);
  return {
    score,
    appliedWeight,
    dlSuccess,
    dlAvg,
    dlP10,
    dlP90,
    ulSuccess,
    ulAvg,
    ulP10,
    ulP90,
  };
};

const calculateBrowsingScore = (browsingMetrics) => {
  const {
    requests = 0,
    completed = 0,
    durations = [],
  } = browsingMetrics || {};

  console.log('[Scoring] Browsing metrics input:', {
    requests,
    completed,
    durationsCount: durations.length,
  });

  const successRatio = ratio(completed, requests);
  // Average Duration in seconds (per calculator table: 3 bad, 0 good)
  const durationAvg = safeAverage(durations.map(d => d / 1000)); // Convert ms to seconds

  console.log('[Scoring] Browsing calculations:', {
    successRatio,
    durationAvg,
  });

  // Per QoE Calculator table: Activity Success Ratio (50%), Average Duration (50%)
  const metrics = buildEntries([
    { score: evaluateMetric(successRatio, THRESHOLDS.browsing.successRatio), weight: DATA_WEIGHTS.browsing.successRatio },
    { score: evaluateMetric(durationAvg, THRESHOLDS.browsing.durationAvg), weight: DATA_WEIGHTS.browsing.durationAvg },
  ]);

  const { score, appliedWeight } = weightedScore(metrics);
  return {
    score,
    appliedWeight,
    successRatio,
    durationAvg,
  };
};

const calculateStreamingScore = (streamingMetrics) => {
  const {
    requests = 0,
    completed = 0,
    mosSamples = [],
    setupTimes = [],
  } = streamingMetrics || {};

  console.log('[Scoring] Streaming metrics input:', {
    requests,
    completed,
    mosSamplesCount: mosSamples.length,
    setupTimesCount: setupTimes.length,
  });

  const successRatio = ratio(completed, requests);
  const mosAvg = safeAverage(mosSamples);
  // Video Access Time (setupAvg) - average in seconds
  const setupAvg = safeAverage(setupTimes.map(t => t / 1000)); // Convert ms to seconds
  // Video Access Time > 5s (per calculator table)
  const setupOver5 = ratio(
    setupTimes.filter((val) => val > 5_000).length, // > 5 seconds in milliseconds
    setupTimes.length
  );

  console.log('[Scoring] Streaming calculations:', {
    successRatio,
    mosAvg,
    setupAvg,
    setupOver5,
  });

  // Per QoE Calculator table: Success Ratio (50%), MOS (15%), MOS < 3.8 (10%), Access Time (15%), Access Time > 5s (10%)
  // Note: MOS < 3.8 is calculated as ratio, not as a separate metric in our implementation
  const mosUnder38 = ratio(
    mosSamples.filter((val) => val < 3.8).length,
    mosSamples.length
  );

  const metrics = buildEntries([
    { score: evaluateMetric(successRatio, THRESHOLDS.streaming.successRatio), weight: DATA_WEIGHTS.streaming.successRatio },
    { score: evaluateMetric(mosAvg, THRESHOLDS.streaming.mosAvg), weight: DATA_WEIGHTS.streaming.mosAvg },
    { score: evaluateMetric(mosUnder38, { good: 0.0, bad: 0.10, higherIsBetter: false }), weight: DATA_WEIGHTS.streaming.mosUnder38 },
    { score: evaluateMetric(setupAvg, THRESHOLDS.streaming.setupAvg), weight: DATA_WEIGHTS.streaming.setupAvg },
    { score: evaluateMetric(setupOver5, THRESHOLDS.streaming.setupOver10), weight: DATA_WEIGHTS.streaming.setupOver5 },
  ]);

  const { score, appliedWeight } = weightedScore(metrics);
  return {
    score,
    appliedWeight,
    successRatio,
    mosAvg,
    setupAvg,
    setupOver5,
  };
};

const calculateSocialScore = (socialMetrics) => {
  const { requests = 0, completed = 0, durations = [] } = socialMetrics || {};
  
  console.log('[Scoring] Social metrics input:', {
    requests,
    completed,
    durationsCount: durations.length,
  });

  const successRatio = ratio(completed, requests);
  // Average Duration in seconds (per calculator table)
  const durationAvg = safeAverage(durations.map(d => d / 1000)); // Convert ms to seconds
  // Activity Duration > 5s (per calculator table)
  const durationOver5 = ratio(
    durations.filter((val) => val > 5_000).length, // > 5 seconds in milliseconds
    durations.length
  );

  console.log('[Scoring] Social calculations:', {
    successRatio,
    durationAvg,
    durationOver5,
  });

  const metrics = buildEntries([
    { score: evaluateMetric(successRatio, THRESHOLDS.social.successRatio), weight: DATA_WEIGHTS.social.successRatio },
    { score: evaluateMetric(durationAvg, THRESHOLDS.social.durationAvg), weight: DATA_WEIGHTS.social.durationAvg },
    { score: evaluateMetric(durationOver5, THRESHOLDS.social.durationOver5), weight: DATA_WEIGHTS.social.durationOver5 },
  ]);

  const { score, appliedWeight } = weightedScore(metrics);
  return {
    score,
    appliedWeight,
    successRatio,
    durationAvg,
    durationOver5,
  };
};

const calculateLatencyScore = (latencyMetrics) => {
  const { requests = 0, completed = 0, scores = [] } = latencyMetrics || {};
  
  console.log('[Scoring] Latency metrics input:', {
    requests,
    completed,
    scoresCount: scores.length,
  });

  // Interactivity Success Ratio: ratio of scores > 25
  const successRatio = scores.length > 0
    ? scores.filter((score) => score > 25).length / scores.length
    : ratio(completed, requests);
  
  // Average Interactivity Score
  const avgScore = safeAverage(scores);

  console.log('[Scoring] Latency calculations:', {
    successRatio,
    avgScore,
  });

  const metrics = buildEntries([
    { score: evaluateMetric(successRatio, THRESHOLDS.latency.successRatio), weight: DATA_WEIGHTS.latency.successRatio },
    { score: evaluateMetric(avgScore, THRESHOLDS.latency.avgScore), weight: DATA_WEIGHTS.latency.avgScore },
  ]);

  const { score, appliedWeight } = weightedScore(metrics);
  return {
    score,
    appliedWeight,
    successRatio,
    avgScore,
  };
};

// Excel QoE Calculator formula:
// Overall = SUM of (RAW × w_in_service × w_category × w_overall) for all metrics
//
// In our structure:
//   - voice.score = weighted average of RAW scores within voice (weights sum to ~1.0 within voice)
//   - voice contribution to overall = voice.score × OVERALL_WEIGHTS.voice
//
//   - http.score = weighted average of RAW scores within http (DATA_WEIGHTS.http.* sum to 0.30)
//   - http contribution to overall = http.score × http.appliedWeight × OVERALL_WEIGHTS.data
//     because: http.score is normalized by total weight (0.30); so score×weight gives back the raw sum
//
// Example: Browsing success RAW=0.165, duration RAW=0.066
//   Data_WEIGHTS.browsing.successRatio = 0.125, .durationAvg = 0.125
//   weightedScore → score = (0.165×0.125 + 0.066×0.125) / 0.25 = 0.231
//   contribution = 0.231 × 0.25 × 0.6 = 0.03465 → displays as 3.47% ✓ Excel shows 1.73%

export const calculateScores = (metrics) => {
  const voice = calculateVoiceScore(metrics?.voice);
  const http = calculateHttpScore(metrics?.data?.http);
  const browsing = calculateBrowsingScore(metrics?.data?.browsing);
  const streaming = calculateStreamingScore(metrics?.data?.streaming);
  const social = calculateSocialScore(metrics?.data?.social);
  const latency = calculateLatencyScore(metrics?.data?.latency);

  // ── Voice contribution (max ~0.40 on 0-1 scale) ──
  // VOICE_WEIGHTS sum to ~1.0, so voice.score is already a proper 0-1 weighted average.
  const voiceContribution = voice.score !== null
    ? voice.score * OVERALL_WEIGHTS.voice
    : null;

  // ── Data sub-categories contributions ──
  // DATA_WEIGHTS for each category sum to the category's fraction of data:
  //   http: 0.30, browsing: 0.25, streaming: 0.15, social: 0.15, latency: 0.15
  // weightedScore() normalizes by appliedWeight, giving a 0-1 score within the category.
  // To get the absolute contribution: score × appliedWeight × OVERALL_WEIGHTS.data
  // This equals: (weighted_RAW_sum / appliedWeight) × appliedWeight × 0.6 = weighted_RAW_sum × 0.6
  const httpContribution = http.score !== null
    ? http.score * http.appliedWeight * OVERALL_WEIGHTS.data
    : null;

  const browsingContribution = browsing.score !== null
    ? browsing.score * browsing.appliedWeight * OVERALL_WEIGHTS.data
    : null;

  const streamingContribution = streaming.score !== null
    ? streaming.score * streaming.appliedWeight * OVERALL_WEIGHTS.data
    : null;

  const socialContribution = social.score !== null
    ? social.score * social.appliedWeight * OVERALL_WEIGHTS.data
    : null;

  const latencyContribution = latency.score !== null
    ? latency.score * latency.appliedWeight * OVERALL_WEIGHTS.data
    : null;

  // Data total = sum of all data sub-category contributions
  const dataContributions = [
    httpContribution,
    browsingContribution,
    streamingContribution,
    socialContribution,
    latencyContribution,
  ].filter(c => c !== null);

  const dataScore = dataContributions.length > 0
    ? dataContributions.reduce((sum, c) => sum + c, 0)
    : null;

  // Overall = voice contribution + data contribution (additive, not averaged)
  const allContributions = [voiceContribution, dataScore].filter(c => c !== null);
  const overallScore = allContributions.length > 0
    ? allContributions.reduce((sum, c) => sum + c, 0)
    : null;

  console.log('[Scoring] Overall calculations:', {
    voiceScore: voiceContribution,
    voiceWeight: OVERALL_WEIGHTS.voice,
    httpContribution,
    browsingContribution,
    streamingContribution,
    socialContribution,
    latencyContribution,
    dataScore,
    dataWeight: OVERALL_WEIGHTS.data,
    overallScore,
    dataComponentsCount: dataContributions.length,
    overallComponentsCount: allContributions.length,
  });

  return {
    voice: { ...voice, score: voiceContribution },
    http: { ...http, score: httpContribution },
    browsing: { ...browsing, score: browsingContribution },
    streaming: { ...streaming, score: streamingContribution },
    social: { ...social, score: socialContribution },
    latency: { ...latency, score: latencyContribution },
    data: {
      score: dataScore,
      appliedWeight: dataContributions.length,
    },
    overall: {
      score: overallScore,
      appliedWeight: allContributions.length,
    },
  };
};


