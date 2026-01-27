<?php

namespace App\Filament\Widgets;

use App\Models\QoeMetric;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class DataKpisWidget extends BaseWidget
{
    protected static ?int $sort = 3;

    protected function getStats(): array
    {
        $metrics = QoeMetric::get();
        
        // HTTP Download/Upload KPIs (FRS Section 4.2.3)
        $httpDlRequests = $metrics->sum(function ($metric) {
            return $metric->metrics['data']['http']['dl']['requests'] ?? 0;
        });
        
        $httpDlCompleted = $metrics->sum(function ($metric) {
            return $metric->metrics['data']['http']['dl']['completed'] ?? 0;
        });
        
        $httpUlRequests = $metrics->sum(function ($metric) {
            return $metric->metrics['data']['http']['ul']['requests'] ?? 0;
        });
        
        $httpUlCompleted = $metrics->sum(function ($metric) {
            return $metric->metrics['data']['http']['ul']['completed'] ?? 0;
        });
        
        $httpDlSuccessRatio = $httpDlRequests > 0 ? ($httpDlCompleted / $httpDlRequests) * 100 : 0;
        $httpUlSuccessRatio = $httpUlRequests > 0 ? ($httpUlCompleted / $httpUlRequests) * 100 : 0;
        
        // FTP Download/Upload KPIs (FRS Section 4.2.3)
        $ftpDlRequests = $metrics->sum(function ($metric) {
            return $metric->metrics['data']['ftp']['dl']['requests'] ?? 0;
        });
        
        $ftpDlCompleted = $metrics->sum(function ($metric) {
            return $metric->metrics['data']['ftp']['dl']['completed'] ?? 0;
        });
        
        $ftpUlRequests = $metrics->sum(function ($metric) {
            return $metric->metrics['data']['ftp']['ul']['requests'] ?? 0;
        });
        
        $ftpUlCompleted = $metrics->sum(function ($metric) {
            return $metric->metrics['data']['ftp']['ul']['completed'] ?? 0;
        });
        
        $ftpDlSuccessRatio = $ftpDlRequests > 0 ? ($ftpDlCompleted / $ftpDlRequests) * 100 : 0;
        $ftpUlSuccessRatio = $ftpUlRequests > 0 ? ($ftpUlCompleted / $ftpUlRequests) * 100 : 0;
        
        // Social Media KPIs (FRS Section 4.2.4)
        $socialRequests = $metrics->sum(function ($metric) {
            return $metric->metrics['data']['social']['requests'] ?? 0;
        });
        
        $socialCompleted = $metrics->sum(function ($metric) {
            return $metric->metrics['data']['social']['completed'] ?? 0;
        });
        
        $socialSuccessRatio = $socialRequests > 0 ? ($socialCompleted / $socialRequests) * 100 : 0;
        
        // Latency & Interactivity KPIs (FRS Section 4.2.5)
        $latencyRequests = $metrics->sum(function ($metric) {
            return $metric->metrics['data']['latency']['requests'] ?? 0;
        });
        
        $latencyCompleted = $metrics->sum(function ($metric) {
            return $metric->metrics['data']['latency']['completed'] ?? 0;
        });
        
        $latencySuccessRatio = $latencyRequests > 0 ? ($latencyCompleted / $latencyRequests) * 100 : 0;
        
        // Calculate average interactivity score
        $allLatencyScores = [];
        foreach ($metrics as $metric) {
            $scores = $metric->metrics['data']['latency']['scores'] ?? [];
            if (is_array($scores)) {
                $allLatencyScores = array_merge($allLatencyScores, $scores);
            }
        }
        
        $avgInteractivityScore = count($allLatencyScores) > 0 
            ? array_sum($allLatencyScores) / count($allLatencyScores) 
            : 0;

        return [
            Stat::make('HTTP DL Success', number_format($httpDlSuccessRatio, 1) . '%')
                ->description('HTTP Download Success Ratio (Target: ≥80%)')
                ->descriptionIcon('heroicon-m-arrow-down-tray')
                ->color($httpDlSuccessRatio >= 80 ? 'success' : ($httpDlSuccessRatio >= 60 ? 'warning' : 'danger')),
            
            Stat::make('HTTP UL Success', number_format($httpUlSuccessRatio, 1) . '%')
                ->description('HTTP Upload Success Ratio (Target: ≥80%)')
                ->descriptionIcon('heroicon-m-arrow-up-tray')
                ->color($httpUlSuccessRatio >= 80 ? 'success' : ($httpUlSuccessRatio >= 60 ? 'warning' : 'danger')),
            
            Stat::make('FTP DL Success', number_format($ftpDlSuccessRatio, 1) . '%')
                ->description('FTP Download Success Ratio (Target: ≥80%)')
                ->descriptionIcon('heroicon-m-arrow-down-tray')
                ->color($ftpDlSuccessRatio >= 80 ? 'success' : ($ftpDlSuccessRatio >= 60 ? 'warning' : 'danger')),
            
            Stat::make('FTP UL Success', number_format($ftpUlSuccessRatio, 1) . '%')
                ->description('FTP Upload Success Ratio (Target: ≥80%)')
                ->descriptionIcon('heroicon-m-arrow-up-tray')
                ->color($ftpUlSuccessRatio >= 80 ? 'success' : ($ftpUlSuccessRatio >= 60 ? 'warning' : 'danger')),
            
            Stat::make('Social Media Success', number_format($socialSuccessRatio, 1) . '%')
                ->description('Social Media Success Ratio (Target: ≥80%)')
                ->descriptionIcon('heroicon-m-chat-bubble-left-right')
                ->color($socialSuccessRatio >= 80 ? 'success' : ($socialSuccessRatio >= 60 ? 'warning' : 'danger')),
            
            Stat::make('Interactivity Success', number_format($latencySuccessRatio, 1) . '%')
                ->description('Interactivity Success Ratio (Target: ≥80%)')
                ->descriptionIcon('heroicon-m-bolt')
                ->color($latencySuccessRatio >= 80 ? 'success' : ($latencySuccessRatio >= 60 ? 'warning' : 'danger')),
            
            Stat::make('Avg Interactivity Score', number_format($avgInteractivityScore, 1))
                ->description('Average Interactivity Score (Target: ≥25, Optimal: 100)')
                ->descriptionIcon('heroicon-m-chart-bar')
                ->color($avgInteractivityScore >= 25 ? 'success' : ($avgInteractivityScore >= 15 ? 'warning' : 'danger')),
        ];
    }
}
