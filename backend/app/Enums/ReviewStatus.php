<?php

namespace App\Enums;

enum ReviewStatus: string
{
    case PUBLISHED = 'PUBLISHED';
    case HIDDEN = 'HIDDEN';

    public function label(): string
    {
        return match ($this) {
            self::PUBLISHED => 'Publié',
            self::HIDDEN => 'Masqué',
        };
    }
}
