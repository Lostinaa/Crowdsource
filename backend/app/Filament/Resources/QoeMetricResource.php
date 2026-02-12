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

    public static function canViewAny(): bool
    {
        return auth()->user()?->hasPermission('view_metrics') ?? false;
    }

    public static function canCreate(): bool
    {
        return auth()->user()?->hasPermission('manage_metrics') ?? false;
    }

    public static function canDeleteAny(): bool
    {
        // Allow all authenticated admin users to access bulk actions (including CSV export)
        return true;
    }

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
                    ->columns(2)
                    ->collapsible(),

                Forms\Components\Section::make('Voice Details')
                    ->schema([
                        Forms\Components\TextInput::make('scores.voice.mosAvg')
                            ->label('Avg MOS')
                            ->numeric()
                            ->disabled(),

                        Forms\Components\Repeater::make('metrics.voice.reasons')
                            ->label('Disconnect History')
                            ->schema([
                                Forms\Components\TextInput::make('label')
                                    ->label('Reason'),
                                Forms\Components\TextInput::make('code')
                                    ->label('Code'),
                                Forms\Components\TextInput::make('source')
                                    ->label('Source'),
                            ])
                            ->columns(3)
                            ->disabled()
                            ->columnSpanFull(),

                        Forms\Components\TagsInput::make('metrics.voice.setupTimes')
                            ->label('Setup Times (ms)')
                            ->disabled()
                            ->columnSpanFull(),
                    ])
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
                    ->color(fn(string $state): string => match ($state) {
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

                Tables\Columns\TextColumn::make('region')
                    ->label('Region')
                    ->sortable()
                    ->searchable()
                    ->badge()
                    ->color('info'),

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
                    ->formatStateUsing(fn($state) => number_format((float) $state * 100, 1) . '%')
                    ->sortable()
                    ->color(fn($state): string => match (true) {
                        $state >= 0.80 => 'success',
                        $state >= 0.60 => 'warning',
                        default => 'danger',
                    }),

                Tables\Columns\TextColumn::make('scores.voice.score')
                    ->label('Voice Score')
                    ->formatStateUsing(fn($state) => number_format((float) $state * 100, 1) . '%')
                    ->toggleable(),

                Tables\Columns\TextColumn::make('scores.data.score')
                    ->label('Data Score')
                    ->formatStateUsing(fn($state) => number_format((float) $state * 100, 1) . '%')
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
                                fn(Builder $query, $date): Builder => $query->whereDate('timestamp', '>=', $date),
                            )
                            ->when(
                                $data['created_until'],
                                fn(Builder $query, $date): Builder => $query->whereDate('timestamp', '<=', $date),
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
                            fn(Builder $query, $platform): Builder => $query->whereJsonContains('device_info->platform', $platform),
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
                    Tables\Actions\BulkAction::make('export_csv')
                        ->label('Export to CSV')
                        ->icon('heroicon-o-document-arrow-down')
                        ->action(function (\Illuminate\Support\Collection $records) {
                            $filename = 'qoe_metrics_' . date('Y-m-d_H-i-s') . '.csv';
                            $headers = [
                                'Content-Type' => 'text/csv',
                                'Content-Disposition' => "attachment; filename=\"$filename\"",
                            ];

                            $callback = function () use ($records) {
                                $file = fopen('php://output', 'w');

                                // Helper to safely read scores (flat or nested)
                                $getScore = function ($scores, $type) {
                                    $v = $scores[$type] ?? null;
                                    if (is_array($v) && isset($v['score']))
                                        return ($v['score'] ?? 0) * 100;
                                    if (is_numeric($v))
                                        return $v * 100;
                                    return 0;
                                };

                                // Helper to get avg from array
                                $avg = function ($arr) {
                                    if (!is_array($arr) || count($arr) === 0)
                                        return '';
                                    return round(array_sum($arr) / count($arr), 2);
                                };

                                // Helper to convert array to comma-separated string
                                $arrToStr = function ($arr) {
                                    if (!is_array($arr) || count($arr) === 0)
                                        return '';
                                    return implode('; ', array_map(function ($v) {
                                        return is_numeric($v) ? round($v, 2) : $v;
                                    }, $arr));
                                };

                                fputcsv($file, [
                                    // Basic info
                                    'ID',
                                    'Email',
                                    'Timestamp',
                                    'Region',
                                    'Platform',
                                    'Model',
                                    'Brand',
                                    'Operator',
                                    'Network Type',
                                    'OS Version',
                                    // Location
                                    'Latitude',
                                    'Longitude',
                                    // Scores
                                    'Overall Score (%)',
                                    'Voice Score (%)',
                                    'Data Score (%)',
                                    'Browsing Score (%)',
                                    'Streaming Score (%)',
                                    'HTTP Score (%)',
                                    'Social Score (%)',
                                    'Latency Score (%)',
                                    // Voice KPIs
                                    'Voice Attempts',
                                    'Voice Setup OK',
                                    'Voice Completed',
                                    'Voice Dropped',
                                    'CSSR (%)',
                                    'CDR (%)',
                                    'Avg Setup Time (ms)',
                                    'Avg MOS',
                                    'Voice Setup Times (ms)',
                                    'Voice MOS Samples',
                                    'Call Disconnect Reasons',
                                    // Browsing
                                    'Browsing Requests',
                                    'Browsing Completed',
                                    'Avg Browsing Duration (ms)',
                                    'Avg DNS Resolution (ms)',
                                    'Avg Browsing Throughput (Kbps)',
                                    'Browsing Durations (ms)',
                                    'DNS Resolution Times (ms)',
                                    'Browsing Throughputs (Kbps)',
                                    // Streaming
                                    'Streaming Requests',
                                    'Streaming Completed',
                                    'Avg Streaming MOS',
                                    'Avg Streaming Setup (ms)',
                                    'Avg Streaming Throughput (Kbps)',
                                    'Avg Buffering Count',
                                    'Streaming MOS Samples',
                                    'Streaming Setup Times (ms)',
                                    'Streaming Throughputs (Kbps)',
                                    'Buffering Counts',
                                    'Resolutions',
                                    // HTTP DL/UL
                                    'HTTP DL Requests',
                                    'HTTP DL Completed',
                                    'Avg DL Throughput (Mbps)',
                                    'DL Throughputs (Mbps)',
                                    'HTTP UL Requests',
                                    'HTTP UL Completed',
                                    'Avg UL Throughput (Mbps)',
                                    'UL Throughputs (Mbps)',
                                    // FTP DL/UL
                                    'FTP DL Requests',
                                    'FTP DL Completed',
                                    'Avg FTP DL Throughput (Mbps)',
                                    'FTP DL Throughputs (Mbps)',
                                    'FTP UL Requests',
                                    'FTP UL Completed',
                                    'Avg FTP UL Throughput (Mbps)',
                                    'FTP UL Throughputs (Mbps)',
                                    // Social
                                    'Social Requests',
                                    'Social Completed',
                                    'Avg Social Duration (ms)',
                                    'Avg Social Throughput (Kbps)',
                                    'Social Durations (ms)',
                                    'Social Throughputs (Kbps)',
                                    // Latency
                                    'Latency Requests',
                                    'Latency Completed',
                                    'Avg Latency Score',
                                    'Latency Scores',
                                    // Signal
                                    'RSRP',
                                    'RSRQ',
                                    'RSSNR',
                                    'CQI',
                                    'PCI',
                                    'eNB',
                                    'Cell ID',
                                    'TAC',
                                    'ECI',
                                    'Data State',
                                    'Data Activity',
                                    'Call State',
                                    'SIM State',
                                    'Is Roaming',
                                ]);

                                foreach ($records as $record) {
                                    $m = $record->metrics ?? [];
                                    $s = $record->scores ?? [];
                                    $d = $record->device_info ?? [];
                                    $loc = $record->location ?? [];
                                    $voice = $m['voice'] ?? [];
                                    $data = $m['data'] ?? [];

                                    // Voice calculations
                                    $attempts = $voice['attempts'] ?? 0;
                                    $setupOk = $voice['setupOk'] ?? 0;
                                    $completed = $voice['completed'] ?? 0;
                                    $dropped = $voice['dropped'] ?? 0;
                                    $cssr = $attempts > 0 ? round(($setupOk / $attempts) * 100, 1) : '';
                                    $cdr = ($completed + $dropped) > 0 ? round(($dropped / ($completed + $dropped)) * 100, 1) : '';
                                    $setupTimes = $voice['setupTimes'] ?? [];
                                    $avgSetup = $voice['avgSetupTimeMs'] ?? $avg($setupTimes);
                                    $mosSamples = $voice['mosSamples'] ?? [];
                                    $avgMos = $avg($mosSamples);

                                    fputcsv($file, [
                                        // Basic info
                                        $record->id,
                                        $record->user?->email ?? 'Anonymous',
                                        $record->timestamp,
                                        $record->region,
                                        $d['platform'] ?? 'N/A',
                                        $d['model'] ?? 'N/A',
                                        $d['brand'] ?? 'N/A',
                                        $d['operator'] ?? 'N/A',
                                        $d['netType'] ?? 'N/A',
                                        $d['Android_version'] ?? $d['osVersion'] ?? 'N/A',
                                        // Location
                                        $loc['latitude'] ?? '',
                                        $loc['longitude'] ?? '',
                                        // Scores
                                        $getScore($s, 'overall'),
                                        $getScore($s, 'voice'),
                                        $getScore($s, 'data'),
                                        $getScore($s, 'browsing'),
                                        $getScore($s, 'streaming'),
                                        $getScore($s, 'http'),
                                        $getScore($s, 'social'),
                                        $getScore($s, 'latency'),
                                        // Voice KPIs
                                        $attempts,
                                        $setupOk,
                                        $completed,
                                        $dropped,
                                        $cssr,
                                        $cdr,
                                        is_numeric($avgSetup) ? round($avgSetup, 0) : '',
                                        $avgMos,
                                        $arrToStr($voice['setupTimes'] ?? []),
                                        $arrToStr($voice['mosSamples'] ?? []),
                                        $arrToStr(array_map(function ($r) {
                                            if (is_array($r))
                                                return ($r['label'] ?? $r['code'] ?? '');
                                            return $r;
                                        }, $voice['reasons'] ?? [])),
                                        // Browsing
                                        $data['browsing']['requests'] ?? 0,
                                        $data['browsing']['completed'] ?? 0,
                                        $avg($data['browsing']['durations'] ?? []),
                                        $avg($data['browsing']['dnsResolutionTimes'] ?? []),
                                        $avg($data['browsing']['throughputs'] ?? []),
                                        $arrToStr($data['browsing']['durations'] ?? []),
                                        $arrToStr($data['browsing']['dnsResolutionTimes'] ?? []),
                                        $arrToStr($data['browsing']['throughputs'] ?? []),
                                        // Streaming
                                        $data['streaming']['requests'] ?? 0,
                                        $data['streaming']['completed'] ?? 0,
                                        $avg($data['streaming']['mosSamples'] ?? []),
                                        $avg($data['streaming']['setupTimes'] ?? []),
                                        $avg($data['streaming']['throughputs'] ?? []),
                                        $avg($data['streaming']['bufferingCounts'] ?? []),
                                        $arrToStr($data['streaming']['mosSamples'] ?? []),
                                        $arrToStr($data['streaming']['setupTimes'] ?? []),
                                        $arrToStr($data['streaming']['throughputs'] ?? []),
                                        $arrToStr($data['streaming']['bufferingCounts'] ?? []),
                                        $arrToStr($data['streaming']['resolutions'] ?? []),
                                        // HTTP DL/UL
                                        $data['http']['dl']['requests'] ?? 0,
                                        $data['http']['dl']['completed'] ?? 0,
                                        $avg($data['http']['dl']['throughputs'] ?? []),
                                        $arrToStr($data['http']['dl']['throughputs'] ?? []),
                                        $data['http']['ul']['requests'] ?? 0,
                                        $data['http']['ul']['completed'] ?? 0,
                                        $avg($data['http']['ul']['throughputs'] ?? []),
                                        $arrToStr($data['http']['ul']['throughputs'] ?? []),
                                        // FTP DL/UL
                                        $data['ftp']['dl']['requests'] ?? 0,
                                        $data['ftp']['dl']['completed'] ?? 0,
                                        $avg($data['ftp']['dl']['throughputs'] ?? []),
                                        $arrToStr($data['ftp']['dl']['throughputs'] ?? []),
                                        $data['ftp']['ul']['requests'] ?? 0,
                                        $data['ftp']['ul']['completed'] ?? 0,
                                        $avg($data['ftp']['ul']['throughputs'] ?? []),
                                        $arrToStr($data['ftp']['ul']['throughputs'] ?? []),
                                        // Social
                                        $data['social']['requests'] ?? 0,
                                        $data['social']['completed'] ?? 0,
                                        $avg($data['social']['durations'] ?? []),
                                        $avg($data['social']['throughputs'] ?? []),
                                        $arrToStr($data['social']['durations'] ?? []),
                                        $arrToStr($data['social']['throughputs'] ?? []),
                                        // Latency
                                        $data['latency']['requests'] ?? 0,
                                        $data['latency']['completed'] ?? 0,
                                        $avg($data['latency']['scores'] ?? []),
                                        $arrToStr($data['latency']['scores'] ?? []),
                                        // Signal
                                        $d['rsrp'] ?? '',
                                        $d['rsrq'] ?? '',
                                        $d['rssnr'] ?? '',
                                        $d['cqi'] ?? '',
                                        $d['pci'] ?? '',
                                        $d['enb'] ?? '',
                                        $d['cellId'] ?? '',
                                        $d['tac'] ?? '',
                                        $d['eci'] ?? '',
                                        $d['dataState'] ?? '',
                                        $d['dataActivity'] ?? '',
                                        $d['callState'] ?? '',
                                        $d['simState'] ?? '',
                                        $d['isRoaming'] ?? '',
                                    ]);
                                }
                                fclose($file);
                            };

                            return response()->stream($callback, 200, $headers);
                        }),
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







