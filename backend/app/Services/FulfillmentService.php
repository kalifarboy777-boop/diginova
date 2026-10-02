<?php

namespace App\Services;

use App\Enums\LedgerType;
use App\Enums\OrderStatus;
use App\Enums\RefundStatus;
use App\Mail\OrderConfirmation;
use App\Models\Invoice;
use App\Models\LibraryItem;
use App\Models\Order;
use App\Models\Setting;
use App\Models\User;
use App\Notifications\NewSale;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

/** Livraison d'une commande payée : tout est créé dans une seule transaction. */
final class FulfillmentService
{
    public function markPaid(Order $order, bool $notify = true): bool
    {
        $done = DB::transaction(function () use ($order) {
            /** @var Order $locked */
            $locked = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();
            if ($locked->status === OrderStatus::PAID) {
                return false;
            }

            $paidAt = now();
            $locked->update(['status' => OrderStatus::PAID, 'paid_at' => $paidAt]);
            $guarantee = (int) Setting::get('guarantee_days');
            $limit = (int) Setting::get('download_limit');

            foreach ($locked->items()->with('product')->get() as $item) {
                LibraryItem::firstOrCreate(
                    ['order_item_id' => $item->id],
                    [
                        'user_id' => $locked->user_id,
                        'product_id' => $item->product_id,
                        'license' => $item->license,
                        'granted_at' => $paidAt,
                        'download_limit' => $limit,
                        'seen_version' => $item->product->version ?? '1.0',
                    ],
                );
                $item->seller->ledgerEntries()->create([
                    'order_item_id' => $item->id,
                    'amount' => $item->seller_amount,
                    'type' => LedgerType::SALE,
                    'description' => "Vente {$locked->number} · {$item->title}",
                    'available_at' => $paidAt->copy()->addDays($guarantee),
                ]);
                $item->product->increment('sales_count');
            }

            if ($locked->coupon_id) {
                $locked->coupon()->increment('used_count');
                DB::table('coupon_user')->where('coupon_id', $locked->coupon_id)
                    ->where('user_id', $locked->user_id)->update(['used_at' => $paidAt]);
            }

            Invoice::firstOrCreate(['order_id' => $locked->id], ['number' => Numbers::invoice($locked)]);

            // Vide du panier les articles achetés (le panier reste intact si le paiement échoue).
            if ($locked->cart_id) {
                $items = $locked->items()->get(['product_id', 'bundle_id']);
                \App\Models\CartItem::where('cart_id', $locked->cart_id)
                    ->where(fn ($q) => $q->whereIn('product_id', $items->whereNull('bundle_id')->pluck('product_id'))
                        ->orWhereIn('bundle_id', $items->pluck('bundle_id')->filter()))
                    ->delete();
                \App\Models\Cart::whereKey($locked->cart_id)->where('coupon_id', $locked->coupon_id)->update(['coupon_id' => null]);
            }
            $locked->logEvent('paid', 'Commande payée', 'Fichiers livrés dans la bibliothèque', 'success');

            return true;
        });

        if ($done && $notify) {
            $order->refresh()->load('items.product', 'user');
            Mail::to($order->email)->queue(new OrderConfirmation($order));
            foreach ($order->items->groupBy('seller_id') as $items) {
                $seller = $items->first()->seller->user;
                $seller?->notify(new NewSale($order, $items->sum('seller_amount')));
            }
        }

        return $done;
    }

    /** Remboursement : révocation de la bibliothèque et débit du solde créateur. */
    public function refund(Order $order, ?User $actor = null): void
    {
        DB::transaction(function () use ($order, $actor) {
            $order->update(['status' => OrderStatus::REFUNDED]);
            foreach ($order->items as $item) {
                $item->libraryItem?->update(['revoked_at' => now()]);
                $item->seller->ledgerEntries()->create([
                    'order_item_id' => $item->id,
                    'amount' => -$item->seller_amount,
                    'type' => LedgerType::REFUND,
                    'description' => "Remboursement {$order->number} · {$item->title}",
                    'available_at' => now(),
                ]);
            }
            $order->refundRequests()->where('status', RefundStatus::REQUESTED)
                ->update(['status' => RefundStatus::APPROVED, 'decided_by' => $actor?->id, 'decided_at' => now()]);
            $order->logEvent('refunded', 'Commande remboursée', $actor ? "Par {$actor->name}" : null, 'warning');
        });
    }
}
