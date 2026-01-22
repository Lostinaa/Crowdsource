<?php

namespace App\Filament\Widgets;

use App\Http\Controllers\AnalyticsController;
use Filament\Widgets\Widget;
use Illuminate\Http\Request;

class EnhancedAnalyticsWidget extends Widget
{
    protected static string $view = 'filament.widgets.enhanced-analytics-widget';
    
    protected static ?int $sort = 3;
    
    protected int|string|array $columnSpan = 'full';

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
