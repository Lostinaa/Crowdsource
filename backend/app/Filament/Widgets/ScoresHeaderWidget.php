<?php

namespace App\Filament\Widgets;

use App\Models\QoeMetric;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Filament\Widgets\Concerns\InteractsWithPageFilters;
use Carbon\Carbon;

class ScoresHeaderWidget extends BaseWidget
{
    use InteractsWithPageFilters;

    protected static ?int $sort = 0;

    protected int|string|array $columnSpan = 'full';

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

        $overallScore = $this->avgScore($metrics, 'overall');
        $prevOverallScore = $this->avgScore($prevMetrics, 'overall');

        $voiceScore = $this->avgScore($metrics, 'voice');
        $prevVoiceScore = $this->avgScore($prevMetrics, 'voice');

        $dataScore = $this->avgScore($metrics, 'data');
        $prevDataScore = $this->avgScore($prevMetrics, 'data');

        return [
            $this->buildStat(
                'Total Score',
                number_format($overallScore, 1) . '%',
                $overallScore,
                $prevOverallScore,
                'heroicon-m-chart-bar-square',
                fn($v) => $v >= 80 ? 'success' : ($v >= 60 ? 'warning' : 'danger'),
            ),
            $this->buildStat(
                'Voice Score',
                number_format($voiceScore, 1) . '%',
                $voiceScore,
                $prevVoiceScore,
                'heroicon-m-phone',
                fn($v) => $v >= 80 ? 'success' : ($v >= 60 ? 'warning' : 'danger'),
            ),
            $this->buildStat(
                'Data Score',
                number_format($dataScore, 1) . '%',
                $dataScore,
                $prevDataScore,
                'heroicon-m-globe-alt',
                fn($v) => $v >= 80 ? 'success' : ($v >= 60 ? 'warning' : 'danger'),
            ),
        ];
    }

    private function avgScore($metrics, string $type): float
    {
        if ($metrics->isEmpty())
            return 0;
        return $metrics->avg(function ($m) use ($type) {
            $val = $m->scores[$type] ?? null;
            if (is_array($val) && isset($val['score'])) {
                return ($val['score'] ?? 0) * 100;
            }
            if (is_numeric($val)) {
                return $val * 100;
            }
            return 0;
        });
    }

    private function buildStat(
        string $label,
        string $displayValue,
        float $current,
        float $previous,
        string $icon,
        callable $colorFn,
    ): Stat {
        $stat = Stat::make($label, $displayValue)
            ->color($colorFn($current));

        if ($previous > 0 && $current > 0) {
            $change = (($current - $previous) / $previous) * 100;
            $isPositive = $change >= 0;
            $arrow = $change >= 0 ? '↑' : '↓';
            $changeText = $arrow . ' ' . number_format(abs($change), 1) . '% vs previous';

            $stat->description($changeText)
                ->descriptionIcon($isPositive ? 'heroicon-m-arrow-trending-up' : 'heroicon-m-arrow-trending-down')
                ->color($isPositive ? 'success' : 'danger');
        } else {
            $stat->descriptionIcon($icon);
        }

        return $stat;
    }
}
