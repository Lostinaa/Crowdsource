<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;

class NotificationService
{
    public static function create(string $type, string $title, string $message, string $severity = 'info', ?array $metadata = null, ?int $userId = null): Notification
    {
        return Notification::create([
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'severity' => $severity,
            'metadata' => $metadata,
            'user_id' => $userId,
        ]);
    }

    public static function notifyThresholdBreach(string $metric, float $value, float $threshold, ?int $userId = null): void
    {
        self::create(
            'threshold_breach',
            "Threshold Breach: {$metric}",
            "{$metric} has exceeded threshold. Current: {$value}, Threshold: {$threshold}",
            'warning',
            ['metric' => $metric, 'value' => $value, 'threshold' => $threshold],
            $userId
        );
    }

    public static function notifyAllUsers(string $type, string $title, string $message, string $severity = 'info'): void
    {
        $users = User::all();
        foreach ($users as $user) {
            self::create($type, $title, $message, $severity, null, $user->id);
        }
    }
}
