<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:8081', // Expo dev server
        'http://localhost:19006', // Expo web
        'http://localhost:19000', // Expo alternative port
        'http://127.0.0.1:8081',
        'http://127.0.0.1:19006',
        env('FRONTEND_URL', '*'), // Allow all origins for mobile apps
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,
];

