<?php

namespace App\Enums;

enum CouponScope: string
{
    case ALL = 'ALL';
    case PACKS = 'PACKS';
    case PRODUCT = 'PRODUCT';

    public function label(): string
    {
        return match ($this) {
            self::ALL => 'Tout le catalogue',
            self::PACKS => 'Packs',
            self::PRODUCT => 'Produit',
        };
    }
}
