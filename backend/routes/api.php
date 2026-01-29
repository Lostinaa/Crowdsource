<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\MetricsController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CoverageSampleController;

/*
|--------------------------------------------------------------------------
| API Routes 
|--------------------------------------------------------------------------
*/

// Public routes
Route::get('/health', [HealthController::class, 'check']);

// Authentication routes
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);

// Metrics routes (public for app usage - apps submit metrics without auth)
Route::post('/metrics', [MetricsController::class, 'store']);
Route::get('/metrics', [MetricsController::class, 'index']);
Route::get('/metrics/{id}', [MetricsController::class, 'show']);
Route::post('/coverage-samples', [CoverageSampleController::class, 'store']);

Route::get('/coverage-samples', [CoverageSampleController::class, 'index']);
Route::get('/coverage-samples/statistics', [CoverageSampleController::class, 'statistics']);

// Push Notification routes
Route::post('/push-tokens', [App\Http\Controllers\PushTokenController::class, 'store']);
Route::delete('/push-tokens', [App\Http\Controllers\PushTokenController::class, 'destroy']);


// Protected routes (require authentication)
Route::middleware('auth:sanctum')->group(function () {
    // User routes
    Route::get('/auth/user', [AuthController::class, 'user']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Analytics routes (protected - require authentication)
    Route::get('/analytics/overview', [AnalyticsController::class, 'overview']);
    Route::get('/analytics/voice', [AnalyticsController::class, 'voice']);
    Route::get('/analytics/data', [AnalyticsController::class, 'data']);
    Route::get('/analytics/trends', [AnalyticsController::class, 'trends']);
});

