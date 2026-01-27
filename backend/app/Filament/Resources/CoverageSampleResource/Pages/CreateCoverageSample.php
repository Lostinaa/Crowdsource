<?php

namespace App\Filament\Resources\CoverageSampleResource\Pages;

use App\Filament\Resources\CoverageSampleResource;
use Filament\Resources\Pages\CreateRecord;
use App\Services\AuditLogService;

class CreateCoverageSample extends CreateRecord
{
    protected static string $resource = CoverageSampleResource::class;

    protected function afterCreate(): void
    {
        AuditLogService::log('created', $this->record, null, $this->record->toArray(), "Coverage Sample created");
    }
}
