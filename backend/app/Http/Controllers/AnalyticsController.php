<?php

namespace App\Http\Controllers;

use App\Models\QoeMetric;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\AuditLogService;

class AnalyticsController extends Controller
{
    /**
     * Get analytics overview
     */
    public function overview(Request $request): JsonResponse
    {
        AuditLogService::log('viewed', null, null, null, "Analytics overview accessed");

        $query = QoeMetric::query();

        // Apply filters
        if ($request->user()) {
            $query->where('user_id', $request->user()->id);
        }

        if ($request->has('start_date')) {
            $query->where('timestamp', '>=', $request->input('start_date'));
        }
        if ($request->has('end_date')) {
            $query->where('timestamp', '<=', $request->input('end_date'));
        }

        $metrics = $query->get();

        // Calculate aggregated statistics
        $overview = [
            'total_records' => $metrics->count(),
            'date_range' => [
                'start' => $metrics->min('timestamp'),
                'end' => $metrics->max('timestamp'),
            ],
            'average_scores' => [
                'overall' => $metrics->avg(function ($m) {
                    $v = $m->scores['overall'] ?? null;
                    return is_array($v) ? ($v['score'] ?? null) : (is_numeric($v) ? $v : null);
                }),
                'voice' => $metrics->avg(function ($m) {
                    $v = $m->scores['voice'] ?? null;
                    return is_array($v) ? ($v['score'] ?? null) : (is_numeric($v) ? $v : null);
                }),
                'data' => $metrics->avg(function ($m) {
                    $v = $m->scores['data'] ?? null;
                    return is_array($v) ? ($v['score'] ?? null) : (is_numeric($v) ? $v : null);
                }),
                'browsing' => $metrics->avg(function ($m) {
                    $v = $m->scores['browsing'] ?? null;
                    return is_array($v) ? ($v['score'] ?? null) : (is_numeric($v) ? $v : null);
                }),
                'streaming' => $metrics->avg(function ($m) {
                    $v = $m->scores['streaming'] ?? null;
                    return is_array($v) ? ($v['score'] ?? null) : (is_numeric($v) ? $v : null);
                }),
            ],
            'platform_distribution' => $this->getPlatformDistribution($metrics),
            'region_distribution' => $this->getRegionDistribution($metrics),
        ];

        return response()->json([
            'success' => true,
            'data' => $overview,
        ]);
    }

    /**
     * Get voice analytics
     */
    public function voice(Request $request): JsonResponse
    {
        AuditLogService::log('viewed', null, null, null, "Voice analytics accessed");

        $query = QoeMetric::query();

        if ($request->user()) {
            $query->where('user_id', $request->user()->id);
        }
        if ($request->has('start_date')) {
            $query->where('timestamp', '>=', $request->input('start_date'));
        }
        if ($request->has('end_date')) {
            $query->where('timestamp', '<=', $request->input('end_date'));
        }
        if ($request->has('region') && $request->input('region')) {
            $query->where('region', $request->input('region'));
        }

        $metrics = $query->get();

        $totalAttempts = $metrics->sum(function ($m) {
            return $m->metrics['voice']['attempts'] ?? 0;
        });
        $totalCompleted = $metrics->sum(function ($m) {
            return $m->metrics['voice']['completed'] ?? 0;
        });
        $totalDropped = $metrics->sum(function ($m) {
            return $m->metrics['voice']['dropped'] ?? 0;
        });
        $totalSetupOk = $metrics->sum(function ($m) {
            return $m->metrics['voice']['setupOk'] ?? 0;
        });

        // Get all MOS samples and setup times for threshold calculations
        $allMosSamples = $this->getAllValuesFromNested($metrics, 'voice.mosSamples');
        $allSetupTimes = $this->getAllValuesFromNested($metrics, 'voice.setupTimes');

        $voiceData = [
            'total_attempts' => $totalAttempts,
            'total_completed' => $totalCompleted,
            'total_dropped' => $totalDropped,
            'total_setup_ok' => $totalSetupOk,
            'average_setup_time' => $this->calculateAverageFromNested($metrics, 'voice.setupTimes'),
            'average_mos' => $this->calculateAverageFromNested($metrics, 'voice.mosSamples'),
            'cssr' => $totalAttempts > 0 ? ($totalSetupOk / $totalAttempts) * 100 : null, // Percentage
            'cdr' => ($totalCompleted + $totalDropped) > 0 ? ($totalDropped / ($totalCompleted + $totalDropped)) * 100 : null, // Percentage
            // Threshold-based metrics
            'mos_under_1_6_percentage' => $allMosSamples->count() > 0
                ? ($allMosSamples->filter(fn($v) => $v < 1.6)->count() / $allMosSamples->count()) * 100
                : null,
            'setup_time_over_10s_percentage' => $allSetupTimes->count() > 0
                ? ($allSetupTimes->filter(fn($v) => $v > 10000)->count() / $allSetupTimes->count()) * 100
                : null,
        ];

        return response()->json([
            'success' => true,
            'data' => $voiceData,
        ]);
    }

    /**
     * Get data analytics
     */
    public function data(Request $request): JsonResponse
    {
        AuditLogService::log('viewed', null, null, null, "Data analytics accessed");

        $query = QoeMetric::query();

        if ($request->user()) {
            $query->where('user_id', $request->user()->id);
        }
        if ($request->has('start_date')) {
            $query->where('timestamp', '>=', $request->input('start_date'));
        }
        if ($request->has('end_date')) {
            $query->where('timestamp', '<=', $request->input('end_date'));
        }
        if ($request->has('region') && $request->input('region')) {
            $query->where('region', $request->input('region'));
        }

        $metrics = $query->get();

        // Browsing analytics
        $browsingRequests = $metrics->sum(fn($m) => $m->metrics['data']['browsing']['requests'] ?? 0);
        $browsingCompleted = $metrics->sum(fn($m) => $m->metrics['data']['browsing']['completed'] ?? 0);
        $browsingDurations = $this->getAllValuesFromNested($metrics, 'data.browsing.durations');

        // Streaming analytics
        $streamingRequests = $metrics->sum(fn($m) => $m->metrics['data']['streaming']['requests'] ?? 0);
        $streamingCompleted = $metrics->sum(fn($m) => $m->metrics['data']['streaming']['completed'] ?? 0);
        $streamingMosSamples = $this->getAllValuesFromNested($metrics, 'data.streaming.mosSamples');
        $streamingSetupTimes = $this->getAllValuesFromNested($metrics, 'data.streaming.setupTimes');
        $streamingResolutions = $this->getAllValuesFromNested($metrics, 'data.streaming.resolutions');
        $streamingResolutionScores = $this->getAllValuesFromNested($metrics, 'data.streaming.resolutionScores');

        // Resolution score mapping: 2160p/1440p/1080p→5, 720p→4, 480p→3, 360p→2, 240p→1
        $resolutionScoreMap = [
            '2160p (4K)' => 5,
            '1440p (2K)' => 5,
            '1080p (Full HD)' => 5,
            '1080p' => 5,
            '720p (HD)' => 4,
            'HD (720p)' => 4,
            '720p' => 4,
            '480p (SD)' => 3,
            'SD (480p)' => 3,
            '480p' => 3,
            '360p' => 2,
            '240p' => 1,
        ];
        // Calculate avg resolution score from stored resolutionScores or map from resolution strings
        $resolvedScores = $streamingResolutionScores->count() > 0
            ? $streamingResolutionScores
            : $streamingResolutions->map(fn($r) => $resolutionScoreMap[$r] ?? 2);
        $avgResolutionScore = $resolvedScores->count() > 0 ? $resolvedScores->avg() : null;

        // Resolution distribution
        $resolutionDistribution = $streamingResolutions->count() > 0
            ? $streamingResolutions->countBy()->map(function ($count) use ($streamingResolutions) {
                return round(($count / $streamingResolutions->count()) * 100, 1);
            })->toArray()
            : [];

        // HTTP Download analytics
        $httpDlRequests = $metrics->sum(fn($m) => $m->metrics['data']['http']['dl']['requests'] ?? 0);
        $httpDlCompleted = $metrics->sum(fn($m) => $m->metrics['data']['http']['dl']['completed'] ?? 0);
        $httpDlThroughputs = $this->getAllValuesFromNested($metrics, 'data.http.dl.throughputs');

        // HTTP Upload analytics
        $httpUlRequests = $metrics->sum(fn($m) => $m->metrics['data']['http']['ul']['requests'] ?? 0);
        $httpUlCompleted = $metrics->sum(fn($m) => $m->metrics['data']['http']['ul']['completed'] ?? 0);
        $httpUlThroughputs = $this->getAllValuesFromNested($metrics, 'data.http.ul.throughputs');

        // FTP analytics (throughputs stored as Kbps, convert to Mbps for consistency with HTTP)
        $ftpDlRequests = $metrics->sum(fn($m) => $m->metrics['data']['ftp']['dl']['requests'] ?? 0);
        $ftpDlCompleted = $metrics->sum(fn($m) => $m->metrics['data']['ftp']['dl']['completed'] ?? 0);
        $ftpDlThroughputs = $this->getAllValuesFromNested($metrics, 'data.ftp.dl.throughputs')
            ->map(fn($v) => $v / 1000);
        $ftpUlRequests = $metrics->sum(fn($m) => $m->metrics['data']['ftp']['ul']['requests'] ?? 0);
        $ftpUlCompleted = $metrics->sum(fn($m) => $m->metrics['data']['ftp']['ul']['completed'] ?? 0);
        $ftpUlThroughputs = $this->getAllValuesFromNested($metrics, 'data.ftp.ul.throughputs')
            ->map(fn($v) => $v / 1000);

        // Social analytics
        $socialRequests = $metrics->sum(fn($m) => $m->metrics['data']['social']['requests'] ?? 0);
        $socialCompleted = $metrics->sum(fn($m) => $m->metrics['data']['social']['completed'] ?? 0);
        $socialDurations = $this->getAllValuesFromNested($metrics, 'data.social.durations');

        // Latency analytics
        $latencyRequests = $metrics->sum(fn($m) => $m->metrics['data']['latency']['requests'] ?? 0);
        $latencyCompleted = $metrics->sum(fn($m) => $m->metrics['data']['latency']['completed'] ?? 0);
        $latencyScores = $this->getAllValuesFromNested($metrics, 'data.latency.scores');

        $dataAnalytics = [
            'browsing' => [
                'total_requests' => $browsingRequests,
                'total_completed' => $browsingCompleted,
                'success_ratio' => $browsingRequests > 0 ? ($browsingCompleted / $browsingRequests) * 100 : null,
                'average_duration' => $browsingDurations->count() > 0 ? $browsingDurations->avg() : null,
            ],
            'streaming' => [
                'total_requests' => $streamingRequests,
                'total_completed' => $streamingCompleted,
                'success_ratio' => $streamingRequests > 0 ? ($streamingCompleted / $streamingRequests) * 100 : null,
                'average_mos' => $streamingMosSamples->count() > 0 ? $streamingMosSamples->avg() : null,
                'average_setup_time' => $streamingSetupTimes->count() > 0 ? $streamingSetupTimes->avg() : null,
                'mos_under_3_8_percentage' => $streamingMosSamples->count() > 0
                    ? ($streamingMosSamples->filter(fn($v) => $v < 3.8)->count() / $streamingMosSamples->count()) * 100
                    : null,
                'setup_time_over_5s_percentage' => $streamingSetupTimes->count() > 0
                    ? ($streamingSetupTimes->filter(fn($v) => $v > 5000)->count() / $streamingSetupTimes->count()) * 100
                    : null,
                'average_resolution_score' => $avgResolutionScore,
                'resolution_distribution' => $resolutionDistribution,
            ],
            'http' => [
                'download' => [
                    'total_requests' => $httpDlRequests,
                    'total_completed' => $httpDlCompleted,
                    'success_ratio' => $httpDlRequests > 0 ? ($httpDlCompleted / $httpDlRequests) * 100 : null,
                    'average_throughput' => $httpDlThroughputs->count() > 0 ? $httpDlThroughputs->avg() : null,
                    'percentile_10th' => $this->calculatePercentile($httpDlThroughputs, 10),
                    'percentile_90th' => $this->calculatePercentile($httpDlThroughputs, 90),
                ],
                'upload' => [
                    'total_requests' => $httpUlRequests,
                    'total_completed' => $httpUlCompleted,
                    'success_ratio' => $httpUlRequests > 0 ? ($httpUlCompleted / $httpUlRequests) * 100 : null,
                    'average_throughput' => $httpUlThroughputs->count() > 0 ? $httpUlThroughputs->avg() : null,
                    'percentile_10th' => $this->calculatePercentile($httpUlThroughputs, 10),
                    'percentile_90th' => $this->calculatePercentile($httpUlThroughputs, 90),
                ],
            ],
            'ftp' => [
                'download' => [
                    'total_requests' => $ftpDlRequests,
                    'total_completed' => $ftpDlCompleted,
                    'success_ratio' => $ftpDlRequests > 0 ? ($ftpDlCompleted / $ftpDlRequests) * 100 : null,
                    'average_throughput' => $ftpDlThroughputs->count() > 0 ? $ftpDlThroughputs->avg() : null,
                    'percentile_10th' => $this->calculatePercentile($ftpDlThroughputs, 10),
                    'percentile_90th' => $this->calculatePercentile($ftpDlThroughputs, 90),
                ],
                'upload' => [
                    'total_requests' => $ftpUlRequests,
                    'total_completed' => $ftpUlCompleted,
                    'success_ratio' => $ftpUlRequests > 0 ? ($ftpUlCompleted / $ftpUlRequests) * 100 : null,
                    'average_throughput' => $ftpUlThroughputs->count() > 0 ? $ftpUlThroughputs->avg() : null,
                    'percentile_10th' => $this->calculatePercentile($ftpUlThroughputs, 10),
                    'percentile_90th' => $this->calculatePercentile($ftpUlThroughputs, 90),
                ],
            ],
            'social' => [
                'total_requests' => $socialRequests,
                'total_completed' => $socialCompleted,
                'success_ratio' => $socialRequests > 0 ? ($socialCompleted / $socialRequests) * 100 : null,
                'average_duration' => $socialDurations->count() > 0 ? $socialDurations->avg() : null,
                'duration_over_5s_percentage' => $socialDurations->count() > 0
                    ? ($socialDurations->filter(fn($v) => $v > 5000)->count() / $socialDurations->count()) * 100
                    : null,
            ],
            'latency' => [
                'total_requests' => $latencyRequests,
                'total_completed' => $latencyCompleted,
                'success_ratio' => $latencyRequests > 0 ? ($latencyCompleted / $latencyRequests) * 100 : null,
                'interactivity_success_ratio' => $latencyScores->count() > 0
                    ? ($latencyScores->filter(fn($v) => $v > 25)->count() / $latencyScores->count()) * 100
                    : null,
                'average_score' => $latencyScores->count() > 0 ? $latencyScores->avg() : null,
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $dataAnalytics,
        ]);
    }

    /**
     * Get trends over time
     */
    public function trends(Request $request): JsonResponse
    {
        AuditLogService::log('viewed', null, null, null, "Analytics trends accessed");

        $query = QoeMetric::query();

        if ($request->user()) {
            $query->where('user_id', $request->user()->id);
        }

        $groupBy = $request->input('group_by', 'day'); // day, week, month

        // Calculate trends properly by extracting JSON scores
        $trends = $query->get()->groupBy(function ($metric) use ($groupBy) {
            $date = \Carbon\Carbon::parse($metric->timestamp);
            switch ($groupBy) {
                case 'week':
                    return $date->format('Y-W');
                case 'month':
                    return $date->format('Y-m');
                default:
                    return $date->format('Y-m-d');
            }
        })->map(function ($group, $date) {
            $scores = $group->map(function ($m) {
                $getScore = function ($type) use ($m) {
                    $v = $m->scores[$type] ?? null;
                    return is_array($v) ? ($v['score'] ?? null) : (is_numeric($v) ? $v : null);
                };
                return [
                    'overall' => $getScore('overall'),
                    'voice' => $getScore('voice'),
                    'data' => $getScore('data'),
                ];
            })->filter(fn($s) => $s['overall'] !== null);

            return [
                'date' => $date,
                'avg_overall' => $scores->avg('overall'),
                'avg_voice' => $scores->avg('voice'),
                'avg_data' => $scores->avg('data'),
                'count' => $group->count(),
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => $trends,
        ]);
    }

    // Helper methods
    private function getPlatformDistribution($metrics)
    {
        return $metrics->groupBy('device_info->platform')
            ->map(fn($group) => $group->count())
            ->toArray();
    }

    private function getRegionDistribution($metrics)
    {
        return $metrics->filter(fn($m) => $m->location)
            ->groupBy(function ($metric) {
                // Group by approximate region based on coordinates
                // This is simplified - you'd want more sophisticated geocoding
                return 'region_' . round($metric->location['latitude'] ?? 0, 1);
            })
            ->map(fn($group) => $group->count())
            ->toArray();
    }

    private function calculateAverageFromNested($metrics, $path)
    {
        $values = $this->getAllValuesFromNested($metrics, $path);
        return $values->count() > 0 ? $values->avg() : null;
    }

    /**
     * Get all values from nested JSON path
     */
    private function getAllValuesFromNested($metrics, $path)
    {
        $parts = explode('.', $path);
        $values = collect();

        foreach ($metrics as $metric) {
            $data = $metric->metrics;
            foreach ($parts as $part) {
                if (isset($data[$part])) {
                    $data = $data[$part];
                } else {
                    $data = null;
                    break;
                }
            }

            if (is_array($data)) {
                $values = $values->merge($data);
            } elseif ($data !== null) {
                $values->push($data);
            }
        }

        return $values->filter(fn($v) => $v !== null && $v !== '');
    }

    /**
     * Calculate percentile from a collection of values
     */
    private function calculatePercentile($values, $percentile)
    {
        if ($values->count() === 0) {
            return null;
        }

        $sorted = $values->sort()->values();
        $index = ($percentile / 100) * ($sorted->count() - 1);
        $lower = floor($index);
        $upper = ceil($index);

        if ($lower === $upper) {
            return $sorted[$lower];
        }

        $weight = $index - $lower;
        return $sorted[$lower] * (1 - $weight) + $sorted[$upper] * $weight;
    }
}

