<?php

namespace App\Services;

class RegionHelper
{
    /**
     * Cached zone polygons loaded from config/ethio_zones.php
     */
    protected static ?array $zones = null;

    /**
     * Load zone polygon data (lazy, cached).
     */
    protected static function loadZones(): array
    {
        if (self::$zones === null) {
            self::$zones = require base_path('config/ethio_zones.php');
        }
        return self::$zones;
    }

    /**
     * Map coordinates to an Ethio Telecom zone code using point-in-polygon.
     * Uses ray-casting algorithm for accurate polygon containment checks.
     */
    public static function getRegion($lat, $lon): string
    {
        if (!$lat || !$lon) {
            return 'Unknown';
        }

        $lat = (float) $lat;
        $lon = (float) $lon;
        $zones = self::loadZones();

        foreach ($zones as $zoneName => $polygon) {
            if (self::pointInPolygon($lat, $lon, $polygon)) {
                return $zoneName;
            }
        }

        return 'Unknown';
    }

    /**
     * Ray-casting algorithm to check if a point is inside a polygon.
     * Each polygon vertex is [lat, lon].
     */
    protected static function pointInPolygon(float $lat, float $lon, array $polygon): bool
    {
        $n = count($polygon);
        if ($n < 3)
            return false;

        $inside = false;
        for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
            $yi = $polygon[$i][0]; // lat
            $xi = $polygon[$i][1]; // lon
            $yj = $polygon[$j][0];
            $xj = $polygon[$j][1];

            if (
                (($yi > $lat) !== ($yj > $lat)) &&
                ($lon < ($xj - $xi) * ($lat - $yi) / ($yj - $yi) + $xi)
            ) {
                $inside = !$inside;
            }
        }

        return $inside;
    }

    /**
     * Get all available zone codes.
     */
    public static function getZoneCodes(): array
    {
        return array_keys(self::loadZones());
    }
}
