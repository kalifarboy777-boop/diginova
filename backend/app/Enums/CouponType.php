<?php

namespace App\Enums;

enum CouponType: string
{
    case PERCENT = 'PERCENT';
    case FIXED = 'FIXED';

    public function label(): string
    {
        return match ($this) {
            self::PERCENT => 'Pourcentage',
            self::FIXED => 'Montant fixe',
        };
    }
}
