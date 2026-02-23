<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Console\Scheduling\Schedule;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Force HTTPS for all generated URLs when behind an SSL reverse proxy.
        // This ensures Filament CSS/JS assets load with https:// and are not
        // blocked by the browser as mixed content.
        if (config('app.env') === 'production') {
            URL::forceScheme('https');
        }

        // Schedule data retention enforcement (run daily at 2 AM)
        $this->app->booted(function () {
            $schedule = $this->app->make(Schedule::class);
            $schedule->command('data:enforce-retention --months=18')
                ->dailyAt('02:00')
                ->withoutOverlapping();
        });
    }
}
