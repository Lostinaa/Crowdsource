<?php

namespace App\Filament\Resources\QoeMetricResource\Pages;

use App\Filament\Resources\QoeMetricResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListQoeMetrics extends ListRecords
{
    protected static string $resource = QoeMetricResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}

