<?php

namespace App\Filament\Resources\PushTokenResource\Pages;

use App\Filament\Resources\PushTokenResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditPushToken extends EditRecord
{
    protected static string $resource = PushTokenResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
