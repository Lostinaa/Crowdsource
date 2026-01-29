<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PushTokenResource\Pages;
use App\Models\PushToken;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class PushTokenResource extends Resource
{
    protected static ?string $model = PushToken::class;

    protected static ?string $navigationIcon = 'heroicon-o-device-phone-mobile';

    protected static ?string $navigationGroup = 'System';

    protected static ?string $modelLabel = 'Push Token';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Select::make('user_id')
                    ->relationship('user', 'email')
                    ->searchable()
                    ->preload(),
                Forms\Components\TextInput::make('token')
                    ->required()
                    ->maxLength(255)
                    ->disabled(), // Tokens are managed by app
                Forms\Components\TextInput::make('platform')
                    ->maxLength(50),
                Forms\Components\TextInput::make('device_name')
                    ->maxLength(255),
                Forms\Components\Toggle::make('is_active')
                    ->required(),
                Forms\Components\DateTimePicker::make('last_used_at'),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('user.email')
                    ->label('User')
                    ->searchable(),
                Tables\Columns\TextColumn::make('platform')
                    ->badge()
                    ->color(fn(string $state): string => match ($state) {
                        'ios' => 'gray',
                        'android' => 'success',
                        default => 'info',
                    }),
                Tables\Columns\TextColumn::make('device_name')
                    ->searchable(),
                Tables\Columns\IconColumn::make('is_active')
                    ->boolean(),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('last_used_at')
                    ->dateTime()
                    ->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('platform')
                    ->options([
                        'android' => 'Android',
                        'ios' => 'iOS',
                    ]),
                Tables\Filters\TernaryFilter::make('is_active'),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPushTokens::route('/'),
            // 'create' => Pages\CreatePushToken::route('/create'), // Should come from API
            'edit' => Pages\EditPushToken::route('/{record}/edit'),
        ];
    }
}
