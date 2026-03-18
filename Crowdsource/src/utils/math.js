export const safeAverage = (values = []) => {
  if (!values?.length) return null;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
};

export const percentile = (values = [], percentileValue) => {
  if (!values?.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * percentileValue;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) {
    return sorted[lower];
  }
  const fraction = idx - lower;
  return sorted[lower] + (sorted[upper] - sorted[lower]) * fraction;
};

export const ratio = (numerator, denominator) => {
  if (!denominator || denominator === 0) return null;
  return numerator / denominator;
};

export const scoreLinear = (value, good, bad, higherIsBetter = true) => {
  if (value === null || value === undefined) return null;
  // QoE Calculator formula: RAW = MIN((result - bad) / (good - bad) * 100, 100)
  // Allows negative scores when value is worse than 'bad' threshold
  // Caps at 100 (1.0) when value meets or exceeds 'good' threshold

  if (higherIsBetter) {
    if (value >= good) return 1;
    // No lower clamp — allows negative scores per QoE Calculator
    return (value - bad) / (good - bad);
  }

  if (value <= good) return 1;
  // No lower clamp — allows negative scores per QoE Calculator
  return (bad - value) / (bad - good);
};

export const weightedScore = (entries = []) => {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (!totalWeight) return { score: null, appliedWeight: 0 };

  const scoreSum = entries.reduce(
    (sum, entry) => sum + entry.score * entry.weight,
    0
  );
  return { score: scoreSum / totalWeight, appliedWeight: totalWeight };
};


