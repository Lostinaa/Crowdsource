<?php

namespace App\Http\Controllers;

use App\Models\PushToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class PushTokenController extends Controller
{
    /**
     * Register a push token.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
            'platform' => 'required|string|in:android,ios,web',
            'device_name' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // Upsert the token (update if exists, create if not)
            $pushToken = PushToken::updateOrCreate(
                ['token' => $request->input('token')],
                [
                    'platform' => $request->input('platform'),
                    'device_name' => $request->input('device_name'),
                    'user_id' => $request->user()?->id,
                    'is_active' => true,
                    'last_used_at' => now(),
                ]
            );

            Log::info('[Push] Token registered', [
                'token_id' => $pushToken->id,
                'platform' => $pushToken->platform,
                'user_id' => $pushToken->user_id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Push token registered successfully',
                'data' => [
                    'id' => $pushToken->id,
                    'platform' => $pushToken->platform,
                ],
            ], 201);

        } catch (\Exception $e) {
            Log::error('[Push] Failed to register token', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to register push token',
            ], 500);
        }
    }

    /**
     * Unregister a push token.
     */
    public function destroy(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $deleted = PushToken::where('token', $request->input('token'))->delete();

            if ($deleted) {
                Log::info('[Push] Token unregistered', [
                    'token' => substr($request->input('token'), 0, 20) . '...',
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Push token unregistered successfully',
            ]);

        } catch (\Exception $e) {
            Log::error('[Push] Failed to unregister token', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to unregister push token',
            ], 500);
        }
    }

    /**
     * List all active push tokens (admin only).
     */
    public function index(Request $request): JsonResponse
    {
        // Check if user has permission
        if (!$request->user()?->hasPermission('manage_notifications')) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $tokens = PushToken::with('user:id,name,email')
            ->orderBy('last_used_at', 'desc')
            ->paginate(50);

        return response()->json([
            'success' => true,
            'data' => $tokens,
        ]);
    }
}
