<?php

namespace App\Providers;

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
        // Schedule data retention enforcement (run daily at 2 AM)
        $this->app->booted(function () {
            $schedule = $this->app->make(Schedule::class);
            $schedule->command('data:enforce-retention --months=18')
                ->dailyAt('02:00')
                ->withoutOverlapping();
        });
    }
}
