<?php

use App\Enums\CouponScope;
use App\Enums\CouponType;
use App\Enums\Role;
use App\Models\Coupon;
use App\Models\LibraryItem;
use App\Models\User;
use App\Services\FulfillmentService;
use Tests\Feature\Support;

it('applique un coupon pourcentage et calcule la licence commerciale à +50 %', function () {
    $p = Support::product();
    Coupon::create(['code' => 'LANCEMENT', 'type' => CouponType::PERCENT, 'value' => 10, 'scope' => CouponScope::ALL]);

    $this->postJson('/api/cart/items', ['product_id' => $p->id, 'license' => 'COMMERCIAL'])->assertCreated()->assertJsonPath('total', 18000);
    $cookie = $this->postJson('/api/cart/items', ['product_id' => $p->id])->getCookie('dn_cart', false)->getValue();
    $this->withCredentials()->withUnencryptedCookie('dn_cart', $cookie)->postJson('/api/cart/coupon', ['code' => 'lancement'])
        ->assertOk()->assertJson(['subtotal' => 12000, 'discount' => 1200, 'total' => 10800]);
});

it('refuse un coupon expiré, hors portée ou sous le minimum', function () {
    $p = Support::product();
    Coupon::create(['code' => 'VIEUX', 'type' => CouponType::PERCENT, 'value' => 10, 'scope' => CouponScope::ALL, 'expires_at' => now()->subDay()]);
    Coupon::create(['code' => 'PACKS', 'type' => CouponType::PERCENT, 'value' => 20, 'scope' => CouponScope::PACKS]);
    Coupon::create(['code' => 'MIN', 'type' => CouponType::FIXED, 'value' => 5000, 'scope' => CouponScope::ALL, 'min_amount' => 20000]);
    $cookie = $this->postJson('/api/cart/items', ['product_id' => $p->id])->getCookie('dn_cart', false)->getValue();

    foreach (['VIEUX' => 'expiré', 'PACKS' => 'packs', 'MIN' => 'minimum', 'INCONNU' => 'n’existe pas'] as $code => $msg) {
        $this->withCredentials()->withUnencryptedCookie('dn_cart', $cookie)->postJson('/api/cart/coupon', ['code' => $code])
            ->assertUnprocessable()->assertJsonValidationErrors('code');
    }
});

it('crée le compte client lors d’un checkout invité', function () {
    $p = Support::product();
    $cookie = $this->postJson('/api/cart/items', ['product_id' => $p->id])->getCookie('dn_cart', false)->getValue();

    $this->withCredentials()->withUnencryptedCookie('dn_cart', $cookie)->postJson('/api/checkout', [
        'email' => 'Nouveau@Ex.ci', 'phone' => '+225 07 01 02 03 04', 'method' => 'ORANGE_MONEY', 'accept_terms' => true,
    ])->assertCreated()->assertJson(['account_created' => true]);

    expect(User::where('email', 'nouveau@ex.ci')->first())->role->toBe(Role::CLIENT)->password->toBeNull();
});

it('limite les téléchargements à 10 et journalise chaque téléchargement', function () {
    $order = Support::pendingOrder();
    app(FulfillmentService::class)->markPaid($order, notify: false);
    $item = LibraryItem::firstOrFail();
    $file = $item->product->files()->first();
    $user = $item->user;

    for ($i = 0; $i < 10; $i++) {
        $this->as($user)->postJson("/api/library/{$item->id}/files/{$file->id}/download")->assertOk()->assertJsonStructure(['url', 'expires_in']);
    }
    $this->as($user)->postJson("/api/library/{$item->id}/files/{$file->id}/download")->assertStatus(429);
    expect($item->downloads()->count())->toBe(10);
});

it('interdit le téléchargement à un autre client et après remboursement', function () {
    $order = Support::pendingOrder();
    app(FulfillmentService::class)->markPaid($order, notify: false);
    $item = LibraryItem::firstOrFail();
    $file = $item->product->files()->first();
    $intrus = User::create(['name' => 'Intrus', 'email' => 'intrus@ex.ci', 'password' => 'password']);

    $this->as($intrus)->postJson("/api/library/{$item->id}/files/{$file->id}/download")->assertNotFound();

    app(FulfillmentService::class)->refund($order->fresh('items.libraryItem', 'items.seller'));
    $this->as($item->user)->postJson("/api/library/{$item->id}/files/{$file->id}/download")->assertForbidden();
});

it('réserve le studio aux créateurs et l’admin au personnel', function () {
    $client = User::create(['name' => 'Cli', 'email' => 'c@ex.ci', 'password' => 'password']);
    $mod = User::create(['name' => 'Mod', 'email' => 'm@ex.ci', 'password' => 'password', 'role' => Role::MODERATOR]);

    $this->as($client)->getJson('/api/studio/dashboard')->assertForbidden();
    $this->as($client)->getJson('/api/admin/dashboard')->assertForbidden();
    $this->as($mod)->getJson('/api/admin/moderation')->assertOk();
    // Les modérateurs n'ont pas accès aux paiements, commissions ni paramètres.
    $this->as($mod)->getJson('/api/admin/settings')->assertForbidden();
    $this->as($mod)->getJson('/api/admin/commissions')->assertForbidden();
});

it('n’autorise les avis qu’aux acheteurs du produit', function () {
    $order = Support::pendingOrder();
    $product = $order->items->first()->product;
    $other = User::create(['name' => 'Autre', 'email' => 'a@ex.ci', 'password' => 'password']);

    $this->as($other)->postJson("/api/products/{$product->slug}/reviews", ['rating' => 5])->assertForbidden();
    app(FulfillmentService::class)->markPaid($order, notify: false);
    $this->as($order->user)->postJson("/api/products/{$product->slug}/reviews", ['rating' => 4, 'comment' => 'Bien'])->assertCreated();
    $this->as($order->user)->postJson("/api/products/{$product->slug}/reviews", ['rating' => 5])->assertStatus(409);
});
