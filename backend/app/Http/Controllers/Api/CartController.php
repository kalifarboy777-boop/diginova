<?php

namespace App\Http\Controllers\Api;

use App\Enums\License;
use App\Http\Controllers\Controller;
use App\Http\Resources\BundleResource;
use App\Http\Resources\ProductCardResource;
use App\Models\Bundle;
use App\Models\Cart;
use App\Models\Favorite;
use App\Models\Product;
use App\Services\CartService;
use App\Services\CouponService;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Cookie;

/** Écran 20 — panier (invité par cookie chiffré, ou compte). */
class CartController extends Controller
{
    public const COOKIE = 'dn_cart';

    public function __construct(private CartService $carts, private CouponService $coupons) {}

    public function show(Request $request): JsonResponse
    {
        return $this->respond($request, $this->cart($request));
    }

    public function add(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => 'required_without:bundle_id|nullable|integer|exists:products,id',
            'bundle_id' => 'required_without:product_id|nullable|integer|exists:bundles,id',
            'license' => 'nullable|in:PERSONAL,COMMERCIAL',
            'product_ids' => 'nullable|array|max:5', 'product_ids.*' => 'integer|exists:products,id',
        ]);
        $cart = $this->cart($request, create: true);

        if (! empty($data['bundle_id'])) {
            $this->carts->addBundle($cart, Bundle::where('active', true)->findOrFail($data['bundle_id']));
        } else {
            $ids = array_unique(array_merge([$data['product_id']], $data['product_ids'] ?? []));
            foreach (Product::whereIn('id', $ids)->get() as $product) {
                $this->carts->addProduct($cart, $product, License::from($product->id === (int) $data['product_id'] ? ($data['license'] ?? 'PERSONAL') : 'PERSONAL'));
            }
        }

        return $this->respond($request, $cart->refresh(), 201);
    }

    public function update(Request $request, int $item): JsonResponse
    {
        $data = $request->validate(['license' => 'required|in:PERSONAL,COMMERCIAL']);
        $cart = $this->cart($request) ?? abort(404);
        $cart->items()->whereKey($item)->whereNotNull('product_id')->firstOrFail()->update(['license' => $data['license']]);

        return $this->respond($request, $cart->refresh());
    }

    public function remove(Request $request, int $item): JsonResponse
    {
        $cart = $this->cart($request) ?? abort(404);
        $cart->items()->whereKey($item)->delete();

        return $this->respond($request, $cart->refresh());
    }

    /** « Sauvegarder pour plus tard » : passe l'article en favori. */
    public function saveForLater(Request $request, int $item): JsonResponse
    {
        $user = $request->user() ?? throw ValidationException::withMessages(['auth' => 'Connectez-vous pour sauvegarder un article.']);
        $cart = $this->cart($request) ?? abort(404);
        $line = $cart->items()->whereKey($item)->whereNotNull('product_id')->with('product')->firstOrFail();
        Favorite::firstOrCreate(['user_id' => $user->id, 'product_id' => $line->product_id], ['price_at_save' => $line->product->price]);
        $line->delete();

        return $this->respond($request, $cart->refresh());
    }

    public function applyCoupon(Request $request): JsonResponse
    {
        $code = $request->validate(['code' => 'required|string|max:40'])['code'];
        $cart = $this->cart($request) ?? throw ValidationException::withMessages(['code' => 'Votre panier est vide.']);
        $coupon = $this->coupons->find($code) ?? throw ValidationException::withMessages(['code' => 'Ce code promo n’existe pas.']);
        $this->coupons->assertApplicable($coupon, $this->carts->lines($cart));
        $cart->update(['coupon_id' => $coupon->id]);

        return $this->respond($request, $cart->refresh());
    }

    public function removeCoupon(Request $request): JsonResponse
    {
        $cart = $this->cart($request);
        $cart?->update(['coupon_id' => null]);

        return $this->respond($request, $cart?->refresh());
    }

    private function cart(Request $request, bool $create = false): ?Cart
    {
        return $this->carts->resolve($request->user(), $request->cookie(self::COOKIE), $create);
    }

    public function respond(Request $request, ?Cart $cart, int $status = 200): JsonResponse
    {
        $payload = ['items' => [], 'count' => 0, 'subtotal' => 0, 'discount' => 0, 'total' => 0, 'coupon' => null, 'coupon_error' => null, 'upsell' => null];
        if ($cart) {
            $s = $this->carts->summary($cart);
            $payload = [
                'items' => $s['lines']->map(fn ($l) => [
                    'id' => $l['id'], 'type' => $l['type'], 'license' => $l['license'], 'price' => $l['price'], 'compare_at_price' => $l['compare_at_price'],
                    'product' => isset($l['product']) ? (new ProductCardResource($l['product']))->toArray($request) + [
                        'commercial_price' => $l['product']->commercialPrice(),
                        'seller' => ['name' => $l['product']->seller->display_name, 'slug' => $l['product']->seller->slug],
                    ] : null,
                    'bundle' => isset($l['bundle']) ? (new BundleResource($l['bundle']))->toArray($request) : null,
                ])->values(),
                'count' => $s['count'],
                'subtotal' => $s['subtotal'],
                'discount' => $s['discount'],
                'total' => $s['total'],
                'coupon' => $s['coupon'] ? ['code' => $s['coupon']->code, 'label' => $s['coupon']->label()] : null,
                'coupon_error' => $s['coupon_error'],
                'upsell' => $this->upsell($s['lines']),
            ];
        }
        $response = response()->json($payload, $status);
        if ($cart && ! $cart->user_id && $cart->token) {
            $response->withCookie(cookie(self::COOKIE, $cart->token, 60 * 24 * 30, '/', null, null, true, false, Cookie::SAMESITE_LAX));
        }

        return $response;
    }

    /** Upsell Pack Entrepreneur si le panier contient des produits du pack. */
    private function upsell($lines): ?array
    {
        if ($lines->contains('type', 'bundle') || $lines->isEmpty()) {
            return null;
        }
        $bundle = Bundle::where('featured', true)->where('active', true)->with('products')->first();
        if (! $bundle) {
            return null;
        }
        $inCart = $lines->pluck('product_id')->filter();
        $overlap = $bundle->products->pluck('id')->intersect($inCart);
        if ($overlap->isEmpty()) {
            return null;
        }
        $others = $bundle->products->whereNotIn('id', $inCart)->pluck('title')->map(fn ($t) => Str::before($t, ' —'));

        return [
            'bundle' => ['id' => $bundle->id, 'slug' => $bundle->slug, 'title' => $bundle->title, 'price' => $bundle->price, 'value' => $bundle->value],
            'message' => 'Vos '.$overlap->count().' article'.($overlap->count() > 1 ? 's' : '').' + '.$others->implode(' + ')
                .' pour '.Money::format($bundle->price).' au lieu de '.Money::format($bundle->value).'.',
        ];
    }
}
