<?php

namespace App\Filament\Widgets;

use App\Models\QoeMetric;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class QoeMetricsOverview extends BaseWidget
{
    protected function getStats(): array
    {
        $metrics = QoeMetric::get();
        $totalMetrics = $metrics->count();
        
        // Voice KPIs (FRS Section 4.1)
        $totalVoiceAttempts = $metrics->sum(function ($metric) {
            return $metric->metrics['voice']['attempts'] ?? 0;
        });
        
        $totalVoiceSetupOk = $metrics->sum(function ($metric) {
            return $metric->metrics['voice']['setupOk'] ?? 0;
        });
        
        $totalVoiceCompleted = $metrics->sum(function ($metric) {
            return $metric->metrics['voice']['completed'] ?? 0;
        });
        
        $totalVoiceDropped = $metrics->sum(function ($metric) {
            return $metric->metrics['voice']['dropped'] ?? 0;
        });
        
        // Calculate CSSR (Call Setup Success Ratio) - FRS requirement
        $cssr = $totalVoiceAttempts > 0 
            ? ($totalVoiceSetupOk / $totalVoiceAttempts) * 100 
            : 0;
        
        // Calculate CDR (Call Drop Ratio) - FRS requirement
        $totalCalls = $totalVoiceCompleted + $totalVoiceDropped;
        $cdr = $totalCalls > 0 
            ? ($totalVoiceDropped / $totalCalls) * 100 
            : 0;
        
        // Overall QoE Scores (FRS Section 4.3)
        $avgOverallScore = $metrics->avg(function ($metric) {
            return ($metric->scores['overall']['score'] ?? 0) * 100;
        });
        
        $avgVoiceScore = $metrics->avg(function ($metric) {
            return ($metric->scores['voice']['score'] ?? 0) * 100;
        });
        
        $avgDataScore = $metrics->avg(function ($metric) {
            return ($metric->scores['data']['score'] ?? 0) * 100;
        });
        
        // Data KPIs - Browsing Success Ratio (FRS Section 4.2.1)
        $totalBrowsingRequests = $metrics->sum(function ($metric) {
            return $metric->metrics['data']['browsing']['requests'] ?? 0;
        });
        
        $totalBrowsingCompleted = $metrics->sum(function ($metric) {
            return $metric->metrics['data']['browsing']['completed'] ?? 0;
        });
        
        $browsingSuccessRatio = $totalBrowsingRequests > 0 
            ? ($totalBrowsingCompleted / $totalBrowsingRequests) * 100 
            : 0;
        
        // Streaming Success Ratio (FRS Section 4.2.2)
        $totalStreamingRequests = $metrics->sum(function ($metric) {
            return $metric->metrics['data']['streaming']['requests'] ?? 0;
        });
        
        $totalStreamingCompleted = $metrics->sum(function ($metric) {
            return $metric->metrics['data']['streaming']['completed'] ?? 0;
        });
        
        $streamingSuccessRatio = $totalStreamingRequests > 0 
            ? ($totalStreamingCompleted / $totalStreamingRequests) * 100 
            : 0;

        return [
            // Overall QoE Score (Primary KPI - FRS Section 4.3)
            Stat::make('Overall QoE Score', number_format($avgOverallScore, 1) . '%')
                ->description('40% Voice + 60% Data (ETSI TR 103 559)')
                ->descriptionIcon('heroicon-m-star')
                ->color($avgOverallScore >= 80 ? 'success' : ($avgOverallScore >= 60 ? 'warning' : 'danger')),
            
            // Voice Component Score (40% weight)
            Stat::make('Voice QoE Score', number_format($avgVoiceScore, 1) . '%')
                ->description('Voice component (40% weight)')
                ->descriptionIcon('heroicon-m-phone')
                ->color($avgVoiceScore >= 80 ? 'success' : ($avgVoiceScore >= 60 ? 'warning' : 'danger')),
            
            // Data Component Score (60% weight)
            Stat::make('Data QoE Score', number_format($avgDataScore, 1) . '%')
                ->description('Data component (60% weight)')
                ->descriptionIcon('heroicon-m-globe-alt')
                ->color($avgDataScore >= 80 ? 'success' : ($avgDataScore >= 60 ? 'warning' : 'danger')),
            
            // Voice KPIs (FRS Section 4.1)
            Stat::make('CSSR', number_format($cssr, 1) . '%')
                ->description('Call Setup Success Ratio (Target: ≥90%)')
                ->descriptionIcon('heroicon-m-check-circle')
                ->color($cssr >= 90 ? 'success' : ($cssr >= 80 ? 'warning' : 'danger')),
            
            Stat::make('CDR', number_format($cdr, 1) . '%')
                ->description('Call Drop Ratio (Target: ≤10%)')
                ->descriptionIcon('heroicon-m-x-circle')
                ->color($cdr <= 10 ? 'success' : ($cdr <= 20 ? 'warning' : 'danger')),
            
            // Data KPIs (FRS Section 4.2)
            Stat::make('Browsing Success', number_format($browsingSuccessRatio, 1) . '%')
                ->description('Browsing Success Ratio (Target: ≥80%)')
                ->descriptionIcon('heroicon-m-globe-alt')
                ->color($browsingSuccessRatio >= 80 ? 'success' : ($browsingSuccessRatio >= 60 ? 'warning' : 'danger')),
            
            Stat::make('Streaming Success', number_format($streamingSuccessRatio, 1) . '%')
                ->description('Streaming Success Ratio (Target: ≥80%)')
                ->descriptionIcon('heroicon-m-play-circle')
                ->color($streamingSuccessRatio >= 80 ? 'success' : ($streamingSuccessRatio >= 60 ? 'warning' : 'danger')),
            
            // Summary stats
            Stat::make('Total Metrics', number_format($totalMetrics))
                ->description('All QoE metrics collected')
                ->descriptionIcon('heroicon-m-chart-bar')
                ->color('primary'),
        ];
    }
}







