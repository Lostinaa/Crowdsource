// Voice weights per QoE Calculator table (25% + 25% + 15% + 10% + 15% + 10% = 100%)
export const VOICE_WEIGHTS = {
  cssr: 0.25,        // Call Setup Success Ratio: 25% of voice
  cdr: 0.25,         // Call Drop Ratio: 25% of voice
  mosAvg: 0.15,      // MOS: 15% of voice
  mosUnder16: 0.10,  // MOS < 1.6: 10% of voice
  cstAvg: 0.15,      // Call Setup Time [s]: 15% of voice
  cstOver15: 0.10,   // Call Setup Time > 10s: 10% of voice (using >15s threshold)
  cstP10: 0.0,       // Not in calculator table
  mosP90: 0.0,       // Not in calculator table
};

export const DATA_WEIGHTS = {
  // Data Testing (HTTP/FTP) - 30% of data component
  http: {
    successRatio: 0.03,      // 10% of 30% = 3% of data
    dlAvg: 0.042,            // 14% of 30% = 4.2% of data
    dlP10: 0.054,            // 18% of 30% = 5.4% of data
    dlP90: 0.024,            // 8% of 30% = 2.4% of data
    ulAvg: 0.042,            // 14% of 30% = 4.2% of data
    ulP10: 0.054,            // 18% of 30% = 5.4% of data
    ulP90: 0.024,            // 8% of 30% = 2.4% of data
  }, // sums to 0.30 (30% of data)
  // Browsing - 25% of data component
  browsing: {
    successRatio: 0.125,     // 50% of 25% = 12.5% of data
    durationAvg: 0.125,      // 50% of 25% = 12.5% of data
  }, // sums to 0.25 (25% of data)
  // Video Streaming - 15% of data component
  streaming: {
    successRatio: 0.075,     // 50% of 15% = 7.5% of data
    mosAvg: 0.0225,           // 15% of 15% = 2.25% of data (Video Quality MOS)
    mosUnder38: 0.015,        // 10% of 15% = 1.5% of data (Video MOS < 3.8)
    setupAvg: 0.0225,         // 15% of 15% = 2.25% of data (Video Access Time [s])
    setupOver5: 0.015,        // 10% of 15% = 1.5% of data (Video Access Time > 5s)
  }, // sums to 0.15 (15% of data)
  // Social Media - 15% of data component
  social: {
    successRatio: 0.075,     // 50% of 15% = 7.5% of data
    durationAvg: 0.045,      // 30% of 15% = 4.5% of data
    durationOver5: 0.03,     // 20% of 15% = 3% of data (Activity Duration > 5s)
  }, // sums to 0.15 (15% of data)
  // Latency and Interactivity - 15% of data component
  latency: {
    successRatio: 0.075,     // 50% of 15% = 7.5% of data
    avgScore: 0.075,         // 50% of 15% = 7.5% of data
  }, // sums to 0.15 (15% of data)
};

export const OVERALL_WEIGHTS = {
  voice: 0.4,
  data: 0.6,
};

export const THRESHOLDS = {
  voice: {
    cssr: { good: 1.0, bad: 0.85, higherIsBetter: true },
    cdr: { good: 0.0, bad: 0.1, higherIsBetter: false },
    cstAvg: { good: 4.5, bad: 12, higherIsBetter: false },
    cstOver15: { good: 0.0, bad: 0.03, higherIsBetter: false },
    cstP10: { good: 4.0, bad: 8.0, higherIsBetter: false },
    mosAvg: { good: 4.3, bad: 2.0, higherIsBetter: true },
    mosUnder16: { good: 0.0, bad: 0.10, higherIsBetter: false },
    mosP90: { good: 4.75, bad: 4.0, higherIsBetter: true },
  },
  http: {
    successRatio: { good: 1.0, bad: 0.8, higherIsBetter: true },
    dlAvg: { good: 100, bad: 1, higherIsBetter: true },
    dlP10: { good: 40, bad: 1, higherIsBetter: true },
    dlP90: { good: 240, bad: 10, higherIsBetter: true },
    ulAvg: { good: 50, bad: 0.5, higherIsBetter: true },
    ulP10: { good: 30, bad: 0.5, higherIsBetter: true },
    ulP90: { good: 100, bad: 5, higherIsBetter: true },
  },
  browsing: {
    successRatio: { good: 1.0, bad: 0.8, higherIsBetter: true }, // Activity Success Ratio: 80% bad, 100% good
    durationAvg: { good: 0.0, bad: 3.0, higherIsBetter: false }, // Average Duration [s]: 3 bad, 0 good
    durationOver6: { good: 0.0, bad: 0.15, higherIsBetter: false }, // Not in calculator, keeping for compatibility
  },
  streaming: {
    successRatio: { good: 1.0, bad: 0.8, higherIsBetter: true }, // 80% bad, 100% good
    mosAvg: { good: 5.0, bad: 3.5, higherIsBetter: true }, // Video Quality MOS: 3.5 bad, 5 good
    mosP10: { good: 4.0, bad: 2.0, higherIsBetter: true }, // Not in calculator, keeping for compatibility
    setupAvg: { good: 0.0, bad: 5.0, higherIsBetter: false }, // Video Access Time [s]: 5 bad, 0 good
    setupOver10: { good: 0.0, bad: 0.10, higherIsBetter: false }, // Video Access Time > 5s: 10% bad, 0% good
  },
  social: {
    successRatio: { good: 1.0, bad: 0.8, higherIsBetter: true }, // Activity Success Ratio (upload duration < 15s): 80% bad, 100% good
    durationAvg: { good: 0.0, bad: 5.0, higherIsBetter: false }, // Average Duration [s]: 5 bad, 0 good
    durationOver5: { good: 0.0, bad: 0.10, higherIsBetter: false }, // Activity Duration > 5s: 10% bad, 0% good
  },
  latency: {
    successRatio: { good: 1.0, bad: 0.8, higherIsBetter: true }, // Interactivity Success Ratio (Score > 25)
    avgScore: { good: 100, bad: 25, higherIsBetter: true }, // Average Interactivity Score
  },
};


