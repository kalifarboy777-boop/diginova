<?php

namespace App\Enums;

enum LedgerType: string
{
    case SALE = 'SALE';
    case REFUND = 'REFUND';
    case PAYOUT = 'PAYOUT';
    case ADJUSTMENT = 'ADJUSTMENT';

    public function label(): string
    {
        return match ($this) {
            self::SALE => 'Vente',
            self::REFUND => 'Remboursement',
            self::PAYOUT => 'Retrait',
            self::ADJUSTMENT => 'Ajustement',
        };
    }
}
