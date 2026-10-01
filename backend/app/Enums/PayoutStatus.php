<?php

namespace App\Enums;

enum PayoutStatus: string
{
    case REQUESTED = 'REQUESTED';
    case PROCESSING = 'PROCESSING';
    case PAID = 'PAID';
    case FAILED = 'FAILED';

    public function label(): string
    {
        return match ($this) {
            self::REQUESTED => 'Demandé',
            self::PROCESSING => 'En cours',
            self::PAID => 'Payé',
            self::FAILED => 'Échoué',
        };
    }
}
