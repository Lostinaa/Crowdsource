<?php

namespace App\Filament\Pages;

use App\Models\QoeMetric;
use Filament\Pages\Page;
use Illuminate\Support\Facades\Log;

class QoeMap extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-map';
    protected static ?string $navigationLabel = 'Map View';
    protected static ?string $title = 'Live Network Quality Map';
    protected static ?int $navigationSort = 2;
    protected static string $view = 'filament.pages.qoe-map';

    // This function runs on first load
    public function getMapData(): array
    {
        return [
            'metrics' => $this->getMetricsOnly(),
            'sites' => $this->getStaticSites(),
        ];
    }

    // Static Tower Data (Loaded once)
    private function getStaticSites(): array
    {
        $sites = [];
        $jsonPath = storage_path('app/sites.json');
        if (file_exists($jsonPath)) {
            $jsonContent = file_get_contents($jsonPath);
            $sitesData = json_decode($jsonContent, true);
            if (is_array($sitesData)) {
                foreach ($sitesData as $site) {
                    $lat = $site['Latitude'] ?? $site['lat'] ?? null;
                    $lng = $site['Longitude'] ?? $site['Longitue'] ?? $site['lng'] ?? null;
                    if ($lat && $lng) {
                        $sites[] = [
                            'id' => (string)($site['Site ID'] ?? 'Unknown'),
                            'lat' => (float)$lat,
                            'lng' => (float)$lng,
                            'info' => "<b>Cell Site</b><br>ID: " . ($site['Site ID'] ?? 'Unknown'),
                        ];
                    }
                }
            }
        }
        return $sites;
    }

    // Dynamic Device Data (Refreshable)
    public function getMetricsOnly(): array
    {
        return QoeMetric::all()->map(function ($metric) {
            $ntkType = $metric->device_info['netType'] ?? 'Unknown';
            $siteId = (string)($metric->device_info['enb'] ?? $metric->device_info['site_id'] ?? '');
            $cellId = $metric->device_info['cellId'] ?? $metric->device_info['cell_id'] ?? 'N/A';
            $signal = $metric->device_info['rsrp'] ?? $metric->signal_strength['dbm'] ?? 'N/A';
            
            return [
                'lat' => (float)($metric->location['latitude'] ?? 0),
                'lng' => (float)($metric->location['longitude'] ?? 0),
                'site_id' => $siteId,
                'color' => $this->getColorForNetType($ntkType),
                'info' => "<b>Device:</b> " . ($metric->device_info['model'] ?? 'N/A') . "<br>" .
                          "<b>Net:</b> $ntkType<br>" .
                          "<b>Site ID:</b> $siteId<br>" . 
                          "<b>Cell ID:</b> $cellId<br>" .
                          "<b>Signal:</b> <span style='color:blue'>$signal dBm</span>",
            ];
        })->toArray();
    }

    private function getColorForNetType(string $type): string
    {
        $type = strtoupper($type);
        if (str_contains($type, '5G')) return '#3b82f6';
        if (str_contains($type, '4G')) return '#22c55e';
        if (str_contains($type, '3G')) return '#fbbf24';
        if (str_contains($type, '2G')) return '#fb5224';
        return '#ef4444';
    }
}