<?php

namespace App\Services;

use App\Enums\License;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\Role;
use App\Models\Cart;
use App\Models\Order;
use App\Models\Product;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class OrderService
{
    public function __construct(private CartService $carts) {}

    /**
     * Checkout sans compte obligatoire : le client est retrouvé ou créé à partir de l'email.
     *
     * @return array{order: Order, user: User, created: bool}
     */
    public function createFromCart(Cart $cart, string $email, string $phone, PaymentMethod $method, ?User $user = null): array
    {
        $summary = $this->carts->summary($cart);
        if ($summary['count'] === 0) {
            throw ValidationException::withMessages(['cart' => 'Votre panier est vide.']);
        }
        if ($summary['coupon_error']) {
            throw ValidationException::withMessages(['code' => $summary['coupon_error']]);
        }

        return DB::transaction(function () use ($summary, $email, $phone, $method, $user) {
            $created = false;
            if (! $user) {
                $user = User::where('email', mb_strtolower($email))->first();
                if (! $user) {
                    $user = User::create([
                        'name' => Str::of(Str::before($email, '@'))->replace(['.', '_', '-'], ' ')->title()->toString(),
                        'email' => mb_strtolower($email),
                        'role' => Role::CLIENT,
                    ]);
                    $created = true;
                }
            }

            $order = Order::create([
                'number' => Numbers::order(),
                'user_id' => $user->id,
                'email' => mb_strtolower($email),
                'phone' => $phone,
                'subtotal' => $summary['subtotal'],
                'discount' => $summary['discount'],
                'total' => $summary['total'],
                'status' => OrderStatus::PENDING,
                'coupon_id' => $summary['discount'] > 0 ? $summary['coupon']?->id : null,
                'payment_method' => $method,
                'payment_phone' => $phone,
                'access_token' => Str::random(48),
                'expires_at' => now()->addMinutes((int) Setting::get('payment_timeout_minutes')),
            ]);

            $this->createItems($order, $summary['lines']->all(), $summary['subtotal'], $summary['discount']);
            $order->logEvent('created', 'Commande créée');

            return ['order' => $order->fresh('items'), 'user' => $user, 'created' => $created];
        });
    }

    /**
     * Ventile le prix des packs et la remise au prorata, puis calcule la commission par créateur.
     *
     * @param  array<int, array<string, mixed>>  $lines
     */
    public function createItems(Order $order, array $lines, int $subtotal, int $discount): void
    {
        $rows = [];
        foreach ($lines as $line) {
            if ($line['type'] === 'bundle') {
                $products = $line['bundle']->products;
                $sum = max(1, $products->sum('price'));
                $allocated = 0;
                foreach ($products->values() as $i => $p) {
                    $share = $i === $products->count() - 1
                        ? $line['price'] - $allocated
                        : (int) floor($line['price'] * $p->price / $sum);
                    $allocated += $share;
                    $rows[] = ['product' => $p, 'license' => License::PERSONAL, 'price' => $share, 'bundle_id' => $line['bundle_id']];
                }
            } else {
                $rows[] = ['product' => $line['product'], 'license' => License::from($line['license']), 'price' => $line['price'], 'bundle_id' => null];
            }
        }

        $remaining = $discount;
        foreach ($rows as $i => $row) {
            $rowDiscount = $i === count($rows) - 1
                ? $remaining
                : (int) floor($discount * $row['price'] / max(1, $subtotal));
            $remaining -= $rowDiscount;
            $net = max(0, $row['price'] - $rowDiscount);

            /** @var Product $product */
            $product = $row['product'];
            $product->loadMissing('seller');
            $rate = $product->seller->commission_rate;
            $commission = (int) round($net * $rate / 100);

            $order->items()->create([
                'product_id' => $product->id,
                'seller_id' => $product->seller_id,
                'bundle_id' => $row['bundle_id'],
                'title' => $product->title,
                'license' => $row['license'],
                'list_price' => $row['price'],
                'unit_price' => $net,
                'commission_rate' => $rate,
                'commission_amount' => $commission,
                'seller_amount' => $net - $commission,
            ]);
        }
    }
}
