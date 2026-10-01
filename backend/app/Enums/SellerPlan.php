<?php

namespace App\Enums;

enum SellerPlan: string
{
    case STANDARD = 'STANDARD';
    case PRO = 'PRO';

    public function label(): string
    {
        return match ($this) {
            self::STANDARD => 'Standard',
            self::PRO => 'Pro',
        };
    }
}
