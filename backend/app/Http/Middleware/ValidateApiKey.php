<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Optional API Key Authentication Middleware
 * 
 * Validates X-API-Key header against configured device API keys.
 * This provides a lightweight authentication layer for mobile devices
 * without requiring full user authentication.
 * 
 * Enable by adding to routes/api.php:
 *   Route::middleware('api.key')->group(function () { ... });
 * 
 * Configure in config/services.php:
 *   'api_keys' => [
 *       'device' => env('DEVICE_API_KEY'),
 *   ],
 * 
 * Or set as comma-separated list in .env:
 *   VALID_API_KEYS=key1,key2,key3
 */
class ValidateApiKey
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Skip if API key validation is disabled
        if (!config('services.api_key.enabled', false)) {
            return $next($request);
        }

        $apiKey = $request->header('X-API-Key');

        if (empty($apiKey)) {
            return response()->json([
                'success' => false,
                'message' => 'API key is required',
                'error' => 'missing_api_key',
            ], 401);
        }

        // Get valid API keys from configuration
        $validKeys = $this->getValidApiKeys();

        if (!in_array($apiKey, $validKeys, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid API key',
                'error' => 'invalid_api_key',
            ], 401);
        }

        // Log successful API key usage (optional)
        if (config('services.api_key.log_usage', false)) {
            \Log::info('API key used', [
                'key_prefix' => substr($apiKey, 0, 8) . '...',
                'ip' => $request->ip(),
                'endpoint' => $request->path(),
            ]);
        }

        return $next($request);
    }

    /**
     * Get list of valid API keys from configuration.
     */
    private function getValidApiKeys(): array
    {
        $keys = [];

        // Single device API key from config
        if ($deviceKey = config('services.api_key.device')) {
            $keys[] = $deviceKey;
        }

        // Multiple keys from comma-separated env var
        if ($envKeys = env('VALID_API_KEYS')) {
            $keys = array_merge($keys, array_map('trim', explode(',', $envKeys)));
        }

        return array_filter($keys);
    }
}
