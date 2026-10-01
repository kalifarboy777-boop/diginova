<?php

namespace App\Payments;

use InvalidArgumentException;

final class PaymentManager
{
    public function provider(?string $name = null): PaymentProvider
    {
        return match ($name ?? config('payments.provider')) {
            'mock' => app(MockProvider::class),
            'cinetpay' => app(CinetPayProvider::class),
            default => throw new InvalidArgumentException("Prestataire de paiement inconnu : $name"),
        };
    }
}
