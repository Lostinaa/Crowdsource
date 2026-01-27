<?php

namespace App\Filament\Resources\UserResource\Pages;

use App\Filament\Resources\UserResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;
use App\Services\AuditLogService;

class EditUser extends EditRecord
{
    protected static string $resource = UserResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make()
                ->after(function ($record) {
                    AuditLogService::log('deleted', $record, $record->toArray(), null, "User '{$record->email}' deleted");
                }),
        ];
    }

    protected function afterSave(): void
    {
        AuditLogService::log('updated', $this->record, $this->record->getOriginal(), $this->record->toArray(), "User '{$this->record->email}' updated");
    }
}
