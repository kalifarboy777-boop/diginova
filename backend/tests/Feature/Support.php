<?php

namespace Tests\Feature;

use App\Enums\PaymentMethod;
use App\Enums\ProductStatus;
use App\Enums\Role;
use App\Enums\SellerPlan;
use App\Models\Cart;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\SellerProfile;
use App\Models\User;
use App\Payments\PaymentService;
use App\Services\OrderService;
use Illuminate\Support\Facades\Storage;

/** Fabrique de données minimale pour les tests. */
final class Support
{
    public static function product(array $attrs = [], int $rate = 15): Product
    {
        $cat = Category::firstOrCreate(['slug' => 'business'], ['name' => 'Business', 'label' => 'BUSINESS']);
        $sellerUser = User::create(['name' => 'Créa Teur', 'email' => uniqid().'@ex.ci', 'password' => 'password', 'role' => Role::CREATOR]);
        $seller = SellerProfile::create(['user_id' => $sellerUser->id, 'display_name' => 'Studio', 'slug' => uniqid('s'),
            'plan' => $rate === 10 ? SellerPlan::PRO : SellerPlan::STANDARD, 'commission_rate' => $rate]);
        $p = Product::create($attrs + ['seller_id' => $seller->id, 'category_id' => $cat->id, 'title' => 'Business Plan Pro', 'slug' => uniqid('p'),
            'price' => 12000, 'status' => ProductStatus::PUBLISHED, 'version' => '1.0']);
        Storage::fake('products');
        Storage::disk('products')->put("f/{$p->id}.zip", 'PK demo');
        $p->files()->create(['storage_key' => "f/{$p->id}.zip", 'file_name' => 'demo.zip', 'size' => 7, 'format' => 'ZIP', 'scan_status' => 'CLEAN']);

        return $p;
    }

    /** Commande en attente de confirmation avec paiement initié chez le MockProvider. */
    public static function pendingOrder(?Product $product = null): Order
    {
        $product ??= self::product();
        $cart = Cart::create(['token' => uniqid()]);
        $cart->items()->create(['product_id' => $product->id, 'license' => 'PERSONAL']);
        $order = app(OrderService::class)->createFromCart($cart, 'client@ex.ci', '+2250701020304', PaymentMethod::WAVE)['order'];
        app(PaymentService::class)->initiate($order);

        return $order->refresh();
    }
}
