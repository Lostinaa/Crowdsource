<?php

namespace App\Services;

use App\Models\PushToken;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Service for sending push notifications via Expo Push API
 * 
 * @see https://docs.expo.dev/push-notifications/sending-notifications/
 */
class PushNotificationService
{
    const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
    const MAX_BATCH_SIZE = 100;

    /**
     * Send a push notification to a specific token.
     */
    public static function sendToToken(string $token, string $title, string $body, array $data = []): bool
    {
        return self::send([
            [
                'to' => $token,
                'title' => $title,
                'body' => $body,
                'data' => $data,
                'sound' => 'default',
                'priority' => 'high',
            ]
        ]);
    }

    /**
     * Send a push notification to a user (all their devices).
     */
    public static function sendToUser(int $userId, string $title, string $body, array $data = []): bool
    {
        $tokens = PushToken::where('user_id', $userId)
            ->active()
            ->pluck('token')
            ->toArray();

        if (empty($tokens)) {
            Log::info('[Push] No active tokens for user', ['user_id' => $userId]);
            return false;
        }

        return self::sendToTokens($tokens, $title, $body, $data);
    }

    /**
     * Send a push notification to multiple tokens.
     */
    public static function sendToTokens(array $tokens, string $title, string $body, array $data = []): bool
    {
        $messages = array_map(function ($token) use ($title, $body, $data) {
            return [
                'to' => $token,
                'title' => $title,
                'body' => $body,
                'data' => $data,
                'sound' => 'default',
                'priority' => 'high',
            ];
        }, $tokens);

        return self::send($messages);
    }

    /**
     * Send a push notification to all active tokens.
     */
    public static function sendToAll(string $title, string $body, array $data = []): bool
    {
        $tokens = PushToken::active()->pluck('token')->toArray();

        if (empty($tokens)) {
            Log::info('[Push] No active tokens found');
            return false;
        }

        return self::sendToTokens($tokens, $title, $body, $data);
    }

    /**
     * Send push notification for QoE threshold breach.
     */
    public static function sendThresholdAlert(string $metric, float $value, float $threshold, ?int $userId = null): bool
    {
        $title = '⚠️ QoE Alert';
        $body = "{$metric} has dropped to " . round($value, 1) . "% (threshold: {$threshold}%)";
        $data = [
            'type' => 'threshold_breach',
            'metric' => $metric,
            'value' => $value,
            'threshold' => $threshold,
        ];

        if ($userId) {
            return self::sendToUser($userId, $title, $body, $data);
        }

        return self::sendToAll($title, $body, $data);
    }

    /**
     * Send messages to Expo Push API.
     */
    protected static function send(array $messages): bool
    {
        if (empty($messages)) {
            return false;
        }

        try {
            // Split into batches if needed
            $batches = array_chunk($messages, self::MAX_BATCH_SIZE);
            $allSuccess = true;

            foreach ($batches as $batch) {
                $response = Http::withHeaders([
                    'Accept' => 'application/json',
                    'Accept-Encoding' => 'gzip, deflate',
                    'Content-Type' => 'application/json',
                ])->post(self::EXPO_PUSH_URL, $batch);

                if ($response->successful()) {
                    $result = $response->json();
                    self::handlePushResponse($result, $batch);
                } else {
                    Log::error('[Push] Expo API error', [
                        'status' => $response->status(),
                        'body' => $response->body(),
                    ]);
                    $allSuccess = false;
                }
            }

            return $allSuccess;
        } catch (\Exception $e) {
            Log::error('[Push] Failed to send push notification', [
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Handle Expo Push API response and deactivate invalid tokens.
     */
    protected static function handlePushResponse(array $response, array $messages): void
    {
        if (!isset($response['data'])) {
            return;
        }

        foreach ($response['data'] as $index => $result) {
            $token = $messages[$index]['to'] ?? null;

            if (isset($result['status']) && $result['status'] === 'error') {
                $errorType = $result['details']['error'] ?? 'unknown';

                // Deactivate invalid tokens
                if (in_array($errorType, ['DeviceNotRegistered', 'InvalidCredentials'])) {
                    Log::warning('[Push] Deactivating invalid token', [
                        'token' => substr($token, 0, 20) . '...',
                        'error' => $errorType,
                    ]);

                    PushToken::where('token', $token)->update(['is_active' => false]);
                }
            } else if (isset($result['status']) && $result['status'] === 'ok') {
                // Update last used timestamp
                PushToken::where('token', $token)->update(['last_used_at' => now()]);
            }
        }
    }
}
