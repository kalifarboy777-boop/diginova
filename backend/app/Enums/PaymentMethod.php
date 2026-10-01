<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case WAVE = 'WAVE';
    case ORANGE_MONEY = 'ORANGE_MONEY';
    case MTN_MOMO = 'MTN_MOMO';
    case MOOV_MONEY = 'MOOV_MONEY';
    case CARD = 'CARD';

    public function label(): string
    {
        return match ($this) {
            self::WAVE => 'Wave',
            self::ORANGE_MONEY => 'Orange Money',
            self::MTN_MOMO => 'MTN MoMo',
            self::MOOV_MONEY => 'Moov Money',
            self::CARD => 'Carte bancaire',
        };
    }
}
