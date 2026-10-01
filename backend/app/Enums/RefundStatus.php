<?php

namespace App\Enums;

enum RefundStatus: string
{
    case REQUESTED = 'REQUESTED';
    case APPROVED = 'APPROVED';
    case REJECTED = 'REJECTED';

    public function label(): string
    {
        return match ($this) {
            self::REQUESTED => 'Demandé',
            self::APPROVED => 'Accepté',
            self::REJECTED => 'Refusé',
        };
    }
}
