<?php

namespace App\Services;

use App\Enums\License;
use App\Enums\ProductStatus;
use App\Models\Bundle;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Coupon;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class CartService
{
    public function __construct(private CouponService $coupons) {}

    /** Panier du compte connecté, sinon panier invité identifié par un jeton (cookie signé). */
    public function resolve(?User $user, ?string $token, bool $create = false): ?Cart
    {
        if ($user) {
            return $create ? Cart::firstOrCreate(['user_id' => $user->id]) : $user->cart;
        }
        if ($token) {
            $cart = Cart::where('token', $token)->whereNull('user_id')->first();
            if ($cart) {
                return $cart;
            }
        }

        return $create ? Cart::create(['token' => Str::random(48)]) : null;
    }

    public function addProduct(Cart $cart, Product $product, License $license, ?string $group = null, ?int $groupSize = null): void
    {
        if ($product->status !== ProductStatus::PUBLISHED) {
            throw ValidationException::withMessages(['product' => 'Produit indisponible.']);
        }
        $item = $cart->items()->firstOrNew(['product_id' => $product->id, 'bundle_id' => null]);
        $item->license = $license;
        if ($group) {
            $item->group_key = $group;
            $item->group_size = $groupSize;
        }
        $item->save();
    }

    public function addBundle(Cart $cart, Bundle $bundle): void
    {
        $cart->items()->firstOrCreate(['bundle_id' => $bundle->id, 'product_id' => null]);
    }

    /** Fusionne le panier invité dans celui du compte, à la connexion. */
    public function merge(?string $guestToken, User $user): void
    {
        if (! $guestToken) {
            return;
        }
        $guest = Cart::where('token', $guestToken)->whereNull('user_id')->with('items')->first();
        if (! $guest) {
            return;
        }
        $cart = Cart::firstOrCreate(['user_id' => $user->id]);
        foreach ($guest->items as $item) {
            $exists = $cart->items()
                ->where('product_id', $item->product_id)
                ->where('bundle_id', $item->bundle_id)
                ->exists();
            if (! $exists) {
                $cart->items()->create($item->only(['product_id', 'bundle_id', 'license']));
            }
        }
        if ($guest->coupon_id && ! $cart->coupon_id) {
            $cart->update(['coupon_id' => $guest->coupon_id]);
        }
        $guest->delete();
    }

    /** @return Collection<int, array<string, mixed>> */
    public function lines(Cart $cart): Collection
    {
        $cart->loadMissing(['items.product.category', 'items.product.seller', 'items.bundle.products']);
        $groups = $cart->items->whereNotNull('group_key')->countBy('group_key');
        $groupDiscount = (int) \App\Models\Setting::get('bundle_discount_percent');
        $complete = fn (CartItem $i) => $i->group_key && $i->license === License::PERSONAL && ($groups[$i->group_key] ?? 0) >= max(2, (int) $i->group_size);

        return $cart->items->map(fn (CartItem $item) => $item->bundle
            ? [
                'id' => $item->id,
                'type' => 'bundle',
                'product_id' => null,
                'bundle_id' => $item->bundle_id,
                'license' => License::PERSONAL->value,
                'price' => $item->bundle->price,
                'compare_at_price' => $item->bundle->value,
                'bundle' => $item->bundle,
            ]
            : [
                'id' => $item->id,
                'type' => 'product',
                'product_id' => $item->product_id,
                'bundle_id' => null,
                'license' => $item->license->value,
                'price' => $complete($item)
                    ? (int) round($item->product->price * (100 - $groupDiscount) / 100)
                    : $item->product->priceFor($item->license->value),
                'compare_at_price' => $complete($item) ? $item->product->price : ($item->license === License::PERSONAL ? $item->product->compare_at_price : null),
                'group' => $complete($item) ? 'Souvent achetés ensemble · -'.$groupDiscount.' %' : null,
                'product' => $item->product,
            ])->values();
    }

    /** @return array{lines: Collection<int, array<string, mixed>>, count:int, subtotal:int, discount:int, total:int, coupon: ?Coupon, coupon_error: ?string} */
    public function summary(Cart $cart): array
    {
        $lines = $this->lines($cart);
        $subtotal = (int) $lines->sum('price');
        $discount = 0;
        $error = null;
        $coupon = $cart->coupon;

        if ($coupon) {
            try {
                $this->coupons->assertApplicable($coupon, $lines);
                $discount = $this->coupons->discount($coupon, $lines);
            } catch (ValidationException $e) {
                $error = collect($e->errors())->flatten()->first();
            }
        }

        return [
            'lines' => $lines,
            'count' => $lines->count(),
            'subtotal' => $subtotal,
            'discount' => $discount,
            'total' => max(0, $subtotal - $discount),
            'coupon' => $coupon,
            'coupon_error' => $error,
        ];
    }
}
