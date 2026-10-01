<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Order;
use App\Models\Payout;
use App\Models\SupportTicket;

/** Générateurs de références lisibles : DN-AAAA-NNNNNN, PO-AAAA-NNNN, FA-AAAA-NNNNNN, #NNNN. */
final class Numbers
{
    public static function order(): string
    {
        $year = now()->year;
        $last = Order::where('number', 'like', "DN-$year-%")->max('number');
        $next = $last ? ((int) substr($last, -6)) + 1 : 1;

        return sprintf('DN-%d-%06d', $year, $next);
    }

    public static function payout(): string
    {
        $year = now()->year;
        $last = Payout::where('reference', 'like', "PO-$year-%")->max('reference');
        $next = $last ? ((int) substr($last, -4)) + 1 : 1;

        return sprintf('PO-%d-%04d', $year, $next);
    }

    public static function invoice(Order $order): string
    {
        return 'FA-'.substr($order->number, 3);
    }

    public static function ticket(): int
    {
        return ((int) (SupportTicket::max('number') ?? 999)) + 1;
    }

    public static function invoiceExists(Order $order): bool
    {
        return Invoice::where('order_id', $order->id)->exists();
    }
}
