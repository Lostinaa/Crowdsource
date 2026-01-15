<?php

namespace App\Http\Controllers;

use App\Models\QoeMetric;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    /**
     * Get analytics overview
     */
    public function overview(Request $request): JsonResponse
    {
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
                'overall' => $metrics->avg('scores->overall'),
                'voice' => $metrics->avg('scores->voice'),
                'data' => $metrics->avg('scores->data'),
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
        $query = QoeMetric::query();

        if ($request->user()) {
            $query->where('user_id', $request->user()->id);
        }

        $metrics = $query->get();

        $voiceData = [
            'total_attempts' => $metrics->sum('metrics->voice->attempts'),
            'total_completed' => $metrics->sum('metrics->voice->completed'),
            'total_dropped' => $metrics->sum('metrics->voice->dropped'),
            'average_setup_time' => $this->calculateAverageFromNested($metrics, 'metrics->voice->setupTimes'),
            'average_mos' => $this->calculateAverageFromNested($metrics, 'metrics->voice->mosSamples'),
            'cssr' => $this->calculateCSSR($metrics),
            'cdr' => $this->calculateCDR($metrics),
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
        $query = QoeMetric::query();

        if ($request->user()) {
            $query->where('user_id', $request->user()->id);
        }

        $metrics = $query->get();

        $dataAnalytics = [
            'browsing' => [
                'total_requests' => $metrics->sum('metrics->data->browsing->requests'),
                'total_completed' => $metrics->sum('metrics->data->browsing->completed'),
                'average_duration' => $this->calculateAverageFromNested($metrics, 'metrics->data->browsing->durations'),
            ],
            'streaming' => [
                'total_requests' => $metrics->sum('metrics->data->streaming->requests'),
                'total_completed' => $metrics->sum('metrics->data->streaming->completed'),
                'average_mos' => $this->calculateAverageFromNested($metrics, 'metrics->data->streaming->mosSamples'),
            ],
            'http' => [
                'download' => [
                    'total_requests' => $metrics->sum('metrics->data->http->dl->requests'),
                    'total_completed' => $metrics->sum('metrics->data->http->dl->completed'),
                    'average_throughput' => $this->calculateAverageFromNested($metrics, 'metrics->data->http->dl->throughputs'),
                ],
                'upload' => [
                    'total_requests' => $metrics->sum('metrics->data->http->ul->requests'),
                    'total_completed' => $metrics->sum('metrics->data->http->ul->completed'),
                    'average_throughput' => $this->calculateAverageFromNested($metrics, 'metrics->data->http->ul->throughputs'),
                ],
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
        $query = QoeMetric::query();

        if ($request->user()) {
            $query->where('user_id', $request->user()->id);
        }

        $groupBy = $request->input('group_by', 'day'); // day, week, month

        $trends = $query
            ->select(
                DB::raw("DATE_FORMAT(timestamp, '%Y-%m-%d') as date"),
                DB::raw('AVG(JSON_EXTRACT(scores, "$.overall")) as avg_overall'),
                DB::raw('AVG(JSON_EXTRACT(scores, "$.voice")) as avg_voice'),
                DB::raw('AVG(JSON_EXTRACT(scores, "$.data")) as avg_data'),
                DB::raw('COUNT(*) as count')
            )
            ->groupBy('date')
            ->orderBy('date', 'asc')
            ->get();

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
            ->groupBy(function($metric) {
                // Group by approximate region based on coordinates
                // This is simplified - you'd want more sophisticated geocoding
                return 'region_' . round($metric->location['latitude'] ?? 0, 1);
            })
            ->map(fn($group) => $group->count())
            ->toArray();
    }

    private function calculateAverageFromNested($metrics, $path)
    {
        $values = $metrics->pluck($path)->flatten()->filter()->values();
        return $values->count() > 0 ? $values->avg() : null;
    }

    private function calculateCSSR($metrics)
    {
        $totalAttempts = $metrics->sum('metrics->voice->attempts');
        $totalSetupOk = $metrics->sum('metrics->voice->setupOk');
        return $totalAttempts > 0 ? ($totalSetupOk / $totalAttempts) : null;
    }

    private function calculateCDR($metrics)
    {
        $totalCompleted = $metrics->sum('metrics->voice->completed');
        $totalDropped = $metrics->sum('metrics->voice->dropped');
        $total = $totalCompleted + $totalDropped;
        return $total > 0 ? ($totalDropped / $total) : null;
    }
}

