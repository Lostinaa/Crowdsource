<?php

namespace App\Filament\Pages;

use App\Http\Controllers\AnalyticsController;
use Filament\Pages\Page;
use Illuminate\Http\Request;

class EnhancedAnalytics extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-chart-bar';

    protected static string $view = 'filament.pages.enhanced-analytics';

    protected static ?string $navigationLabel = 'Enhanced Analytics';

    protected static ?int $navigationSort = 3;

    protected static ?string $navigationGroup = 'Analytics';

    public static function canAccess(): bool
    {
        return auth()->user()?->hasPermission('view_analytics') ?? false;
    }

    public function getVoiceData(): array
    {
        $analyticsController = new AnalyticsController();
        $request = new Request();
        
        $voiceResponse = $analyticsController->voice($request);
        return json_decode($voiceResponse->getContent(), true)['data'] ?? [];
    }

    public function getDataAnalytics(): array
    {
        $analyticsController = new AnalyticsController();
        $request = new Request();
        
        $dataResponse = $analyticsController->data($request);
        return json_decode($dataResponse->getContent(), true)['data'] ?? [];
    }
}
