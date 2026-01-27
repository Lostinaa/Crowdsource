<?php

namespace App\Filament\Resources\CoverageSampleResource\Pages;

use App\Filament\Resources\CoverageSampleResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;
use App\Services\AuditLogService;

class EditCoverageSample extends EditRecord
{
    protected static string $resource = CoverageSampleResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\ViewAction::make(),
            Actions\DeleteAction::make()
                ->after(function ($record) {
                    AuditLogService::log('deleted', $record, $record->toArray(), null, "Coverage Sample deleted");
                }),
        ];
    }

    protected function afterSave(): void
    {
        AuditLogService::log('updated', $this->record, $this->record->getOriginal(), $this->record->toArray(), "Coverage Sample updated");
    }
}
