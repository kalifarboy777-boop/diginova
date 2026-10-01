<?php

namespace App\Services;

use App\Enums\CouponScope;
use App\Enums\CouponType;
use App\Models\Coupon;
use App\Support\Money;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

final class CouponService
{
    public function find(string $code): ?Coupon
    {
        return Coupon::where('code', mb_strtoupper(trim($code)))->first();
    }

    /**
     * Vérifie validité, dates, limite, minimum et portée.
     *
     * @param  Collection<int, array{product_id:?int, bundle_id:?int, price:int}>  $lines
     */
    public function assertApplicable(Coupon $coupon, Collection $lines): void
    {
        $fail = fn (string $msg) => throw ValidationException::withMessages(['code' => $msg]);
        $subtotal = $lines->sum('price');

        if (! $coupon->active) {
            $fail('Ce code promo n’est plus actif.');
        }
        if ($coupon->starts_at && $coupon->starts_at->isFuture()) {
            $fail('Ce code promo n’est pas encore valable.');
        }
        if ($coupon->expires_at && $coupon->expires_at->isPast()) {
            $fail('Ce code promo a expiré.');
        }
        if ($coupon->usage_limit !== null && $coupon->used_count >= $coupon->usage_limit) {
            $fail('Ce code promo a atteint sa limite d’utilisation.');
        }
        if ($subtotal < $coupon->min_amount) {
            $fail('Montant minimum de '.Money::format($coupon->min_amount).' requis pour ce code.');
        }
        if ($this->eligibleAmount($coupon, $lines) === 0) {
            $fail($coupon->scope === CouponScope::PACKS ? 'Ce code s’applique uniquement aux packs.' : 'Ce code ne s’applique à aucun article de votre panier.');
        }
    }

    /** @param  Collection<int, array{product_id:?int, bundle_id:?int, price:int}>  $lines */
    public function discount(Coupon $coupon, Collection $lines): int
    {
        $eligible = $this->eligibleAmount($coupon, $lines);

        $discount = $coupon->type === CouponType::PERCENT
            ? (int) round($eligible * $coupon->value / 100)
            : $coupon->value;

        return min($discount, $eligible);
    }

    /** @param  Collection<int, array{product_id:?int, bundle_id:?int, price:int}>  $lines */
    private function eligibleAmount(Coupon $coupon, Collection $lines): int
    {
        return (int) match ($coupon->scope) {
            CouponScope::ALL => $lines->sum('price'),
            CouponScope::PACKS => $lines->whereNotNull('bundle_id')->sum('price'),
            CouponScope::PRODUCT => $lines->where('product_id', $coupon->product_id)->sum('price'),
        };
    }
}
