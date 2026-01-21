<?php

namespace App\Filament\Resources\QoeMetricResource\Pages;

use App\Filament\Resources\QoeMetricResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditQoeMetric extends EditRecord
{
    protected static string $resource = QoeMetricResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\ViewAction::make(),
            Actions\DeleteAction::make(),
        ];
    }
}



