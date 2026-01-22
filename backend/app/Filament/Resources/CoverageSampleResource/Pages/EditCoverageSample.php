<?php

namespace App\Filament\Resources\CoverageSampleResource\Pages;

use App\Filament\Resources\CoverageSampleResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditCoverageSample extends EditRecord
{
    protected static string $resource = CoverageSampleResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\ViewAction::make(),
            Actions\DeleteAction::make(),
        ];
    }
}
