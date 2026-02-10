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
                        fputcsv($file, [
                            'ID',
                            'Email',
                            'Timestamp',
                            'Lat',
                            'Lon',
                            'Region',
                            'Network',
                            'Type',
                            'RSRP',
                            'Cell ID',
                            'eNB',
                        ]);

                        foreach ($records as $record) {
                            fputcsv($file, [
                                $record->id,
                                $record->user?->email ?? 'Anonymous',
                                $record->timestamp,
                                $record->latitude,
                                $record->longitude,
                                $record->region ?? 'Unknown',
                                $record->network_category,
                                $record->network_type,
                                $record->rsrp,
                                $record->cell_id,
                                $record->enb,
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
