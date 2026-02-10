<?php

namespace App\Services;

class RegionHelper
{
    /**
     * Ethio Telecom regions with rough coordinate boundaries
     * Derived from the mobile app's map implementation
     */
    protected static $regions = [
        [
            'name' => 'Addis Ababa',
            'latitude' => 9.02497,
            'longitude' => 38.74689,
            'latitudeDelta' => 0.5,
            'longitudeDelta' => 0.5
        ],
        [
            'name' => 'Oromia',
            'latitude' => 8.9806,
            'longitude' => 38.7578,
            'latitudeDelta' => 2.0,
            'longitudeDelta' => 2.0
        ],
        [
            'name' => 'Amhara',
            'latitude' => 11.8251,
            'longitude' => 37.7815,
            'latitudeDelta' => 2.0,
            'longitudeDelta' => 2.0
        ],
        [
            'name' => 'Tigray',
            'latitude' => 14.0324,
            'longitude' => 38.3166,
            'latitudeDelta' => 2.0,
            'longitudeDelta' => 2.0
        ],
        [
            'name' => 'SNNPR',
            'latitude' => 6.5157,
            'longitude' => 36.9541,
            'latitudeDelta' => 2.0,
            'longitudeDelta' => 2.0
        ],
        [
            'name' => 'Afar',
            'latitude' => 11.7556,
            'longitude' => 40.9587,
            'latitudeDelta' => 2.0,
            'longitudeDelta' => 2.0
        ],
        [
            'name' => 'Somali',
            'latitude' => 6.6612,
            'longitude' => 43.7908,
            'latitudeDelta' => 2.0,
            'longitudeDelta' => 2.0
        ],
        [
            'name' => 'Gambela',
            'latitude' => 8.1280,
            'longitude' => 34.5621,
            'latitudeDelta' => 1.0,
            'longitudeDelta' => 1.0
        ],
        [
            'name' => 'Harari',
            'latitude' => 9.3099,
            'longitude' => 42.1283,
            'latitudeDelta' => 0.5,
            'longitudeDelta' => 0.5
        ],
        [
            'name' => 'Dire Dawa',
            'latitude' => 9.6009,
            'longitude' => 41.8501,
            'latitudeDelta' => 0.5,
            'longitudeDelta' => 0.5
        ],
    ];

    /**
     * Map coordinates to a region name
     */
    public static function getRegion($lat, $lon)
    {
        if (!$lat || !$lon) {
            return 'Unknown';
        }

        foreach (self::$regions as $region) {
            $minLat = $region['latitude'] - $region['latitudeDelta'] / 2;
            $maxLat = $region['latitude'] + $region['latitudeDelta'] / 2;
            $minLon = $region['longitude'] - $region['longitudeDelta'] / 2;
            $maxLon = $region['longitude'] + $region['longitudeDelta'] / 2;

            if ($lat >= $minLat && $lat <= $maxLat && $lon >= $minLon && $lon <= $maxLon) {
                return $region['name'];
            }
        }

        return 'Unknown';
    }
}
