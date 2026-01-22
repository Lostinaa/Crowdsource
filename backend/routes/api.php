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

// Metrics routes (public for development - can be made protected later)
Route::post('/metrics', [MetricsController::class, 'store']);
Route::get('/metrics', [MetricsController::class, 'index']);
Route::get('/metrics/{id}', [MetricsController::class, 'show']);
Route::post('/coverage-samples', [CoverageSampleController::class, 'store']);
Route::get('/coverage-samples', [CoverageSampleController::class, 'index']);
Route::get('/coverage-samples/statistics', [CoverageSampleController::class, 'statistics']);

// Analytics routes (temporarily public for testing - move back to protected later)
Route::get('/analytics/overview', [AnalyticsController::class, 'overview']);
Route::get('/analytics/voice', [AnalyticsController::class, 'voice']);
Route::get('/analytics/data', [AnalyticsController::class, 'data']);
Route::get('/analytics/trends', [AnalyticsController::class, 'trends']);

// Protected routes (require authentication)
Route::middleware('auth:sanctum')->group(function () {
    // User routes
    Route::get('/auth/user', [AuthController::class, 'user']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
});

