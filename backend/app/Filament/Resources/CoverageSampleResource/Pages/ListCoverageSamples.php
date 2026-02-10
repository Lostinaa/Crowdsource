<?php

namespace App\Filament\Resources\CoverageSampleResource\Pages;

use App\Filament\Resources\CoverageSampleResource;
use App\Models\CoverageSample;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ListCoverageSamples extends ListRecords
{
    protected static string $resource = CoverageSampleResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('export_csv')
                ->label('Export to CSV')
                ->icon('heroicon-o-document-arrow-down')
                ->color('success')
                ->action(function (): StreamedResponse {
                    $records = CoverageSample::with('user')->latest('timestamp')->get();
                    $filename = 'coverage_samples_' . date('Y-m-d_H-i-s') . '.csv';

                    return response()->streamDownload(function () use ($records) {
                        $file = fopen('php://output', 'w');

                        // Full headers with all coverage data
                        fputcsv($file, [
                            'ID',
                            'Email',
                            'Timestamp',
                            'Region',
                            // Location
                            'Latitude',
                            'Longitude',
                            // Network
                            'Network Category',
                            'Network Type',
                            'Operator',
                            // Signal
                            'RSRP (dBm)',
                            'RSRQ (dB)',
                            'SINR (dB)',
                            'RSSI (dBm)',
                            // Cell
                            'Cell ID',
                            'eNB',
                            'TAC',
                            'PCI',
                            // Data State
                            'Data State',
                            'Roaming',
                            // Device
                            'Device Model',
                            'Platform',
                            'OS Version',
                            // Meta
                            'IP Address',
                        ]);

                        foreach ($records as $record) {
                            fputcsv($file, [
                                $record->id,
                                $record->user?->email ?? 'Anonymous',
                                $record->timestamp,
                                $record->region ?? 'Unknown',
                                // Location
                                $record->latitude,
                                $record->longitude,
                                // Network
                                $record->network_category ?? '',
                                $record->network_type ?? '',
                                $record->operator ?? '',
                                // Signal
                                $record->rsrp ?? '',
                                $record->rsrq ?? '',
                                $record->sinr ?? '',
                                $record->rssi ?? '',
                                // Cell
                                $record->cell_id ?? '',
                                $record->enb ?? '',
                                $record->tac ?? '',
                                $record->pci ?? '',
                                // Data State
                                $record->data_state ?? '',
                                $record->roaming ? 'Yes' : 'No',
                                // Device
                                $record->device_model ?? '',
                                $record->platform ?? '',
                                $record->os_version ?? '',
                                // Meta
                                $record->ip_address ?? '',
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
