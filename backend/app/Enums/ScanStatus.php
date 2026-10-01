<?php

namespace App\Enums;

enum ScanStatus: string
{
    case PENDING = 'PENDING';
    case CLEAN = 'CLEAN';
    case INFECTED = 'INFECTED';

    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Analyse en cours',
            self::CLEAN => 'Sain',
            self::INFECTED => 'Infecté',
        };
    }
}
