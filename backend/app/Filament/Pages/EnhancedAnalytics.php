<?php

namespace App\Filament\Pages;

use App\Http\Controllers\AnalyticsController;
use Carbon\Carbon;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Section;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Forms\Form;
use Filament\Pages\Page;
use Illuminate\Http\Request;

class EnhancedAnalytics extends Page implements HasForms
{
    use InteractsWithForms;

    protected static ?string $navigationIcon = 'heroicon-o-chart-bar';

    protected static string $view = 'filament.pages.enhanced-analytics';

    protected static ?string $navigationLabel = 'Enhanced Analytics';

    protected static ?int $navigationSort = 3;

    protected static ?string $navigationGroup = 'Analytics';

    public ?string $startDate = null;
    public ?string $endDate = null;

    public function mount(): void
    {
        $this->startDate = Carbon::today()->toDateString();
        $this->endDate = Carbon::today()->toDateString();

        $this->form->fill([
            'startDate' => $this->startDate,
            'endDate' => $this->endDate,
        ]);
    }

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Section::make()
                    ->schema([
                        DatePicker::make('startDate')->label('From')->live(),
                        DatePicker::make('endDate')->label('To')->live(),
                    ])
                    ->columns(2)
                    ->collapsible()
                    ->collapsed(),
            ]);
    }

    public static function canAccess(): bool
    {
        return true;
    }

    private function buildRequest(): Request
    {
        $request = new Request();
        $request->merge([
            'start_date' => Carbon::parse($this->startDate ?? today())->startOfDay()->toIso8601String(),
            'end_date' => Carbon::parse($this->endDate ?? today())->endOfDay()->toIso8601String(),
        ]);
        return $request;
    }

    public function getVoiceData(): array
    {
        $analyticsController = new AnalyticsController();
        $voiceResponse = $analyticsController->voice($this->buildRequest());
        return json_decode($voiceResponse->getContent(), true)['data'] ?? [];
    }

    public function getDataAnalytics(): array
    {
        $analyticsController = new AnalyticsController();
        $dataResponse = $analyticsController->data($this->buildRequest());
        return json_decode($dataResponse->getContent(), true)['data'] ?? [];
    }
}
