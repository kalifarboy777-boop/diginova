<?php

namespace App\Payments;

use App\Enums\PaymentStatus;

final readonly class RemoteStatus
{
    public function __construct(
        public PaymentStatus $status,
        public int $amount,
        public string $currency = 'XOF',
    ) {}
}
