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

        // Data KPIs

        $httpDlSuccess = $this->successRatio($metrics, 'data.http.dl');
        $prevHttpDlSuccess = $this->successRatio($prevMetrics, 'data.http.dl');

        $browsingSuccess = $this->successRatio($metrics, 'data.browsing');
        $prevBrowsingSuccess = $this->successRatio($prevMetrics, 'data.browsing');

        $streamingSuccess = $this->successRatio($metrics, 'data.streaming');
        $prevStreamingSuccess = $this->successRatio($prevMetrics, 'data.streaming');

        $latencySuccess = $this->successRatio($metrics, 'data.latency');
        $prevLatencySuccess = $this->successRatio($prevMetrics, 'data.latency');

        $socialSuccess = $this->successRatio($metrics, 'data.social');
        $prevSocialSuccess = $this->successRatio($prevMetrics, 'data.social');

        return [
            $this->buildStat('Data Testing', number_format($httpDlSuccess, 1) . '%', $httpDlSuccess, $prevHttpDlSuccess, 'heroicon-m-arrow-down-tray', fn($v) => $v >= 80 ? 'success' : ($v >= 60 ? 'warning' : 'danger')),
            $this->buildStat('Browsing', number_format($browsingSuccess, 1) . '%', $browsingSuccess, $prevBrowsingSuccess, 'heroicon-m-globe-alt', fn($v) => $v >= 80 ? 'success' : ($v >= 60 ? 'warning' : 'danger')),
            $this->buildStat('Streaming', number_format($streamingSuccess, 1) . '%', $streamingSuccess, $prevStreamingSuccess, 'heroicon-m-play-circle', fn($v) => $v >= 80 ? 'success' : ($v >= 60 ? 'warning' : 'danger')),
            $this->buildStat('Latency', number_format($latencySuccess, 1) . '%', $latencySuccess, $prevLatencySuccess, 'heroicon-m-bolt', fn($v) => $v >= 80 ? 'success' : ($v >= 60 ? 'warning' : 'danger')),
            $this->buildStat('Social Media', number_format($socialSuccess, 1) . '%', $socialSuccess, $prevSocialSuccess, 'heroicon-m-chat-bubble-left-right', fn($v) => $v >= 80 ? 'success' : ($v >= 60 ? 'warning' : 'danger')),
        ];
    }

    private function avgScore($metrics, string $type): float
    {
        if ($metrics->isEmpty())
            return 0;
        return $metrics->avg(function ($m) use ($type) {
            $val = $m->scores[$type] ?? null;
            // Handle nested format: { score: 0.72 }
            if (is_array($val) && isset($val['score'])) {
                return ($val['score'] ?? 0) * 100;
            }
            // Handle flat format: 0.72
            if (is_numeric($val)) {
                return $val * 100;
            }
            return 0;
        });
    }

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

    private function buildStat(string $label, string $displayValue, float $current, float $previous, string $icon, callable $colorFn): Stat
    {
        $stat = Stat::make($label, $displayValue)->color($colorFn($current));

        if ($previous > 0 && $current > 0) {
            $change = (($current - $previous) / $previous) * 100;
            $arrow = $change >= 0 ? '↑' : '↓';
            $isPositive = $change >= 0;
            $stat->description($arrow . ' ' . number_format(abs($change), 1) . '% vs previous')
                ->descriptionIcon($isPositive ? 'heroicon-m-arrow-trending-up' : 'heroicon-m-arrow-trending-down')
                ->color($isPositive ? 'success' : 'danger');
        } else {
            $stat->descriptionIcon($icon);
        }

        return $stat;
    }
}
