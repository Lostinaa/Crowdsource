<?php

namespace App\Filament\Resources\QoeMetricResource\Pages;

use App\Filament\Resources\QoeMetricResource;
use App\Models\QoeMetric;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ListQoeMetrics extends ListRecords
{
    protected static string $resource = QoeMetricResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('export_csv')
                ->label('Export to CSV')
                ->icon('heroicon-o-document-arrow-down')
                ->color('success')
                ->action(function (): StreamedResponse {
                    $records = QoeMetric::with('user')->latest('timestamp')->get();
                    $filename = 'qoe_metrics_' . date('Y-m-d_H-i-s') . '.csv';

                    return response()->streamDownload(function () use ($records) {
                        $file = fopen('php://output', 'w');

                        // Full headers with all metrics
                        fputcsv($file, [
                            'ID',
                            'Email',
                            'Timestamp',
                            'Region',
                            // Scores
                            'Overall Score (%)',
                            'Voice Score (%)',
                            'Data Score (%)',
                            // Voice KPIs
                            'Voice Attempts',
                            'Voice Setup OK',
                            'Voice Completed',
                            'Voice Dropped',
                            'CSSR (%)',
                            'CDR (%)',
                            'Avg Setup Time (ms)',
                            // Data - Browsing
                            'Browsing Requests',
                            'Browsing Completed',
                            // Data - Streaming
                            'Streaming Requests',
                            'Streaming Completed',
                            // Data - HTTP DL
                            'HTTP DL Requests',
                            'HTTP DL Completed',
                            // Data - HTTP UL
                            'HTTP UL Requests',
                            'HTTP UL Completed',
                            // Data - Social
                            'Social Requests',
                            'Social Completed',
                            // Data - Latency
                            'Latency Requests',
                            'Latency Completed',
                            // Location
                            'Latitude',
                            'Longitude',
                            // Device
                            'Platform',
                            'Model',
                            'OS Version',
                            // Meta
                            'IP Address',
                            'User Agent',
                        ]);

                        foreach ($records as $record) {
                            $m = $record->metrics ?? [];
                            $s = $record->scores ?? [];
                            $loc = $record->location ?? [];
                            $dev = $record->device_info ?? [];

                            // Calculate CSSR and CDR
                            $attempts = $m['voice']['attempts'] ?? 0;
                            $setupOk = $m['voice']['setupOk'] ?? 0;
                            $completed = $m['voice']['completed'] ?? 0;
                            $dropped = $m['voice']['dropped'] ?? 0;
                            $cssr = $attempts > 0 ? round(($setupOk / $attempts) * 100, 1) : 0;
                            $totalCalls = $completed + $dropped;
                            $cdr = $totalCalls > 0 ? round(($dropped / $totalCalls) * 100, 1) : 0;

                            fputcsv($file, [
                                $record->id,
                                $record->user?->email ?? 'Anonymous',
                                $record->timestamp,
                                $record->region ?? 'Unknown',
                                // Scores
                                round(($s['overall']['score'] ?? 0) * 100, 1),
                                round(($s['voice']['score'] ?? 0) * 100, 1),
                                round(($s['data']['score'] ?? 0) * 100, 1),
                                // Voice KPIs
                                $attempts,
                                $setupOk,
                                $completed,
                                $dropped,
                                $cssr,
                                $cdr,
                                round($m['voice']['avgSetupTimeMs'] ?? 0, 0),
                                // Data - Browsing
                                $m['data']['browsing']['requests'] ?? 0,
                                $m['data']['browsing']['completed'] ?? 0,
                                // Data - Streaming
                                $m['data']['streaming']['requests'] ?? 0,
                                $m['data']['streaming']['completed'] ?? 0,
                                // Data - HTTP DL
                                $m['data']['http']['dl']['requests'] ?? 0,
                                $m['data']['http']['dl']['completed'] ?? 0,
                                // Data - HTTP UL
                                $m['data']['http']['ul']['requests'] ?? 0,
                                $m['data']['http']['ul']['completed'] ?? 0,
                                // Data - Social
                                $m['data']['social']['requests'] ?? 0,
                                $m['data']['social']['completed'] ?? 0,
                                // Data - Latency
                                $m['data']['latency']['requests'] ?? 0,
                                $m['data']['latency']['completed'] ?? 0,
                                // Location
                                $loc['latitude'] ?? '',
                                $loc['longitude'] ?? '',
                                // Device
                                $dev['platform'] ?? 'N/A',
                                $dev['model'] ?? 'N/A',
                                $dev['osVersion'] ?? 'N/A',
                                // Meta
                                $record->ip_address ?? '',
                                $record->user_agent ?? '',
                            ]);
                        }
                        fclose($file);
                    }, $filename, [
                        'Content-Type' => 'text/csv',
                    ]);
                }),
            Actions\CreateAction::make(),
        ];
    }
}
