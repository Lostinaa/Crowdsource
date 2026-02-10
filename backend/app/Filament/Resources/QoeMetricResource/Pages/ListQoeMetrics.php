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
                        fputcsv($file, [
                            'ID',
                            'Email',
                            'Timestamp',
                            'Region',
                            'Overall Score',
                            'Voice Score',
                            'Data Score',
                            'Platform',
                            'Model',
                        ]);

                        foreach ($records as $record) {
                            fputcsv($file, [
                                $record->id,
                                $record->user?->email ?? 'Anonymous',
                                $record->timestamp,
                                $record->region ?? 'Unknown',
                                round(($record->scores['overall']['score'] ?? 0) * 100, 1),
                                round(($record->scores['voice']['score'] ?? 0) * 100, 1),
                                round(($record->scores['data']['score'] ?? 0) * 100, 1),
                                $record->device_info['platform'] ?? 'N/A',
                                $record->device_info['model'] ?? 'N/A',
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
