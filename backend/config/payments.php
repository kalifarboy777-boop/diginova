<?php

return [
    // mock | cinetpay
    'provider' => env('PAYMENT_PROVIDER', 'mock'),

    'mock' => [
        'secret' => env('MOCK_PAYMENT_SECRET', 'dev-mock-secret-change-me'),
    ],

    'cinetpay' => [
        'base_url' => env('CINETPAY_BASE_URL', 'https://api-checkout.cinetpay.com'),
        'api_key' => env('CINETPAY_API_KEY'),
        'site_id' => env('CINETPAY_SITE_ID'),
        'secret_key' => env('CINETPAY_SECRET_KEY'),
    ],
];
