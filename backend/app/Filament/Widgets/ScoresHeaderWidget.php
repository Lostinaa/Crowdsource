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

    protected static string $view = 'filament.widgets.scores-header-widget';

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

        // Total Score = voice contribution + data contribution
        // NOTE: The app pre-weights scores before sending (voice already ×40%, data already ×60%)
        // So total is the SUM of contributions, not a weighted average.
        // This matches the QoE Calculator additive formula: Total = SUM of all metric contributions.
        $totalScore = $voiceScore + $dataScore;
        $prevTotalScore = $prevVoiceScore + $prevDataScore;

        return [
            $this->buildStat(
                '🏆 Total Score',
                number_format($totalScore, 1) . '%',
                $totalScore,
                $prevTotalScore,
                'heroicon-m-chart-bar-square',
                fn($v) => $v >= 80 ? 'success' : ($v >= 60 ? 'warning' : 'danger'),
            )->extraAttributes(['class' => 'font-black text-3xl']),

            $this->buildStat(
                '📞 Voice Score (40%)',
                number_format($voiceScore, 1) . '%',
                $voiceScore,
                $prevVoiceScore,
                'heroicon-m-phone',
                fn($v) => $v >= 80 ? 'success' : ($v >= 60 ? 'warning' : 'danger'),
            )->extraAttributes(['class' => 'font-bold']),

            $this->buildStat(
                '📊 Data Score (60%)',
                number_format($dataScore, 1) . '%',
                $dataScore,
                $prevDataScore,
                'heroicon-m-globe-alt',
                fn($v) => $v >= 80 ? 'success' : ($v >= 60 ? 'warning' : 'danger'),
            )->extraAttributes(['class' => 'font-bold']),
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

        if ($current > 0) {
            if ($previous > 0) {
                $change = (($current - $previous) / $previous) * 100;
                $isPositive = $change >= 0;
                $arrow = $change >= 0 ? '↑' : '↓';
                $changeText = $arrow . ' ' . number_format(abs($change), 1) . '% vs previous';

                $stat->description($changeText)
                    ->descriptionIcon($isPositive ? 'heroicon-m-arrow-trending-up' : 'heroicon-m-arrow-trending-down')
                    ->color($isPositive ? 'success' : 'danger');
            } elseif ($previous == 0) {
                $stat->description('↑ 100% vs previous')
                    ->descriptionIcon('heroicon-m-arrow-trending-up')
                    ->color('success');
            }
        } else {
            $stat->descriptionIcon($icon);
        }

        return $stat;
    }
}
