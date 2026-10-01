<?php

namespace App\Payments;

final readonly class PaymentInit
{
    public function __construct(
        public string $providerRef,
        public ?string $redirectUrl = null,
        public string $instructions = '',
    ) {}
}
