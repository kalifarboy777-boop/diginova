<?php

namespace App\Enums;

enum Role: string
{
    case CLIENT = 'CLIENT';
    case CREATOR = 'CREATOR';
    case MODERATOR = 'MODERATOR';
    case ADMIN = 'ADMIN';

    public function label(): string
    {
        return match ($this) {
            self::CLIENT => 'Client',
            self::CREATOR => 'Créateur',
            self::MODERATOR => 'Modérateur',
            self::ADMIN => 'Administrateur',
        };
    }
}
