<?php

namespace App\Filament\Widgets;

use App\Models\QoeMetric;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Carbon\Carbon;

class DailyQoeOverview extends BaseWidget
{
    protected ?string $heading = 'Daily QoE Performance';

    protected function getStats(): array
    {
        $today = Carbon::today();
        $metrics = QoeMetric::whereDate('timestamp', $today)->get();
        $totalMetrics = $metrics->count();

        // Voice KPIs
        $totalVoiceAttempts = $metrics->sum(function ($metric) {
            return $metric->metrics['voice']['attempts'] ?? 0;
        });

        $totalVoiceSetupOk = $metrics->sum(function ($metric) {
            return $metric->metrics['voice']['setupOk'] ?? 0;
        });

        $cssr = $totalVoiceAttempts > 0
            ? ($totalVoiceSetupOk / $totalVoiceAttempts) * 100
            : 0;

        // Data KPIs
        $avgOverallScore = $metrics->avg(function ($metric) {
            return ($metric->scores['overall']['score'] ?? 0) * 100;
        });

        return [
            Stat::make('Today\'s Metrics', number_format($totalMetrics))
                ->description('Reports received today')
                ->descriptionIcon('heroicon-m-calendar')
                ->color('primary'),

            Stat::make('Today\'s CSSR', number_format($cssr, 1) . '%')
                ->description('Voice Setup Success Ratio')
                ->descriptionIcon('heroicon-m-phone')
                ->color($cssr >= 90 ? 'success' : ($cssr >= 80 ? 'warning' : 'danger')),

            Stat::make('Daily QoE Score', number_format($avgOverallScore, 1) . '%')
                ->description('Average QoE for today')
                ->descriptionIcon('heroicon-m-chart-bar')
                ->color($avgOverallScore >= 80 ? 'success' : ($avgOverallScore >= 60 ? 'warning' : 'danger')),
        ];
    }
}
