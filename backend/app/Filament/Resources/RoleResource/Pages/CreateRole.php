<?php

namespace App\Filament\Resources\RoleResource\Pages;

use App\Filament\Resources\RoleResource;
use Filament\Resources\Pages\CreateRecord;
use App\Services\AuditLogService;

class CreateRole extends CreateRecord
{
    protected static string $resource = RoleResource::class;

    protected function afterCreate(): void
    {
        AuditLogService::log('created', $this->record, null, $this->record->toArray(), "Role '{$this->record->name}' created");
    }
}
