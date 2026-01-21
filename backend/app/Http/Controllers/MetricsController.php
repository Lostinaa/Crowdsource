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
     * Store QoE metrics from mobile app.
     */
    public function store(Request $request): JsonResponse
    {
        // Validate incoming request data
        $validator = Validator::make($request->all(), [
            'timestamp' => 'required|date',
            'device.platform' => 'required|string',
            'device.model' => 'required|string',
            'device.osVersion' => 'required|string',
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
            // Get diagnostics information
            $diagnostics = $request->input('diagnostics', []);

            // Create serving_cell information from diagnostics
            $servingCell = [
                'signalQuality' => [
                    'rsrp' => $diagnostics['rsrp'] ?? 'N/A',
                    'rsrq' => $diagnostics['rsrq'] ?? 'N/A',
                    'rssnr' => $diagnostics['rssnr'] ?? 'N/A',
                    'cqi' => $diagnostics['cqi'] ?? 'N/A',
                    'netType' => $diagnostics['netType'] ?? 'N/A',
                ],
                'cellIdentity' => [
                    'enb' => $diagnostics['enb'] ?? 'N/A',
                    'cellId' => $diagnostics['cellId'] ?? 'N/A',
                    'pci' => $diagnostics['pci'] ?? 'N/A',
                    'tac' => $diagnostics['tac'] ?? 'N/A',
                    'eci' => $diagnostics['eci'] ?? 'N/A',
                ],
                'networkStates' => [
                    'dataState' => $diagnostics['dataState'] ?? 'N/A',
                    'dataActivity' => $diagnostics['dataActivity'] ?? 'N/A',
                    'callState' => $diagnostics['callState'] ?? 'N/A',
                    'simState' => $diagnostics['simState'] ?? 'N/A',
                    'isRoaming' => $diagnostics['isRoaming'] ?? 'N/A',
                ],
            ];

            // Create and store QoE metrics in the database
            $metric = QoeMetric::create([
                'user_id' => $request->user() ? $request->user()->id : null, // Retrieve user ID or set to null
                'timestamp' => $request->input('timestamp'),
                'device_info' => $request->input('device'),
                'location' => $request->input('location'), // Make sure to include location data in your request if necessary
                'metrics' => $request->input('metrics'),
                'scores' => $request->input('scores'),
                'serving_cell' => json_encode($servingCell), // Store serving cell data as JSON
                'ip_address' => $request->ip(), // Get the user's IP address
                'user_agent' => $request->userAgent(), // Get user agent string
            ]);

            Log::info('QoE metrics stored successfully', [
                'metric_id' => $metric->id,
                'timestamp' => $metric->timestamp,
                'user_id' => $metric->user_id,
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
     * Get metrics with filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = QoeMetric::query();

        // Filter by user if authenticated
        if ($request->user()) {
            $query->where('user_id', $request->user()->id);
        }

        // Filter by date range if provided
        if ($request->has('start_date')) {
            $query->where('timestamp', '>=', $request->input('start_date'));
        }
        if ($request->has('end_date')) {
            $query->where('timestamp', '<=', $request->input('end_date'));
        }

        // Filter by platform if provided
        if ($request->has('platform')) {
            $query->whereJsonContains('device_info->platform', $request->input('platform'));
        }

        // Pagination setup
        $perPage = $request->input('per_page', 50);
        $metrics = $query->orderBy('timestamp', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $metrics,
        ]);
    }

    /**
     * Get specific metric by ID.
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