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

                        // Helper to safely read scores (flat or nested)
                        $getScore = function ($scores, $type) {
                            $v = $scores[$type] ?? null;
                            if (is_array($v) && isset($v['score']))
                                return round(($v['score'] ?? 0) * 100, 1);
                            if (is_numeric($v))
                                return round($v * 100, 1);
                            return 0;
                        };

                        // Helper to get avg from array
                        $avg = function ($arr) {
                            if (!is_array($arr) || count($arr) === 0)
                                return '';
                            return round(array_sum($arr) / count($arr), 2);
                        };

                        // Helper to convert array to semicolon-separated string
                        $arrToStr = function ($arr) {
                            if (!is_array($arr) || count($arr) === 0)
                                return '';
                            return implode('; ', array_map(function ($v) {
                                return is_numeric($v) ? round($v, 2) : $v;
                            }, $arr));
                        };

                        // CSV Header
                        fputcsv($file, [
                            // Basic info
                            'ID',
                            'Email',
                            'Timestamp',
                            'Region',
                            'Platform',
                            'Model',
                            'Brand',
                            'Operator',
                            'Network Type',
                            'OS Version',
                            // Location
                            'Latitude',
                            'Longitude',
                            // Scores
                            'Overall Score (%)',
                            'Voice Score (%)',
                            'Data Score (%)',
                            'Browsing Score (%)',
                            'Streaming Score (%)',
                            'HTTP Score (%)',
                            'Social Score (%)',
                            'Latency Score (%)',
                            // Voice KPIs
                            'Voice Attempts',
                            'Voice Setup OK',
                            'Voice Completed',
                            'Voice Dropped',
                            'CSSR (%)',
                            'CDR (%)',
                            'Avg Setup Time (ms)',
                            'Avg MOS',
                            'Voice Setup Times (ms)',
                            'Voice MOS Samples',
                            'Call Disconnect Reasons',
                            // Browsing
                            'Browsing Requests',
                            'Browsing Completed',
                            'Avg Browsing Duration (ms)',
                            'Avg DNS Resolution (ms)',
                            'Avg Browsing Throughput (Kbps)',
                            'Browsing Durations (ms)',
                            'DNS Resolution Times (ms)',
                            'Browsing Throughputs (Kbps)',
                            // Streaming
                            'Streaming Requests',
                            'Streaming Completed',
                            'Avg Streaming MOS',
                            'Avg Streaming Setup (ms)',
                            'Avg Streaming Throughput (Kbps)',
                            'Avg Buffering Count',
                            'Streaming MOS Samples',
                            'Streaming Setup Times (ms)',
                            'Streaming Throughputs (Kbps)',
                            'Buffering Counts',
                            'Resolutions',
                            // HTTP DL/UL
                            'HTTP DL Requests',
                            'HTTP DL Completed',
                            'Avg DL Throughput (Mbps)',
                            'DL Throughputs (Mbps)',
                            'HTTP UL Requests',
                            'HTTP UL Completed',
                            'Avg UL Throughput (Mbps)',
                            'UL Throughputs (Mbps)',
                            // FTP DL/UL
                            'FTP DL Requests',
                            'FTP DL Completed',
                            'Avg FTP DL Throughput (Mbps)',
                            'FTP DL Throughputs (Mbps)',
                            'FTP UL Requests',
                            'FTP UL Completed',
                            'Avg FTP UL Throughput (Mbps)',
                            'FTP UL Throughputs (Mbps)',
                            // Social
                            'Social Requests',
                            'Social Completed',
                            'Avg Social Duration (ms)',
                            'Avg Social Throughput (Kbps)',
                            'Social Durations (ms)',
                            'Social Throughputs (Kbps)',
                            // Latency
                            'Latency Requests',
                            'Latency Completed',
                            'Avg Latency Score',
                            'Latency Scores',
                            // Signal
                            'RSRP',
                            'RSRQ',
                            'RSSNR',
                            'CQI',
                            'PCI',
                            'eNB',
                            'Cell ID',
                            'TAC',
                            'ECI',
                            'Data State',
                            'Data Activity',
                            'Call State',
                            'SIM State',
                            'Is Roaming',
                            // Meta
                            'IP Address',
                            'User Agent',
                        ]);

                        foreach ($records as $record) {
                            $m = $record->metrics ?? [];
                            $s = $record->scores ?? [];
                            $loc = $record->location ?? [];
                            $d = $record->device_info ?? [];
                            $voice = $m['voice'] ?? [];
                            $data = $m['data'] ?? [];

                            // Voice calculations
                            $attempts = $voice['attempts'] ?? 0;
                            $setupOk = $voice['setupOk'] ?? 0;
                            $completed = $voice['completed'] ?? 0;
                            $dropped = $voice['dropped'] ?? 0;
                            $cssr = $attempts > 0 ? round(($setupOk / $attempts) * 100, 1) : '';
                            $totalCalls = $completed + $dropped;
                            $cdr = $totalCalls > 0 ? round(($dropped / $totalCalls) * 100, 1) : '';
                            $setupTimes = $voice['setupTimes'] ?? [];
                            $avgSetup = $voice['avgSetupTimeMs'] ?? $avg($setupTimes);
                            $avgMos = $avg($voice['mosSamples'] ?? []);

                            fputcsv($file, [
                                // Basic info
                                $record->id,
                                $record->user?->email ?? 'Anonymous',
                                $record->timestamp,
                                $record->region ?? 'Unknown',
                                $d['platform'] ?? 'N/A',
                                $d['model'] ?? 'N/A',
                                $d['brand'] ?? 'N/A',
                                $d['operator'] ?? 'N/A',
                                $d['netType'] ?? 'N/A',
                                $d['Android_version'] ?? $d['osVersion'] ?? 'N/A',
                                // Location
                                $loc['latitude'] ?? '',
                                $loc['longitude'] ?? '',
                                // Scores
                                $getScore($s, 'overall'),
                                $getScore($s, 'voice'),
                                $getScore($s, 'data'),
                                $getScore($s, 'browsing'),
                                $getScore($s, 'streaming'),
                                $getScore($s, 'http'),
                                $getScore($s, 'social'),
                                $getScore($s, 'latency'),
                                // Voice KPIs
                                $attempts,
                                $setupOk,
                                $completed,
                                $dropped,
                                $cssr,
                                $cdr,
                                is_numeric($avgSetup) ? round($avgSetup, 0) : '',
                                $avgMos,
                                $arrToStr($voice['setupTimes'] ?? []),
                                $arrToStr($voice['mosSamples'] ?? []),
                                $arrToStr(array_map(function ($r) {
                                    if (is_array($r))
                                        return ($r['label'] ?? $r['code'] ?? '');
                                    return $r;
                                }, $voice['reasons'] ?? [])),
                                // Browsing
                                $data['browsing']['requests'] ?? 0,
                                $data['browsing']['completed'] ?? 0,
                                $avg($data['browsing']['durations'] ?? []),
                                $avg($data['browsing']['dnsResolutionTimes'] ?? []),
                                $avg($data['browsing']['throughputs'] ?? []),
                                $arrToStr($data['browsing']['durations'] ?? []),
                                $arrToStr($data['browsing']['dnsResolutionTimes'] ?? []),
                                $arrToStr($data['browsing']['throughputs'] ?? []),
                                // Streaming
                                $data['streaming']['requests'] ?? 0,
                                $data['streaming']['completed'] ?? 0,
                                $avg($data['streaming']['mosSamples'] ?? []),
                                $avg($data['streaming']['setupTimes'] ?? []),
                                $avg($data['streaming']['throughputs'] ?? []),
                                $avg($data['streaming']['bufferingCounts'] ?? []),
                                $arrToStr($data['streaming']['mosSamples'] ?? []),
                                $arrToStr($data['streaming']['setupTimes'] ?? []),
                                $arrToStr($data['streaming']['throughputs'] ?? []),
                                $arrToStr($data['streaming']['bufferingCounts'] ?? []),
                                $arrToStr($data['streaming']['resolutions'] ?? []),
                                // HTTP DL/UL
                                $data['http']['dl']['requests'] ?? 0,
                                $data['http']['dl']['completed'] ?? 0,
                                $avg($data['http']['dl']['throughputs'] ?? []),
                                $arrToStr($data['http']['dl']['throughputs'] ?? []),
                                $data['http']['ul']['requests'] ?? 0,
                                $data['http']['ul']['completed'] ?? 0,
                                $avg($data['http']['ul']['throughputs'] ?? []),
                                $arrToStr($data['http']['ul']['throughputs'] ?? []),
                                // FTP DL/UL
                                $data['ftp']['dl']['requests'] ?? 0,
                                $data['ftp']['dl']['completed'] ?? 0,
                                $avg($data['ftp']['dl']['throughputs'] ?? []),
                                $arrToStr($data['ftp']['dl']['throughputs'] ?? []),
                                $data['ftp']['ul']['requests'] ?? 0,
                                $data['ftp']['ul']['completed'] ?? 0,
                                $avg($data['ftp']['ul']['throughputs'] ?? []),
                                $arrToStr($data['ftp']['ul']['throughputs'] ?? []),
                                // Social
                                $data['social']['requests'] ?? 0,
                                $data['social']['completed'] ?? 0,
                                $avg($data['social']['durations'] ?? []),
                                $avg($data['social']['throughputs'] ?? []),
                                $arrToStr($data['social']['durations'] ?? []),
                                $arrToStr($data['social']['throughputs'] ?? []),
                                // Latency
                                $data['latency']['requests'] ?? 0,
                                $data['latency']['completed'] ?? 0,
                                $avg($data['latency']['scores'] ?? []),
                                $arrToStr($data['latency']['scores'] ?? []),
                                // Signal
                                $d['rsrp'] ?? '',
                                $d['rsrq'] ?? '',
                                $d['rssnr'] ?? '',
                                $d['cqi'] ?? '',
                                $d['pci'] ?? '',
                                $d['enb'] ?? '',
                                $d['cellId'] ?? '',
                                $d['tac'] ?? '',
                                $d['eci'] ?? '',
                                $d['dataState'] ?? '',
                                $d['dataActivity'] ?? '',
                                $d['callState'] ?? '',
                                $d['simState'] ?? '',
                                $d['isRoaming'] ?? '',
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
