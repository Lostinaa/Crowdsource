<?php

namespace App\Filament\Pages;

use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\Select;
use Filament\Forms\Form;
use Filament\Pages\Dashboard as BaseDashboard;

class Dashboard extends BaseDashboard
{
    use BaseDashboard\Concerns\HasFiltersForm;

    public function filtersForm(Form $form): Form
    {
        return $form
            ->schema([
                Section::make()
                    ->schema([
                        DatePicker::make('startDate')
                            ->label('From')
                            ->default(now()->toDateString()),
                        DatePicker::make('endDate')
                            ->label('To')
                            ->default(now()->toDateString()),
                        Select::make('region')
                            ->label('Region')
                            ->options([
                                '' => 'All Regions',
                                'Addis Ababa' => 'Addis Ababa',
                                'Adama' => 'Adama',
                                'Hawassa' => 'Hawassa',
                                'Bahir Dar' => 'Bahir Dar',
                                'Mekelle' => 'Mekelle',
                                'Dire Dawa' => 'Dire Dawa',
                                'Jimma' => 'Jimma',
                                'Gondar' => 'Gondar',
                                'Dessie' => 'Dessie',
                                'Harar' => 'Harar',
                            ])
                            ->default('')
                            ->placeholder('All Regions'),
                    ])
                    ->columns(3),
            ]);
    }
}
