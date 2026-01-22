<?php

namespace App\Filament\Resources;

use App\Filament\Resources\CoverageSampleResource\Pages;
use App\Models\CoverageSample;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class CoverageSampleResource extends Resource
{
    protected static ?string $model = CoverageSample::class;

    protected static ?string $navigationIcon = 'heroicon-o-map';

    protected static ?string $navigationLabel = 'Coverage Samples';

    protected static ?string $modelLabel = 'Coverage Sample';

    protected static ?string $pluralModelLabel = 'Coverage Samples';

    protected static ?int $navigationSort = 2;

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
                    ])
                    ->columns(2),
                
                Forms\Components\Section::make('Location')
                    ->schema([
                        Forms\Components\TextInput::make('latitude')
                            ->numeric()
                            ->required()
                            ->step(0.0000001),
                        Forms\Components\TextInput::make('longitude')
                            ->numeric()
                            ->required()
                            ->step(0.0000001),
                        Forms\Components\TextInput::make('accuracy')
                            ->label('Accuracy (meters)')
                            ->numeric()
                            ->suffix('m'),
                    ])
                    ->columns(3),
                
                Forms\Components\Section::make('Network Information')
                    ->schema([
                        Forms\Components\TextInput::make('network_type')
                            ->label('Network Type')
                            ->maxLength(50),
                        Forms\Components\Select::make('network_category')
                            ->label('Network Category')
                            ->options([
                                '2G' => '2G',
                                '3G' => '3G',
                                '4G' => '4G',
                                '5G' => '5G',
                                'unknown' => 'Unknown',
                            ]),
                        Forms\Components\TextInput::make('rsrp')
                            ->label('RSRP')
                            ->suffix('dBm'),
                        Forms\Components\TextInput::make('rsrq')
                            ->label('RSRQ')
                            ->suffix('dB'),
                        Forms\Components\TextInput::make('rssnr')
                            ->label('RSSNR')
                            ->suffix('dB'),
                        Forms\Components\TextInput::make('cqi')
                            ->label('CQI'),
                    ])
                    ->columns(3),
                
                Forms\Components\Section::make('Cell Information')
                    ->schema([
                        Forms\Components\TextInput::make('enb')
                            ->label('eNB'),
                        Forms\Components\TextInput::make('cell_id')
                            ->label('Cell ID'),
                        Forms\Components\TextInput::make('pci')
                            ->label('PCI'),
                        Forms\Components\TextInput::make('tac')
                            ->label('TAC'),
                        Forms\Components\TextInput::make('eci')
                            ->label('ECI'),
                    ])
                    ->columns(3)
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
                
                Tables\Columns\TextColumn::make('latitude')
                    ->numeric(decimalPlaces: 6)
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('longitude')
                    ->numeric(decimalPlaces: 6)
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('network_category')
                    ->label('Network')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        '5G' => 'info',
                        '4G' => 'success',
                        '3G' => 'warning',
                        '2G' => 'danger',
                        default => 'gray',
                    })
                    ->sortable()
                    ->searchable(),
                
                Tables\Columns\TextColumn::make('network_type')
                    ->label('Network Type')
                    ->searchable()
                    ->toggleable(),
                
                Tables\Columns\TextColumn::make('rsrp')
                    ->label('RSRP')
                    ->suffix(' dBm')
                    ->sortable()
                    ->toggleable(),
                
                Tables\Columns\TextColumn::make('cell_id')
                    ->label('Cell ID')
                    ->searchable()
                    ->toggleable(),
                
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
                
                Tables\Filters\SelectFilter::make('network_category')
                    ->label('Network Category')
                    ->options([
                        '2G' => '2G',
                        '3G' => '3G',
                        '4G' => '4G',
                        '5G' => '5G',
                    ]),
                
                Tables\Filters\Filter::make('timestamp')
                    ->form([
                        Forms\Components\DatePicker::make('created_from')
                            ->label('From'),
                        Forms\Components\DatePicker::make('created_until')
                            ->label('Until'),
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
            'index' => Pages\ListCoverageSamples::route('/'),
            'create' => Pages\CreateCoverageSample::route('/create'),
            'view' => Pages\ViewCoverageSample::route('/{record}'),
            'edit' => Pages\EditCoverageSample::route('/{record}/edit'),
        ];
    }
}
