<?php

namespace App\Http\Controllers;

use App\Models\CoverageSample;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use App\Services\AuditLogService;

class CoverageSampleController extends Controller
{
    /**
     * Store a single coverage sample (from the mobile app trail).
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'timestamp' => 'required|date',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'accuracy' => 'nullable|numeric|min:0',
            'network_type' => 'nullable|string|max:50',
            'network_category' => 'nullable|string|max:10',
            'rsrp' => 'nullable|string|max:50',
            'rsrq' => 'nullable|string|max:50',
            'rssnr' => 'nullable|string|max:50',
            'cqi' => 'nullable|string|max:50',
            'enb' => 'nullable|string|max:50',
            'cell_id' => 'nullable|string|max:50',
            'pci' => 'nullable|string|max:50',
            'tac' => 'nullable|string|max:50',
            'eci' => 'nullable|string|max:50',
            'raw' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $sample = CoverageSample::create([
            'user_id' => $request->user()->id ?? null,
            'timestamp' => $request->input('timestamp'),
            'latitude' => $request->input('latitude'),
            'longitude' => $request->input('longitude'),
            'accuracy' => $request->input('accuracy'),
            'network_type' => $request->input('network_type'),
            'network_category' => $request->input('network_category'),
            'rsrp' => $request->input('rsrp'),
            'rsrq' => $request->input('rsrq'),
            'rssnr' => $request->input('rssnr'),
            'cqi' => $request->input('cqi'),
            'enb' => $request->input('enb'),
            'cell_id' => $request->input('cell_id'),
            'pci' => $request->input('pci'),
            'tac' => $request->input('tac'),
            'eci' => $request->input('eci'),
            'raw' => $request->input('raw'),
        ]);

        Log::info('Coverage sample stored', [
            'id' => $sample->id,
            'timestamp' => $sample->timestamp,
            'lat' => $sample->latitude,
            'lon' => $sample->longitude,
            'network_type' => $sample->network_type,
            'network_category' => $sample->network_category,
        ]);

        // Audit log
        AuditLogService::log('created', $sample, null, $sample->toArray(), "Coverage Sample stored via API");

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $sample->id,
                'timestamp' => $sample->timestamp,
            ],
        ], 201);
    }

    /**
     * Get coverage samples with filters
     */
    public function index(Request $request): JsonResponse
    {
        $query = CoverageSample::query();

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

        // Filter by network category
        if ($request->has('network_category')) {
            $query->where('network_category', $request->input('network_category'));
        }

        // Filter by geographic bounds
        if ($request->has('bounds')) {
            $bounds = $request->input('bounds');
            if (isset($bounds['min_lat']) && isset($bounds['max_lat'])) {
                $query->whereBetween('latitude', [$bounds['min_lat'], $bounds['max_lat']]);
            }
            if (isset($bounds['min_lon']) && isset($bounds['max_lon'])) {
                $query->whereBetween('longitude', [$bounds['min_lon'], $bounds['max_lon']]);
            }
        }

        // Limit results for map display (last 1000 points)
        $limit = $request->input('limit', 1000);
        $samples = $query->orderBy('timestamp', 'desc')->limit($limit)->get();

        return response()->json([
            'success' => true,
            'data' => $samples,
            'count' => $samples->count(),
        ]);
    }

    /**
     * Get coverage statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        $query = CoverageSample::query();

        if ($request->user()) {
            $query->where('user_id', $request->user()->id);
        }

        if ($request->has('start_date')) {
            $query->where('timestamp', '>=', $request->input('start_date'));
        }
        if ($request->has('end_date')) {
            $query->where('timestamp', '<=', $request->input('end_date'));
        }

        $samples = $query->get();

        $stats = [
            'total_samples' => $samples->count(),
            'network_distribution' => $samples->groupBy('network_category')
                ->map(fn($group) => $group->count())
                ->toArray(),
            'average_rsrp' => $samples->whereNotNull('rsrp')
                ->map(fn($s) => (float) str_replace(' dBm', '', $s->rsrp))
                ->filter()
                ->avg(),
            'date_range' => [
                'start' => $samples->min('timestamp'),
                'end' => $samples->max('timestamp'),
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}

