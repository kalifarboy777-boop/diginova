<?php

namespace App\Enums;

enum OrderStatus: string
{
    case PENDING = 'PENDING';
    case AWAITING_CONFIRMATION = 'AWAITING_CONFIRMATION';
    case PAID = 'PAID';
    case FAILED = 'FAILED';
    case EXPIRED = 'EXPIRED';
    case REFUNDED = 'REFUNDED';
    case NEEDS_REVIEW = 'NEEDS_REVIEW';

    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'En attente',
            self::AWAITING_CONFIRMATION => 'Confirmation en attente',
            self::PAID => 'Payée',
            self::FAILED => 'Échouée',
            self::EXPIRED => 'Expirée',
            self::REFUNDED => 'Remboursée',
            self::NEEDS_REVIEW => 'À vérifier',
        };
    }
}
