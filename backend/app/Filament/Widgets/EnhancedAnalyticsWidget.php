<?php

namespace App\Filament\Widgets;

use App\Http\Controllers\AnalyticsController;
use Filament\Widgets\Widget;
use Filament\Widgets\Concerns\InteractsWithPageFilters;
use Illuminate\Http\Request;
use Carbon\Carbon;

class EnhancedAnalyticsWidget extends Widget
{
    use InteractsWithPageFilters;

    protected static string $view = 'filament.widgets.enhanced-analytics-widget';

    protected static ?int $sort = 5;

    protected int|string|array $columnSpan = 'full';

    /**
     * Hide this widget from the main Dashboard.
     * The Enhanced Analytics data is shown on its own sidebar page instead.
     */
    public static function canView(): bool
    {
        return false;
    }

    public function getVoiceData(): array
    {
        $startDate = $this->filters['startDate'] ?? Carbon::today()->toDateString();
        $endDate = $this->filters['endDate'] ?? Carbon::today()->toDateString();
        $region = $this->filters['region'] ?? '';

        $request = new Request();
        $request->merge([
            'start_date' => Carbon::parse($startDate)->startOfDay()->toIso8601String(),
            'end_date' => Carbon::parse($endDate)->endOfDay()->toIso8601String(),
            'region' => $region ?: null,
        ]);

        $analyticsController = new AnalyticsController();
        $voiceResponse = $analyticsController->voice($request);
        return json_decode($voiceResponse->getContent(), true)['data'] ?? [];
    }

    public function getDataAnalytics(): array
    {
        $startDate = $this->filters['startDate'] ?? Carbon::today()->toDateString();
        $endDate = $this->filters['endDate'] ?? Carbon::today()->toDateString();
        $region = $this->filters['region'] ?? '';

        $request = new Request();
        $request->merge([
            'start_date' => Carbon::parse($startDate)->startOfDay()->toIso8601String(),
            'end_date' => Carbon::parse($endDate)->endOfDay()->toIso8601String(),
            'region' => $region ?: null,
        ]);

        $analyticsController = new AnalyticsController();
        $dataResponse = $analyticsController->data($request);
        return json_decode($dataResponse->getContent(), true)['data'] ?? [];
    }
}
