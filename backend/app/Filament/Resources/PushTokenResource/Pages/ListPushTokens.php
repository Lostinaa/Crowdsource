<?php

namespace App\Filament\Resources\PushTokenResource\Pages;

use App\Filament\Resources\PushTokenResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListPushTokens extends ListRecords
{
    protected static string $resource = PushTokenResource::class;

    protected function getHeaderActions(): array
    {
        return [
            // Actions\CreateAction::make(), // Managed via API
        ];
    }
}
