<?php

namespace App\Filament\Widgets;

use App\Models\QoeMetric;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Carbon;

class QoeMetricsChart extends ChartWidget
{
    protected static ?string $heading = 'Metrics Over Time';

    protected static ?int $sort = 2;

    protected int|string|array $columnSpan = 'full';

    protected function getData(): array
    {
        // Get metrics from the last 7 days
        $startDate = Carbon::now()->subDays(7);
        $metrics = QoeMetric::where('timestamp', '>=', $startDate)
            ->orderBy('timestamp')
            ->get()
            ->groupBy(function ($metric) {
                return Carbon::parse($metric->timestamp)->format('Y-m-d');
            });

        $dates = [];
        $voiceAttempts = [];
        $voiceCompleted = [];
        $avgScores = [];

        foreach ($metrics as $date => $group) {
            $dates[] = Carbon::parse($date)->format('M d');
            $voiceAttempts[] = $group->sum(function ($metric) {
                return $metric->metrics['voice']['attempts'] ?? 0;
            });
            $voiceCompleted[] = $group->sum(function ($metric) {
                return $metric->metrics['voice']['completed'] ?? 0;
            });
            $avgScores[] = round($group->avg(function ($metric) {
                return $metric->scores['overall'] ?? 0;
            }), 2);
        }

        return [
            'datasets' => [
                [
                    'label' => 'Voice Attempts',
                    'data' => $voiceAttempts,
                    'backgroundColor' => 'rgba(59, 130, 246, 0.5)',
                    'borderColor' => 'rgb(59, 130, 246)',
                ],
                [
                    'label' => 'Voice Completed',
                    'data' => $voiceCompleted,
                    'backgroundColor' => 'rgba(34, 197, 94, 0.5)',
                    'borderColor' => 'rgb(34, 197, 94)',
                ],
                [
                    'label' => 'Avg Overall Score',
                    'data' => $avgScores,
                    'backgroundColor' => 'rgba(251, 191, 36, 0.5)',
                    'borderColor' => 'rgb(251, 191, 36)',
                    'yAxisID' => 'y1',
                    'type' => 'line',
                ],
            ],
            'labels' => $dates,
        ];
    }

    protected function getType(): string
    {
        return 'bar';
    }

    protected function getOptions(): array
    {
        return [
            'scales' => [
                'y' => [
                    'beginAtZero' => true,
                    'title' => [
                        'display' => true,
                        'text' => 'Count',
                    ],
                ],
                'y1' => [
                    'position' => 'right',
                    'beginAtZero' => true,
                    'max' => 100,
                    'title' => [
                        'display' => true,
                        'text' => 'Score (0-100)',
                    ],
                    'grid' => [
                        'drawOnChartArea' => false,
                    ],
                ],
            ],
        ];
    }
}


