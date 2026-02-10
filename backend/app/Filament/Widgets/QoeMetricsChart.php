<?php

namespace App\Filament\Widgets;

use App\Models\QoeMetric;
use Filament\Widgets\ChartWidget;
use Filament\Widgets\Concerns\InteractsWithPageFilters;
use Illuminate\Support\Carbon;

class QoeMetricsChart extends ChartWidget
{
    use InteractsWithPageFilters;

    protected static ?string $heading = 'QoE Scores & Voice KPIs Over Time';

    protected static ?int $sort = 2;

    protected int|string|array $columnSpan = 'full';

    protected function getData(): array
    {
        $filterStart = $this->filters['startDate'] ?? Carbon::today()->subDays(7)->toDateString();
        $filterEnd = $this->filters['endDate'] ?? Carbon::today()->toDateString();
        $region = $this->filters['region'] ?? '';

        $startDate = Carbon::parse($filterStart)->startOfDay();
        $endDate = Carbon::parse($filterEnd)->endOfDay();

        $query = QoeMetric::whereBetween('timestamp', [$startDate, $endDate]);
        if ($region) {
            $query->where('region', $region);
        }

        $metrics = $query->orderBy('timestamp')
            ->get()
            ->groupBy(function ($metric) {
                return Carbon::parse($metric->timestamp)->format('Y-m-d');
            });

        $dates = [];
        $overallScores = [];
        $voiceScores = [];
        $dataScores = [];
        $cssrValues = [];
        $cdrValues = [];

        foreach ($metrics as $date => $group) {
            $dates[] = Carbon::parse($date)->format('M d');

            // Overall QoE Scores (FRS Section 4.3)
            $overallScores[] = round($group->avg(function ($metric) {
                return ($metric->scores['overall']['score'] ?? 0) * 100;
            }), 1);

            $voiceScores[] = round($group->avg(function ($metric) {
                return ($metric->scores['voice']['score'] ?? 0) * 100;
            }), 1);

            $dataScores[] = round($group->avg(function ($metric) {
                return ($metric->scores['data']['score'] ?? 0) * 100;
            }), 1);

            // Voice KPIs (FRS Section 4.1)
            $voiceAttempts = $group->sum(function ($metric) {
                return $metric->metrics['voice']['attempts'] ?? 0;
            });

            $voiceSetupOk = $group->sum(function ($metric) {
                return $metric->metrics['voice']['setupOk'] ?? 0;
            });

            $voiceCompleted = $group->sum(function ($metric) {
                return $metric->metrics['voice']['completed'] ?? 0;
            });

            $voiceDropped = $group->sum(function ($metric) {
                return $metric->metrics['voice']['dropped'] ?? 0;
            });

            // Calculate CSSR and CDR
            $cssr = $voiceAttempts > 0 ? ($voiceSetupOk / $voiceAttempts) * 100 : 0;
            $totalCalls = $voiceCompleted + $voiceDropped;
            $cdr = $totalCalls > 0 ? ($voiceDropped / $totalCalls) * 100 : 0;

            $cssrValues[] = round($cssr, 1);
            $cdrValues[] = round($cdr, 1);
        }

        return [
            'datasets' => [
                [
                    'label' => 'Overall QoE Score',
                    'data' => $overallScores,
                    'backgroundColor' => 'rgba(251, 191, 36, 0.3)',
                    'borderColor' => 'rgb(251, 191, 36)',
                    'yAxisID' => 'y1',
                    'type' => 'line',
                    'borderWidth' => 3,
                ],
                [
                    'label' => 'Voice Score (40%)',
                    'data' => $voiceScores,
                    'backgroundColor' => 'rgba(59, 130, 246, 0.3)',
                    'borderColor' => 'rgb(59, 130, 246)',
                    'yAxisID' => 'y1',
                    'type' => 'line',
                    'borderWidth' => 2,
                ],
                [
                    'label' => 'Data Score (60%)',
                    'data' => $dataScores,
                    'backgroundColor' => 'rgba(34, 197, 94, 0.3)',
                    'borderColor' => 'rgb(34, 197, 94)',
                    'yAxisID' => 'y1',
                    'type' => 'line',
                    'borderWidth' => 2,
                ],
                [
                    'label' => 'CSSR (%)',
                    'data' => $cssrValues,
                    'backgroundColor' => 'rgba(139, 92, 246, 0.5)',
                    'borderColor' => 'rgb(139, 92, 246)',
                    'yAxisID' => 'y',
                    'type' => 'bar',
                ],
                [
                    'label' => 'CDR (%)',
                    'data' => $cdrValues,
                    'backgroundColor' => 'rgba(239, 68, 68, 0.5)',
                    'borderColor' => 'rgb(239, 68, 68)',
                    'yAxisID' => 'y',
                    'type' => 'bar',
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
                    'position' => 'left',
                    'title' => [
                        'display' => true,
                        'text' => 'Voice KPIs (%)',
                    ],
                    'max' => 100,
                ],
                'y1' => [
                    'position' => 'right',
                    'beginAtZero' => true,
                    'max' => 100,
                    'title' => [
                        'display' => true,
                        'text' => 'QoE Scores (%)',
                    ],
                    'grid' => [
                        'drawOnChartArea' => false,
                    ],
                ],
            ],
            'plugins' => [
                'legend' => [
                    'display' => true,
                    'position' => 'top',
                ],
                'tooltip' => [
                    'mode' => 'index',
                    'intersect' => false,
                ],
            ],
        ];
    }
}







