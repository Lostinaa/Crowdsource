<?php

namespace App\Http\Controllers;

use App\Models\QoeMetric;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class MetricsController extends Controller
{
    /**
     * Store QoE metrics from mobile app
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'timestamp' => 'required|date',
            'device.platform' => 'required|string',
            'metrics.voice' => 'required|array',
            'metrics.data' => 'required|array',
            'scores' => 'required|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $metric = QoeMetric::create([
                'user_id' => $request->user()->id ?? null,
                'timestamp' => $request->input('timestamp'),
                'device_info' => $request->input('device'),
                'location' => $request->input('location'),
                'metrics' => $request->input('metrics'),
                'scores' => $request->input('scores'),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            Log::info('QoE metrics stored', [
                'metric_id' => $metric->id,
                'user_id' => $metric->user_id,
                'timestamp' => $metric->timestamp,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Metrics stored successfully',
                'data' => [
                    'id' => $metric->id,
                    'timestamp' => $metric->timestamp,
                ],
            ], 201);

        } catch (\Exception $e) {
            Log::error('Failed to store QoE metrics', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to store metrics',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Get metrics with filters
     */
    public function index(Request $request): JsonResponse
    {
        $query = QoeMetric::query();

        // Filter by user
        if ($request->user()) {
            $query->where('user_id', $request->user()->id);
        }

        // Filter by date range
        if ($request->has('start_date')) {
            $query->where('timestamp', '>=', $request->input('start_date'));
        }
        if ($request->has('end_date')) {
            $query->where('timestamp', '<=', $request->input('end_date'));
        }

        // Filter by platform
        if ($request->has('platform')) {
            $query->whereJsonContains('device_info->platform', $request->input('platform'));
        }

        // Pagination
        $perPage = $request->input('per_page', 50);
        $metrics = $query->orderBy('timestamp', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $metrics,
        ]);
    }

    /**
     * Get specific metric by ID
     */
    public function show(Request $request, $id): JsonResponse
    {
        $metric = QoeMetric::findOrFail($id);

        // Check authorization
        if ($request->user() && $metric->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $metric,
        ]);
    }
}

