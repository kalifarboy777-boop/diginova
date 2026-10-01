<?php

namespace App\Notifications;

use App\Models\Order;
use App\Support\Money;

class NewSale extends AppNotification
{
    public function __construct(Order $order, int $amount)
    {
        parent::__construct(
            'sale',
            'Nouvelle vente : +'.Money::format($amount, true),
            $order->items->pluck('title')->unique()->implode(', '),
            '/studio/ventes',
        );
    }
}
