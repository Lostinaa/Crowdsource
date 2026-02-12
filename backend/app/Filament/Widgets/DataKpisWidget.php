<?php

namespace App\Filament\Widgets;

use App\Models\QoeMetric;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Filament\Widgets\Concerns\InteractsWithPageFilters;
use Carbon\Carbon;

class DataKpisWidget extends BaseWidget
{
    use InteractsWithPageFilters;

    protected static ?int $sort = 3;

    protected ?string $heading = 'Data Sub-Component Scores';

    protected function getStats(): array
    {
        $startDate = $this->filters['startDate'] ?? Carbon::today()->toDateString();
        $endDate = $this->filters['endDate'] ?? Carbon::today()->toDateString();
        $region = $this->filters['region'] ?? '';

        $start = Carbon::parse($startDate)->startOfDay();
        $end = Carbon::parse($endDate)->endOfDay();

        $periodDays = $start->diffInDays($end) + 1;
        $prevStart = $start->copy()->subDays($periodDays);
        $prevEnd = $start->copy()->subDay()->endOfDay();

        $query = QoeMetric::whereBetween('timestamp', [$start, $end]);
        $prevQuery = QoeMetric::whereBetween('timestamp', [$prevStart, $prevEnd]);

        if ($region) {
            $query->where('region', $region);
            $prevQuery->where('region', $region);
        }

        $metrics = $query->get();
        $prevMetrics = $prevQuery->get();

        // Read actual weighted scores from DB (stored by mobile app scoring engine)
        $httpScore = $this->avgSubScore($metrics, 'http');
        $prevHttpScore = $this->avgSubScore($prevMetrics, 'http');

        $browsingScore = $this->avgSubScore($metrics, 'browsing');
        $prevBrowsingScore = $this->avgSubScore($prevMetrics, 'browsing');

        $streamingScore = $this->avgSubScore($metrics, 'streaming');
        $prevStreamingScore = $this->avgSubScore($prevMetrics, 'streaming');

        $latencyScore = $this->avgSubScore($metrics, 'latency');
        $prevLatencyScore = $this->avgSubScore($prevMetrics, 'latency');

        $socialScore = $this->avgSubScore($metrics, 'social');
        $prevSocialScore = $this->avgSubScore($prevMetrics, 'social');

        // Also show success ratios as subtitle context
        $httpSuccess = $this->successRatio($metrics, 'data.http.dl');
        $browsingSuccess = $this->successRatio($metrics, 'data.browsing');
        $streamingSuccess = $this->successRatio($metrics, 'data.streaming');
        $latencySuccess = $this->successRatio($metrics, 'data.latency');
        $socialSuccess = $this->successRatio($metrics, 'data.social');

        return [
            $this->buildStat(
                'Data Testing (30%)',
                number_format($httpScore, 1) . '%',
                $httpScore,
                $prevHttpScore,
                'heroicon-m-arrow-down-tray',
                fn($v) => $v >= 80 ? 'success' : ($v >= 60 ? 'warning' : 'danger'),
                'Success: ' . number_format($httpSuccess, 0) . '%'
            ),
            $this->buildStat(
                'Browsing (25%)',
                number_format($browsingScore, 1) . '%',
                $browsingScore,
                $prevBrowsingScore,
                'heroicon-m-globe-alt',
                fn($v) => $v >= 80 ? 'success' : ($v >= 60 ? 'warning' : 'danger'),
                'Success: ' . number_format($browsingSuccess, 0) . '%'
            ),
            $this->buildStat(
                'Streaming (15%)',
                number_format($streamingScore, 1) . '%',
                $streamingScore,
                $prevStreamingScore,
                'heroicon-m-play-circle',
                fn($v) => $v >= 80 ? 'success' : ($v >= 60 ? 'warning' : 'danger'),
                'Success: ' . number_format($streamingSuccess, 0) . '%'
            ),
            $this->buildStat(
                'Latency (15%)',
                number_format($latencyScore, 1) . '%',
                $latencyScore,
                $prevLatencyScore,
                'heroicon-m-bolt',
                fn($v) => $v >= 80 ? 'success' : ($v >= 60 ? 'warning' : 'danger'),
                'Success: ' . number_format($latencySuccess, 0) . '%'
            ),
            $this->buildStat(
                'Social Media (15%)',
                number_format($socialScore, 1) . '%',
                $socialScore,
                $prevSocialScore,
                'heroicon-m-chat-bubble-left-right',
                fn($v) => $v >= 80 ? 'success' : ($v >= 60 ? 'warning' : 'danger'),
                'Success: ' . number_format($socialSuccess, 0) . '%'
            ),
        ];
    }

    /**
     * Get average weighted sub-score from the scores JSON column
     * e.g. scores.http.score, scores.browsing.score
     */
    private function avgSubScore($metrics, string $component): float
    {
        if ($metrics->isEmpty())
            return 0;

        return $metrics->avg(function ($m) use ($component) {
            $val = $m->scores[$component] ?? null;
            if (is_array($val) && isset($val['score'])) {
                return ($val['score'] ?? 0) * 100;
            }
            if (is_numeric($val)) {
                return $val * 100;
            }
            return 0;
        });
    }

    /**
     * Success ratio from raw metrics (completed/requests)
     */
    private function successRatio($metrics, string $path): float
    {
        $parts = explode('.', $path);
        $requests = $metrics->sum(function ($m) use ($parts) {
            $data = $m->metrics;
            foreach ($parts as $p)
                $data = $data[$p] ?? [];
            return $data['requests'] ?? 0;
        });
        $completed = $metrics->sum(function ($m) use ($parts) {
            $data = $m->metrics;
            foreach ($parts as $p)
                $data = $data[$p] ?? [];
            return $data['completed'] ?? 0;
        });
        return $requests > 0 ? ($completed / $requests) * 100 : 0;
    }

    private function buildStat(
        string $label,
        string $displayValue,
        float $current,
        float $previous,
        string $icon,
        callable $colorFn,
        string $subtitle = ''
    ): Stat {
        $stat = Stat::make($label, $displayValue)->color($colorFn($current));

        if ($previous > 0 && $current > 0) {
            $change = (($current - $previous) / $previous) * 100;
            $arrow = $change >= 0 ? '↑' : '↓';
            $isPositive = $change >= 0;
            $changeText = $arrow . ' ' . number_format(abs($change), 1) . '% vs prev';
            if ($subtitle)
                $changeText .= ' · ' . $subtitle;

            $stat->description($changeText)
                ->descriptionIcon($isPositive ? 'heroicon-m-arrow-trending-up' : 'heroicon-m-arrow-trending-down')
                ->color($isPositive ? 'success' : 'danger');
        } else {
            $desc = $subtitle ?: '';
            if ($desc)
                $stat->description($desc);
            $stat->descriptionIcon($icon);
        }

        return $stat;
    }
}
