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

    protected static ?int $sort = -10;

    protected int|string|array $columnSpan = 'full';

    protected ?string $heading = 'Overall QoE Scores';

    /**
     * Standard weighting: Voice 40%, Data 60%
     */
    private const VOICE_WEIGHT = 0.40;
    private const DATA_WEIGHT = 0.60;

    protected function getStats(): array
    {
        $startDate = $this->filters['startDate'] ?? Carbon::today()->toDateString();
        $endDate = $this->filters['endDate'] ?? Carbon::today()->toDateString();

        $start = Carbon::parse($startDate)->startOfDay();
        $end = Carbon::parse($endDate)->endOfDay();

        $periodDays = $start->diffInDays($end) + 1;
        $prevStart = $start->copy()->subDays($periodDays);
        $prevEnd = $start->copy()->subDay()->endOfDay();

        $metrics = QoeMetric::whereBetween('timestamp', [$start, $end])->get();
        $prevMetrics = QoeMetric::whereBetween('timestamp', [$prevStart, $prevEnd])->get();

        $voiceScore = $this->avgScore($metrics, 'voice');
        $prevVoiceScore = $this->avgScore($prevMetrics, 'voice');

        $dataScore = $this->avgScore($metrics, 'data');
        $prevDataScore = $this->avgScore($prevMetrics, 'data');

        // Total Score = 40% Voice + 60% Data (standard weighting)
        $totalScore = ($voiceScore * self::VOICE_WEIGHT) + ($dataScore * self::DATA_WEIGHT);
        $prevTotalScore = ($prevVoiceScore * self::VOICE_WEIGHT) + ($prevDataScore * self::DATA_WEIGHT);

        return [
            $this->buildStat(
                '🏆 Total Score',
                number_format($totalScore, 1) . '%',
                $totalScore,
                $prevTotalScore,
                'heroicon-m-chart-bar-square',
                fn($v) => $v >= 80 ? 'success' : ($v >= 60 ? 'warning' : 'danger'),
            ),
            $this->buildStat(
                '📞 Voice Score (40%)',
                number_format($voiceScore, 1) . '%',
                $voiceScore,
                $prevVoiceScore,
                'heroicon-m-phone',
                fn($v) => $v >= 80 ? 'success' : ($v >= 60 ? 'warning' : 'danger'),
            ),
            $this->buildStat(
                '📊 Data Score (60%)',
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
