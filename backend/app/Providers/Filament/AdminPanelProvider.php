<?php

namespace App\Providers\Filament;

use Filament\Http\Middleware\Authenticate;
use Filament\Http\Middleware\AuthenticateSession;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Pages;
use Filament\Panel;
use Filament\PanelProvider;
use Filament\Support\Colors\Color;
use Filament\Widgets;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;

class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->default()
            ->id('admin')
            ->path('admin')
            ->login()
            // Brand the admin panel & login with Ethio telecom QoE identity
            ->brandName('Crowdsourcing QoE')
            ->brandLogo(fn () => asset('images/ethiotelecom-logo.png'))
            ->colors([
                // Match mobile app theme colors (Ethio telecom brand green)
                'primary' => Color::hex('#8ec63f'), // Brand green (#8ec63f)
                'success' => Color::hex('#22c55e'), // Success green
                'warning' => Color::hex('#FACC15'), // Warning yellow
                'danger' => Color::hex('#EF4444'), // Danger red
                'info' => Color::hex('#009FE3'), // Info blue
            ])
            ->favicon(fn () => asset('images/ethiotelecom-logo.png'))
            ->darkMode(false) // Use light theme to match mobile app
            ->sidebarCollapsibleOnDesktop()
            ->maxContentWidth('full')
            ->renderHook(
                'panels::head.start',
                fn () => view('filament.custom-styles')
            )
            ->discoverResources(in: app_path('Filament/Resources'), for: 'App\\Filament\\Resources')
            ->discoverPages(in: app_path('Filament/Pages'), for: 'App\\Filament\\Pages')
            ->pages([
                Pages\Dashboard::class,
            ])
            ->discoverWidgets(in: app_path('Filament/Widgets'), for: 'App\\Filament\\Widgets')
            ->widgets([
                \App\Filament\Widgets\QoeMetricsOverview::class,
                \App\Filament\Widgets\QoeMetricsChart::class,
                \App\Filament\Widgets\DataKpisWidget::class,
                // Temporarily disabled due to Blade parse error in production.
                // \App\Filament\Widgets\EnhancedAnalyticsWidget::class,
                Widgets\AccountWidget::class,
            ])
            ->middleware([
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
                StartSession::class,
                AuthenticateSession::class,
                ShareErrorsFromSession::class,
                VerifyCsrfToken::class,
                SubstituteBindings::class,
                DisableBladeIconComponents::class,
                DispatchServingFilamentEvent::class,
            ])
            ->authMiddleware([
                Authenticate::class,
            ]);
    }
}
