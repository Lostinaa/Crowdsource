<?php

namespace App\Filament\Resources\QoeMetricResource\Pages;

use App\Filament\Resources\QoeMetricResource;
use Filament\Resources\Pages\CreateRecord;
use App\Services\AuditLogService;

class CreateQoeMetric extends CreateRecord
{
    protected static string $resource = QoeMetricResource::class;

    protected function afterCreate(): void
    {
        AuditLogService::log('created', $this->record, null, $this->record->toArray(), "QoE Metric created");
    }
}







