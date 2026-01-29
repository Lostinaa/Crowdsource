/**
 * Unit Tests for QoE Scoring Engine
 * Tests the scoring calculations match FRS specifications
 */

import { calculateScores } from '../utils/scoring';
import {
    safeAverage,
    percentile,
    ratio,
    scoreLinear,
    weightedScore
} from '../utils/math';
import { VOICE_WEIGHTS, DATA_WEIGHTS, OVERALL_WEIGHTS } from '../constants/scoring';

// ============================================================================
// Math Utility Tests
// ============================================================================

describe('Math Utilities', () => {
    describe('safeAverage', () => {
        test('returns null for empty array', () => {
            expect(safeAverage([])).toBeNull();
        });

        test('returns null for undefined', () => {
            expect(safeAverage(undefined)).toBeNull();
        });

        test('calculates average correctly', () => {
            expect(safeAverage([10, 20, 30])).toBe(20);
        });

        test('handles single value', () => {
            expect(safeAverage([42])).toBe(42);
        });

        test('handles decimal values', () => {
            expect(safeAverage([1.5, 2.5, 3.0])).toBeCloseTo(2.333, 2);
        });
    });

    describe('percentile', () => {
        test('returns null for empty array', () => {
            expect(percentile([], 0.5)).toBeNull();
        });

        test('calculates 10th percentile', () => {
            const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            expect(percentile(values, 0.1)).toBeCloseTo(1.9, 1);
        });

        test('calculates 50th percentile (median)', () => {
            const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            expect(percentile(values, 0.5)).toBeCloseTo(5.5, 1);
        });

        test('calculates 90th percentile', () => {
            const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            expect(percentile(values, 0.9)).toBeCloseTo(9.1, 1);
        });

        test('handles unsorted input', () => {
            const values = [5, 1, 9, 3, 7, 2, 8, 4, 6, 10];
            expect(percentile(values, 0.5)).toBeCloseTo(5.5, 1);
        });
    });

    describe('ratio', () => {
        test('returns null for zero denominator', () => {
            expect(ratio(5, 0)).toBeNull();
        });

        test('returns null for undefined denominator', () => {
            expect(ratio(5, undefined)).toBeNull();
        });

        test('calculates ratio correctly', () => {
            expect(ratio(3, 4)).toBe(0.75);
        });

        test('handles zero numerator', () => {
            expect(ratio(0, 10)).toBe(0);
        });

        test('returns 1 for equal values', () => {
            expect(ratio(5, 5)).toBe(1);
        });
    });

    describe('scoreLinear', () => {
        test('returns null for null value', () => {
            expect(scoreLinear(null, 100, 0, true)).toBeNull();
        });

        test('returns 1 for value at good threshold (higher is better)', () => {
            expect(scoreLinear(100, 100, 0, true)).toBe(1);
        });

        test('returns 0 for value at bad threshold (higher is better)', () => {
            expect(scoreLinear(0, 100, 0, true)).toBe(0);
        });

        test('returns 0.5 for midpoint value (higher is better)', () => {
            expect(scoreLinear(50, 100, 0, true)).toBe(0.5);
        });

        test('returns 1 for value at good threshold (lower is better)', () => {
            expect(scoreLinear(0, 0, 100, false)).toBe(1);
        });

        test('returns 0 for value at bad threshold (lower is better)', () => {
            expect(scoreLinear(100, 0, 100, false)).toBe(0);
        });

        test('returns 0.5 for midpoint value (lower is better)', () => {
            expect(scoreLinear(50, 0, 100, false)).toBe(0.5);
        });

        test('clamps to 1 for values beyond good threshold', () => {
            expect(scoreLinear(150, 100, 0, true)).toBe(1);
        });

        test('clamps to 0 for values beyond bad threshold', () => {
            expect(scoreLinear(-50, 100, 0, true)).toBe(0);
        });
    });

    describe('weightedScore', () => {
        test('returns null score for empty entries', () => {
            const result = weightedScore([]);
            expect(result.score).toBeNull();
            expect(result.appliedWeight).toBe(0);
        });

        test('calculates weighted score correctly', () => {
            const entries = [
                { weight: 0.5, score: 0.8 },
                { weight: 0.5, score: 0.6 },
            ];
            const result = weightedScore(entries);
            expect(result.score).toBe(0.7);
            expect(result.appliedWeight).toBe(1);
        });

        test('handles unequal weights', () => {
            const entries = [
                { weight: 0.75, score: 1.0 },
                { weight: 0.25, score: 0.0 },
            ];
            const result = weightedScore(entries);
            expect(result.score).toBe(0.75);
        });
    });
});

// ============================================================================
// Weight Configuration Tests
// ============================================================================

describe('Weight Configuration', () => {
    test('voice weights sum to 1.0', () => {
        const sum = Object.values(VOICE_WEIGHTS).reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1.0, 2);
    });

    test('overall weights sum to 1.0', () => {
        const sum = OVERALL_WEIGHTS.voice + OVERALL_WEIGHTS.data;
        expect(sum).toBe(1.0);
    });

    test('overall weights match FRS (40% voice, 60% data)', () => {
        expect(OVERALL_WEIGHTS.voice).toBe(0.4);
        expect(OVERALL_WEIGHTS.data).toBe(0.6);
    });

    test('data component weights sum correctly', () => {
        // HTTP: ~27% (weights include success ratio for both DL and UL)
        const httpSum = Object.values(DATA_WEIGHTS.http).reduce((a, b) => a + b, 0);
        expect(httpSum).toBeGreaterThan(0.2);
        expect(httpSum).toBeLessThan(0.35);

        // Browsing: 25%
        const browsingSum = Object.values(DATA_WEIGHTS.browsing).reduce((a, b) => a + b, 0);
        expect(browsingSum).toBeCloseTo(0.25, 2);

        // Streaming: 15%
        const streamingSum = Object.values(DATA_WEIGHTS.streaming).reduce((a, b) => a + b, 0);
        expect(streamingSum).toBeCloseTo(0.15, 2);

        // Social: 15%
        const socialSum = Object.values(DATA_WEIGHTS.social).reduce((a, b) => a + b, 0);
        expect(socialSum).toBeCloseTo(0.15, 2);

        // Latency: 15%
        const latencySum = Object.values(DATA_WEIGHTS.latency).reduce((a, b) => a + b, 0);
        expect(latencySum).toBeCloseTo(0.15, 2);
    });
});

// ============================================================================
// Voice Scoring Tests
// ============================================================================

describe('Voice Scoring', () => {
    test('returns null scores for empty metrics', () => {
        const result = calculateScores({ voice: {} });
        expect(result.voice.score).toBeNull();
        expect(result.voice.appliedWeight).toBe(0);
    });

    test('calculates perfect voice score', () => {
        const metrics = {
            voice: {
                attempts: 100,
                setupOk: 100,      // 100% CSSR
                completed: 100,
                dropped: 0,         // 0% CDR
                setupTimes: Array(10).fill(3000),  // 3s average (good)
                mosSamples: Array(10).fill(4.5),   // 4.5 MOS (good)
            },
        };
        const result = calculateScores(metrics);
        // Score is ~0.85 due to setup time threshold (3s is between good/bad range)
        expect(result.voice.score).toBeGreaterThan(0.8);
        expect(result.voice.cssr).toBe(1.0);
        expect(result.voice.cdr).toBe(0);
    });

    test('calculates poor voice score for high drop rate', () => {
        const metrics = {
            voice: {
                attempts: 100,
                setupOk: 100,
                completed: 50,
                dropped: 50,        // 50% CDR (very bad)
                setupTimes: Array(10).fill(3000),
                mosSamples: Array(10).fill(4.0),
            },
        };
        const result = calculateScores(metrics);
        expect(result.voice.cdr).toBe(0.5);
        expect(result.voice.score).toBeLessThan(0.8);
    });

    test('handles MOS below 1.6 threshold', () => {
        const metrics = {
            voice: {
                attempts: 10,
                setupOk: 10,
                completed: 10,
                dropped: 0,
                setupTimes: Array(10).fill(3000),
                mosSamples: [1.5, 1.5, 1.5, 4.0, 4.0, 4.0, 4.0, 4.0, 4.0, 4.0], // 30% below 1.6
            },
        };
        const result = calculateScores(metrics);
        expect(result.voice.mosUnder16).toBe(0.3);
    });

    test('handles call setup time > 10s threshold', () => {
        const metrics = {
            voice: {
                attempts: 10,
                setupOk: 10,
                completed: 10,
                dropped: 0,
                setupTimes: [11000, 11000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000], // 20% over 10s
                mosSamples: Array(10).fill(4.0),
            },
        };
        const result = calculateScores(metrics);
        expect(result.voice.cstOver15).toBe(0.2);
    });
});

// ============================================================================
// Data Scoring Tests
// ============================================================================

describe('Data Scoring', () => {
    describe('HTTP/FTP Scoring', () => {
        test('calculates HTTP download score', () => {
            const metrics = {
                data: {
                    http: {
                        dl: {
                            requests: 10,
                            completed: 10,
                            throughputs: Array(10).fill(100000), // 100 Mbps
                        },
                        ul: {
                            requests: 10,
                            completed: 10,
                            throughputs: Array(10).fill(50000), // 50 Mbps
                        },
                    },
                },
            };
            const result = calculateScores(metrics);
            expect(result.http.dlSuccess).toBe(1.0);
            expect(result.http.ulSuccess).toBe(1.0);
            expect(result.http.score).toBeGreaterThan(0.8);
        });
    });

    describe('Browsing Scoring', () => {
        test('calculates browsing score with fast durations', () => {
            const metrics = {
                data: {
                    browsing: {
                        requests: 10,
                        completed: 10,
                        durations: Array(10).fill(500), // 0.5s average (very fast)
                    },
                },
            };
            const result = calculateScores(metrics);
            expect(result.browsing.successRatio).toBe(1.0);
            expect(result.browsing.durationAvg).toBe(0.5);
            expect(result.browsing.score).toBeGreaterThan(0.9);
        });

        test('penalizes slow browsing durations', () => {
            const metrics = {
                data: {
                    browsing: {
                        requests: 10,
                        completed: 10,
                        durations: Array(10).fill(5000), // 5s average (slow)
                    },
                },
            };
            const result = calculateScores(metrics);
            expect(result.browsing.durationAvg).toBe(5);
            expect(result.browsing.score).toBeLessThan(0.7);
        });
    });

    describe('Streaming Scoring', () => {
        test('calculates streaming score with good MOS', () => {
            const metrics = {
                data: {
                    streaming: {
                        requests: 10,
                        completed: 10,
                        mosSamples: Array(10).fill(4.5),
                        setupTimes: Array(10).fill(1000), // 1s setup
                    },
                },
            };
            const result = calculateScores(metrics);
            expect(result.streaming.successRatio).toBe(1.0);
            expect(result.streaming.score).toBeGreaterThan(0.8);
        });
    });

    describe('Latency Scoring', () => {
        test('calculates latency score with good interactivity', () => {
            const metrics = {
                data: {
                    latency: {
                        requests: 10,
                        completed: 10,
                        scores: Array(10).fill(85), // 85 average score
                    },
                },
            };
            const result = calculateScores(metrics);
            expect(result.latency.successRatio).toBe(1.0); // All > 25
            expect(result.latency.avgScore).toBe(85);
            expect(result.latency.score).toBeGreaterThan(0.7);
        });

        test('penalizes low interactivity scores', () => {
            const metrics = {
                data: {
                    latency: {
                        requests: 10,
                        completed: 10,
                        scores: [20, 20, 20, 30, 30, 30, 30, 30, 30, 30], // 30% below 25
                    },
                },
            };
            const result = calculateScores(metrics);
            expect(result.latency.successRatio).toBe(0.7); // 70% above 25
        });
    });

    describe('Social Media Scoring', () => {
        test('calculates social media score', () => {
            const metrics = {
                data: {
                    social: {
                        requests: 10,
                        completed: 10,
                        durations: Array(10).fill(2000), // 2s average
                    },
                },
            };
            const result = calculateScores(metrics);
            expect(result.social.successRatio).toBe(1.0);
            expect(result.social.durationAvg).toBe(2);
            expect(result.social.score).toBeGreaterThan(0.5);
        });
    });
});

// ============================================================================
// Overall Score Tests
// ============================================================================

describe('Overall Score Calculation', () => {
    test('combines voice and data scores with correct weights', () => {
        const metrics = {
            voice: {
                attempts: 10,
                setupOk: 10,
                completed: 10,
                dropped: 0,
                setupTimes: Array(10).fill(3000),
                mosSamples: Array(10).fill(4.5),
            },
            data: {
                browsing: {
                    requests: 10,
                    completed: 10,
                    durations: Array(10).fill(500),
                },
            },
        };
        const result = calculateScores(metrics);

        expect(result.overall.score).not.toBeNull();
        expect(result.overall.score).toBeGreaterThan(0);
        expect(result.overall.score).toBeLessThanOrEqual(1);
    });

    test('handles voice-only metrics', () => {
        const metrics = {
            voice: {
                attempts: 10,
                setupOk: 10,
                completed: 10,
                dropped: 0,
                setupTimes: Array(10).fill(3000),
                mosSamples: Array(10).fill(4.5),
            },
        };
        const result = calculateScores(metrics);
        expect(result.voice.score).not.toBeNull();
        expect(result.data.score).toBeNull();
    });

    test('handles data-only metrics', () => {
        const metrics = {
            data: {
                browsing: {
                    requests: 10,
                    completed: 10,
                    durations: Array(10).fill(500),
                },
            },
        };
        const result = calculateScores(metrics);
        expect(result.voice.score).toBeNull();
        expect(result.data.score).not.toBeNull();
    });

    test('returns null overall for empty metrics', () => {
        const result = calculateScores({});
        expect(result.overall.score).toBeNull();
        expect(result.overall.appliedWeight).toBe(0);
    });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
    test('handles undefined metrics gracefully', () => {
        expect(() => calculateScores(undefined)).not.toThrow();
        expect(() => calculateScores(null)).not.toThrow();
    });

    test('handles partial voice metrics', () => {
        const metrics = {
            voice: {
                attempts: 5,
                setupOk: 4,
                // Missing completed, dropped, etc.
            },
        };
        expect(() => calculateScores(metrics)).not.toThrow();
        const result = calculateScores(metrics);
        expect(result.voice.cssr).toBe(0.8);
    });

    test('handles empty arrays', () => {
        const metrics = {
            voice: {
                attempts: 10,
                setupOk: 10,
                completed: 10,
                dropped: 0,
                setupTimes: [],
                mosSamples: [],
            },
        };
        expect(() => calculateScores(metrics)).not.toThrow();
        const result = calculateScores(metrics);
        expect(result.voice.cstAvg).toBeNull();
        expect(result.voice.mosAvg).toBeNull();
    });

    test('handles negative values gracefully', () => {
        const metrics = {
            voice: {
                attempts: 10,
                setupOk: 10,
                completed: 10,
                dropped: 0,
                setupTimes: [-1000, 2000, 3000],
                mosSamples: [4.0, 4.5, 4.2],
            },
        };
        expect(() => calculateScores(metrics)).not.toThrow();
    });
});
