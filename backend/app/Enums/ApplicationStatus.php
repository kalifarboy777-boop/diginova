<?php

namespace App\Enums;

enum ApplicationStatus: string
{
    case SUBMITTED = 'SUBMITTED';
    case NEEDS_DOCUMENT = 'NEEDS_DOCUMENT';
    case APPROVED = 'APPROVED';
    case REJECTED = 'REJECTED';

    public function label(): string
    {
        return match ($this) {
            self::SUBMITTED => 'En attente',
            self::NEEDS_DOCUMENT => 'Document demandé',
            self::APPROVED => 'Approuvée',
            self::REJECTED => 'Refusée',
        };
    }
}
