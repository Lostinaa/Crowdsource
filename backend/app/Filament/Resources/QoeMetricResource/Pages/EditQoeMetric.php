<?php

namespace App\Filament\Resources\QoeMetricResource\Pages;

use App\Filament\Resources\QoeMetricResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;
use App\Services\AuditLogService;

class EditQoeMetric extends EditRecord
{
    protected static string $resource = QoeMetricResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\ViewAction::make(),
            Actions\DeleteAction::make()
                ->after(function ($record) {
                    AuditLogService::log('deleted', $record, $record->toArray(), null, "QoE Metric deleted");
                }),
        ];
    }

    protected function afterSave(): void
    {
        AuditLogService::log('updated', $this->record, $this->record->getOriginal(), $this->record->toArray(), "QoE Metric updated");
    }
}







