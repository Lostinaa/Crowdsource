<?php

namespace App\Filament\Resources\CoverageSampleResource\Pages;

use App\Filament\Resources\CoverageSampleResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListCoverageSamples extends ListRecords
{
    protected static string $resource = CoverageSampleResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
