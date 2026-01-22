<?php

namespace App\Filament\Resources\CoverageSampleResource\Pages;

use App\Filament\Resources\CoverageSampleResource;
use Filament\Actions;
use Filament\Resources\Pages\ViewRecord;

class ViewCoverageSample extends ViewRecord
{
    protected static string $resource = CoverageSampleResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\EditAction::make(),
            Actions\DeleteAction::make(),
        ];
    }
}
