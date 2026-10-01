<?php

namespace App\Enums;

enum License: string
{
    case PERSONAL = 'PERSONAL';
    case COMMERCIAL = 'COMMERCIAL';

    public function label(): string
    {
        return match ($this) {
            self::PERSONAL => 'Licence personnelle',
            self::COMMERCIAL => 'Licence commerciale',
        };
    }
}
