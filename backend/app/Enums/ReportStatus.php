<?php

namespace App\Enums;

enum ReportStatus: string
{
    case OPEN = 'OPEN';
    case DISMISSED = 'DISMISSED';
    case ACTIONED = 'ACTIONED';

    public function label(): string
    {
        return match ($this) {
            self::OPEN => 'Ouvert',
            self::DISMISSED => 'Classé',
            self::ACTIONED => 'Traité',
        };
    }
}
