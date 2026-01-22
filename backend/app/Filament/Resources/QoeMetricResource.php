<?php

namespace App\Filament\Resources;

use App\Filament\Resources\QoeMetricResource\Pages;
use App\Models\QoeMetric;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class QoeMetricResource extends Resource
{
    protected static ?string $model = QoeMetric::class;

    protected static ?string $navigationIcon = 'heroicon-o-chart-bar-square';

    protected static ?string $navigationLabel = 'QoE Metrics';

    protected static ?string $modelLabel = 'QoE Metric';

    protected static ?string $pluralModelLabel = 'QoE Metrics';

    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Basic Information')
                    ->schema([
                        Forms\Components\Select::make('user_id')
                            ->relationship('user', 'email')
                            ->searchable()
                            ->preload(),
                        Forms\Components\DateTimePicker::make('timestamp')
                            ->required(),
                        Forms\Components\TextInput::make('ip_address')
                            ->maxLength(45),
                    ])
                    ->columns(3),
                
                Forms\Components\Section::make('Device Information')
                    ->schema([
                        Forms\Components\KeyValue::make('device_info')
                            ->label('Device Info (JSON)')
                            ->columnSpanFull(),
                    ])
                    ->collapsible()
                    ->collapsed(),
                
                Forms\Components\Section::make('Location')
                    ->schema([
                        Forms\Components\KeyValue::make('location')
                            ->label('Location (JSON)')
                            ->columnSpanFull(),
                    ])
                    ->collapsible()
                    ->collapsed(),
                
                Forms\Components\Section::make('Voice Metrics')
                    ->schema([
                        Forms\Components\TextInput::make('metrics.voice.attempts')
                            ->label('Call Attempts')
                            ->numeric()
                            ->disabled(),
                        Forms\Components\TextInput::make('metrics.voice.setupOk')
                            ->label('Setup OK')
                            ->numeric()
                            ->disabled(),
                        Forms\Components\TextInput::make('metrics.voice.completed')
                            ->label('Completed')
                            ->numeric()
                            ->disabled(),
                        Forms\Components\TextInput::make('metrics.voice.dropped')
                            ->label('Dropped')
                            ->numeric()
                            ->disabled(),
                    ])
                    ->columns(2)
                    ->collapsible(),
                
                Forms\Components\Section::make('Data Metrics')
                    ->schema([
                        Forms\Components\TextInput::make('metrics.data.browsing.requests')
                            ->label('Browsing Requests')
                            ->numeric()
                            ->disabled(),
                        Forms\Components\TextInput::make('metrics.data.streaming.requests')
                            ->label('Streaming Requests')
                            ->numeric()
                            ->disabled(),
                        Forms\Components\TextInput::make('metrics.data.http.dl.requests')
                            ->label('HTTP DL Requests')
                            ->numeric()
                            ->disabled(),
                        Forms\Components\TextInput::make('metrics.data.http.ul.requests')
                            ->label('HTTP UL Requests')
                            ->numeric()
                            ->disabled(),
                    ])
                    ->columns(2)
                    ->collapsible(),
                
                Forms\Components\Section::make('QoE Scores')
                    ->schema([
                        Forms\Components\TextInput::make('scores.overall.score')
                            ->label('Overall Score')
                            ->numeric()
                            ->disabled()
                            ->suffix('%'),
                        Forms\Components\TextInput::make('scores.voice.score')
                            ->label('Voice Score')
                            ->numeric()
                            ->disabled()
                            ->suffix('%'),
                        Forms\Components\TextInput::make('scores.data.score')
                            ->label('Data Score')
                            ->numeric()
                            ->disabled()
                            ->suffix('%'),
                        Forms\Components\TextInput::make('scores.browsing.score')
                            ->label('Browsing Score')
                            ->numeric()
                            ->disabled()
                            ->suffix('%'),
                        Forms\Components\TextInput::make('scores.streaming.score')
                            ->label('Streaming Score')
                            ->numeric()
                            ->disabled()
                            ->suffix('%'),
                    ])
                    ->columns(2)
                    ->collapsible(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')
                    ->label('ID')
                    ->sortable()
                    ->searchable(),
                
                Tables\Columns\TextColumn::make('user.email')
                    ->label('User')
                    ->sortable()
                    ->searchable()
                    ->default('Anonymous'),
                
                Tables\Columns\TextColumn::make('timestamp')
                    ->dateTime()
                    ->sortable()
                    ->searchable(),
                
                Tables\Columns\TextColumn::make('device_info.platform')
                    ->label('Platform')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'ios' => 'info',
                        'android' => 'success',
                        default => 'gray',
                    })
                    ->searchable(query: function (Builder $query, string $search): Builder {
                        return $query->whereJsonContains('device_info->platform', $search);
                    }),
                
                Tables\Columns\TextColumn::make('device_info.model')
                    ->label('Device Model')
                    ->searchable(query: function (Builder $query, string $search): Builder {
                        return $query->whereJsonContains('device_info->model', $search);
                    })
                    ->limit(30),
                
                Tables\Columns\TextColumn::make('metrics.voice.attempts')
                    ->label('Voice Attempts')
                    ->numeric()
                    ->sortable(query: function (Builder $query, string $direction): Builder {
                        return $query->orderByRaw("CAST(metrics->'voice'->>'attempts' AS INTEGER) {$direction}");
                    }),
                
                Tables\Columns\TextColumn::make('metrics.voice.completed')
                    ->label('Voice Completed')
                    ->numeric()
                    ->sortable(query: function (Builder $query, string $direction): Builder {
                        return $query->orderByRaw("CAST(metrics->'voice'->>'completed' AS INTEGER) {$direction}");
                    }),
                
                Tables\Columns\TextColumn::make('scores.overall.score')
                    ->label('Overall Score')
                    ->numeric(decimalPlaces: 1)
                    ->suffix('%')
                    ->sortable()
                    ->color(fn ($state): string => match (true) {
                        $state >= 80 => 'success',
                        $state >= 60 => 'warning',
                        default => 'danger',
                    }),
                
                Tables\Columns\TextColumn::make('scores.voice.score')
                    ->label('Voice Score')
                    ->numeric(decimalPlaces: 1)
                    ->suffix('%')
                    ->toggleable(),
                
                Tables\Columns\TextColumn::make('scores.data.score')
                    ->label('Data Score')
                    ->numeric(decimalPlaces: 1)
                    ->suffix('%')
                    ->toggleable(),
                
                Tables\Columns\TextColumn::make('location.latitude')
                    ->label('Latitude')
                    ->numeric(decimalPlaces: 6)
                    ->toggleable(isToggledHiddenByDefault: true),
                
                Tables\Columns\TextColumn::make('location.longitude')
                    ->label('Longitude')
                    ->numeric(decimalPlaces: 6)
                    ->toggleable(isToggledHiddenByDefault: true),
                
                Tables\Columns\TextColumn::make('ip_address')
                    ->label('IP Address')
                    ->searchable()
                    ->toggleable(isToggledHiddenByDefault: true),
                
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('user_id')
                    ->relationship('user', 'email')
                    ->searchable()
                    ->preload(),
                
                Tables\Filters\Filter::make('timestamp')
                    ->form([
                        Forms\Components\DatePicker::make('created_from')
                            ->label('Created from'),
                        Forms\Components\DatePicker::make('created_until')
                            ->label('Created until'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['created_from'],
                                fn (Builder $query, $date): Builder => $query->whereDate('timestamp', '>=', $date),
                            )
                            ->when(
                                $data['created_until'],
                                fn (Builder $query, $date): Builder => $query->whereDate('timestamp', '<=', $date),
                            );
                    }),
                
                Tables\Filters\Filter::make('platform')
                    ->form([
                        Forms\Components\Select::make('platform')
                            ->options([
                                'ios' => 'iOS',
                                'android' => 'Android',
                            ]),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query->when(
                            $data['platform'],
                            fn (Builder $query, $platform): Builder => $query->whereJsonContains('device_info->platform', $platform),
                        );
                    }),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('timestamp', 'desc');
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
            'index' => Pages\ListQoeMetrics::route('/'),
            'create' => Pages\CreateQoeMetric::route('/create'),
            'view' => Pages\ViewQoeMetric::route('/{record}'),
            'edit' => Pages\EditQoeMetric::route('/{record}/edit'),
        ];
    }
}







