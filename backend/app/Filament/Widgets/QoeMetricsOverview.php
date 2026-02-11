<?php

namespace App\Filament\Widgets;

use App\Models\QoeMetric;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Filament\Widgets\Concerns\InteractsWithPageFilters;
use Carbon\Carbon;

class QoeMetricsOverview extends BaseWidget
{
    use InteractsWithPageFilters;

    protected static ?int $sort = 1;

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

        // Total Reports & Unique Users
        $totalReports = $metrics->count();
        $prevReports = $prevMetrics->count();
        $uniqueUsers = $metrics->pluck('user_id')->filter()->unique()->count();

        // Voice KPIs
        $avgVoiceScore = $this->avgScore($metrics, 'voice');
        $prevAvgVoiceScore = $this->avgScore($prevMetrics, 'voice');

        $cssr = $this->calcCssr($metrics);
        $prevCssr = $this->calcCssr($prevMetrics);

        $cdr = $this->calcCdr($metrics);
        $prevCdr = $this->calcCdr($prevMetrics);

        $avgSetupTime = $this->avgSetupTime($metrics);
        $prevAvgSetupTime = $this->avgSetupTime($prevMetrics);

        return [
            // Total Reports
            $this->buildStat(
                'Total Reports',
                number_format($totalReports) . ($uniqueUsers > 0 ? " ({$uniqueUsers} users)" : ''),
                (float) $totalReports,
                (float) $prevReports,
                'heroicon-m-chart-bar',
                fn() => 'primary',
            ),

            // Voice Overall Score
            $this->buildStat(
                'Voice Score',
                number_format($avgVoiceScore, 1) . '%',
                $avgVoiceScore,
                $prevAvgVoiceScore,
                'heroicon-m-phone',
                fn($v) => $v >= 80 ? 'success' : ($v >= 60 ? 'warning' : 'danger'),
            ),

            // CSSR
            $this->buildStat(
                'CSSR',
                number_format($cssr, 1) . '%',
                $cssr,
                $prevCssr,
                'heroicon-m-check-circle',
                fn($v) => $v >= 90 ? 'success' : ($v >= 80 ? 'warning' : 'danger'),
            ),

            // CDR (lower is better)
            $this->buildStat(
                'Call Drop Rate',
                number_format($cdr, 1) . '%',
                $cdr,
                $prevCdr,
                'heroicon-m-x-circle',
                fn($v) => $v <= 10 ? 'success' : ($v <= 20 ? 'warning' : 'danger'),
                true,
            ),

            // Avg Call Setup Time (lower is better)
            $this->buildStat(
                'Avg Setup Time',
                $avgSetupTime > 0 ? number_format($avgSetupTime, 0) . ' ms' : '--',
                $avgSetupTime,
                $prevAvgSetupTime,
                'heroicon-m-clock',
                fn($v) => $v > 0 && $v <= 3000 ? 'success' : ($v <= 5000 ? 'warning' : 'danger'),
                true,
            ),
        ];
    }

    private function avgScore($metrics, string $type): float
    {
        if ($metrics->isEmpty())
            return 0;
        return $metrics->avg(fn($m) => ($m->scores[$type]['score'] ?? 0) * 100);
    }

    private function calcCssr($metrics): float
    {
        $attempts = $metrics->sum(fn($m) => $m->metrics['voice']['attempts'] ?? 0);
        $setupOk = $metrics->sum(fn($m) => $m->metrics['voice']['setupOk'] ?? 0);
        return $attempts > 0 ? ($setupOk / $attempts) * 100 : 0;
    }

    private function calcCdr($metrics): float
    {
        $completed = $metrics->sum(fn($m) => $m->metrics['voice']['completed'] ?? 0);
        $dropped = $metrics->sum(fn($m) => $m->metrics['voice']['dropped'] ?? 0);
        $total = $completed + $dropped;
        return $total > 0 ? ($dropped / $total) * 100 : 0;
    }

    private function avgSetupTime($metrics): float
    {
        $times = [];
        foreach ($metrics as $m) {
            // First try pre-computed avgSetupTimeMs
            $t = $m->metrics['voice']['avgSetupTimeMs'] ?? null;
            if ($t !== null && $t > 0) {
                $times[] = $t;
            } else {
                // Fallback: compute from setupTimes array
                $setupTimes = $m->metrics['voice']['setupTimes'] ?? [];
                if (is_array($setupTimes) && count($setupTimes) > 0) {
                    $times[] = array_sum($setupTimes) / count($setupTimes);
                }
            }
        }
        return count($times) > 0 ? array_sum($times) / count($times) : 0;
    }

    private function buildStat(
        string $label,
        string $displayValue,
        float $current,
        float $previous,
        string $icon,
        callable $colorFn,
        bool $invertComparison = false,
    ): Stat {
        $stat = Stat::make($label, $displayValue)
            ->color($colorFn($current));

        if ($previous > 0 && $current > 0) {
            $change = (($current - $previous) / $previous) * 100;
            $isPositive = $invertComparison ? $change <= 0 : $change >= 0;
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
