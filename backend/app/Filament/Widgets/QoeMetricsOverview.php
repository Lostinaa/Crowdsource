<?php

namespace App\Filament\Widgets;

use App\Models\QoeMetric;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class QoeMetricsOverview extends BaseWidget
{
    protected function getStats(): array
    {
        $totalMetrics = QoeMetric::count();
        
        $totalVoiceAttempts = QoeMetric::get()->sum(function ($metric) {
            return $metric->metrics['voice']['attempts'] ?? 0;
        });
        
        $totalVoiceCompleted = QoeMetric::get()->sum(function ($metric) {
            return $metric->metrics['voice']['completed'] ?? 0;
        });
        
        $avgOverallScore = QoeMetric::get()->avg(function ($metric) {
            return $metric->scores['overall'] ?? 0;
        });
        
        $androidCount = QoeMetric::whereJsonContains('device_info->platform', 'android')->count();
        $iosCount = QoeMetric::whereJsonContains('device_info->platform', 'ios')->count();

        return [
            Stat::make('Total Metrics', $totalMetrics)
                ->description('All QoE metrics collected')
                ->descriptionIcon('heroicon-m-chart-bar')
                ->color('primary'),
            
            Stat::make('Voice Attempts', number_format($totalVoiceAttempts))
                ->description('Total voice call attempts')
                ->descriptionIcon('heroicon-m-phone')
                ->color('info'),
            
            Stat::make('Voice Completed', number_format($totalVoiceCompleted))
                ->description('Successfully completed calls')
                ->descriptionIcon('heroicon-m-check-circle')
                ->color('success'),
            
            Stat::make('Avg Overall Score', number_format($avgOverallScore, 2))
                ->description('Average QoE score')
                ->descriptionIcon('heroicon-m-star')
                ->color($avgOverallScore >= 80 ? 'success' : ($avgOverallScore >= 60 ? 'warning' : 'danger')),
            
            Stat::make('Android Devices', $androidCount)
                ->description('Metrics from Android')
                ->descriptionIcon('heroicon-m-device-phone-mobile')
                ->color('success'),
            
            Stat::make('iOS Devices', $iosCount)
                ->description('Metrics from iOS')
                ->descriptionIcon('heroicon-m-device-phone-mobile')
                ->color('info'),
        ];
    }
}



