<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case INITIATED = 'INITIATED';
    case PENDING = 'PENDING';
    case SUCCEEDED = 'SUCCEEDED';
    case FAILED = 'FAILED';
    case EXPIRED = 'EXPIRED';

    public function label(): string
    {
        return match ($this) {
            self::INITIATED => 'Initié',
            self::PENDING => 'En attente',
            self::SUCCEEDED => 'Réussi',
            self::FAILED => 'Échoué',
            self::EXPIRED => 'Expiré',
        };
    }
}
