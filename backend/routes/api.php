<?php

use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\ApplicationController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\ContentController;
use App\Http\Controllers\Api\DownloadController;
use App\Http\Controllers\Api\EarningsController;
use App\Http\Controllers\Api\MockPaymentController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\StudioController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\WebhookController;
use Illuminate\Support\Facades\Route;

/*
| API DigiNova — consommée par le frontend Next.js (même origine via proxy /api).
| Auth : Sanctum SPA (cookie de session + XSRF-TOKEN).
*/

Route::middleware('throttle:api')->group(function () {
    // ── Vitrine
    Route::get('home', [CatalogController::class, 'home']);
    Route::get('categories', [CatalogController::class, 'categories']);
    Route::get('products', [CatalogController::class, 'products']);
    Route::get('products/{slug}', [CatalogController::class, 'show']);
    Route::get('products/{slug}/reviews', [CatalogController::class, 'reviews']);
    Route::post('products/{slug}/report', [ContentController::class, 'report'])->middleware('throttle:contact');
    Route::get('search/suggest', [CatalogController::class, 'suggest']);
    Route::get('bundles', [CatalogController::class, 'bundles']);
    Route::get('bundles/{slug}', [CatalogController::class, 'bundle']);
    Route::get('sellers/{slug}', [CatalogController::class, 'seller']);
    Route::get('help', [ContentController::class, 'help']);
    Route::get('help/{slug}', [ContentController::class, 'helpArticle']);
    Route::post('contact', [ContentController::class, 'contact'])->middleware('throttle:contact');
    Route::post('newsletter', [ContentController::class, 'newsletter'])->middleware('throttle:contact');
    Route::get('blog', [ContentController::class, 'blog']);
    Route::get('blog/{slug}', [ContentController::class, 'blogPost']);

    // ── Panier (invité ou connecté)
    Route::get('cart', [CartController::class, 'show']);
    Route::post('cart/items', [CartController::class, 'add']);
    Route::patch('cart/items/{item}', [CartController::class, 'update']);
    Route::delete('cart/items/{item}', [CartController::class, 'remove']);
    Route::post('cart/items/{item}/save', [CartController::class, 'saveForLater']);
    Route::post('cart/coupon', [CartController::class, 'applyCoupon']);
    Route::delete('cart/coupon', [CartController::class, 'removeCoupon']);

    // ── Checkout & suivi de paiement (accès par session ou jeton de commande)
    Route::post('checkout', [CheckoutController::class, 'store'])->middleware('throttle:checkout');
    Route::get('orders/{order}/status', [CheckoutController::class, 'status']);
    Route::post('orders/{order}/retry', [CheckoutController::class, 'retry'])->middleware('throttle:checkout');
    Route::get('orders/{order}/summary', [CheckoutController::class, 'summary']);
    Route::post('orders/{order}/password-link', [CheckoutController::class, 'sendPasswordLink'])->middleware('throttle:contact');
    Route::post('library/{item}/files/{file}/download', [DownloadController::class, 'file'])->middleware('throttle:downloads');
    Route::post('library/{item}/download-all', [DownloadController::class, 'all'])->middleware('throttle:downloads');

    // ── Authentification
    Route::prefix('auth')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('register', [AuthController::class, 'register'])->middleware('throttle:login');
        Route::post('login', [AuthController::class, 'loginWithPassword'])->middleware('throttle:login');
        Route::post('otp/send', [AuthController::class, 'sendOtp'])->middleware('throttle:otp');
        Route::post('otp/verify', [AuthController::class, 'verifyOtp'])->middleware('throttle:otp');
        Route::post('magic-link', [AuthController::class, 'sendMagicLink'])->middleware('throttle:otp');
        Route::post('magic-link/consume', [AuthController::class, 'consumeMagicLink'])->middleware('throttle:login');
        Route::post('password/forgot', [AuthController::class, 'forgotPassword'])->middleware('throttle:otp');
        Route::post('password/reset', [AuthController::class, 'resetPassword'])->middleware('throttle:login');
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('google/redirect', [AuthController::class, 'googleRedirect']);
        Route::get('google/callback', [AuthController::class, 'googleCallback']);
    });
});

// ── Webhooks prestataires (pas de session, signature HMAC vérifiée)
Route::post('webhooks/{provider}', WebhookController::class)->middleware('throttle:120,1');

// ── Paiement simulé (développement uniquement)
Route::get('dev/mock-payments/{ref}', [MockPaymentController::class, 'show']);
Route::post('dev/mock-payments/{ref}', [MockPaymentController::class, 'act']);

Route::middleware(['auth:sanctum', 'active', 'throttle:api'])->group(function () {
    // ── Espace client (écrans 30 à 35)
    Route::prefix('account')->group(function () {
        Route::get('nav', [AccountController::class, 'nav']);
        Route::get('dashboard', [AccountController::class, 'dashboard']);
        Route::get('library', [AccountController::class, 'library']);
        Route::get('library/{item}', [AccountController::class, 'libraryItem']);
        Route::get('orders', [AccountController::class, 'orders']);
        Route::get('orders/export', [AccountController::class, 'exportOrders']);
        Route::get('orders/{order}/invoice', [AccountController::class, 'invoice']);
        Route::post('orders/{order}/refund', [AccountController::class, 'requestRefund']);
        Route::get('favorites', [AccountController::class, 'favorites']);
        Route::post('favorites/cart', [AccountController::class, 'favoritesToCart']);
        Route::get('coupons', [AccountController::class, 'coupons']);
        Route::get('notifications', [AccountController::class, 'notifications']);
        Route::post('notifications/read', [AccountController::class, 'readNotifications']);
        Route::get('profile', [ProfileController::class, 'show']);
        Route::patch('profile', [ProfileController::class, 'update']);
        Route::post('profile/avatar', [ProfileController::class, 'avatar']);
        Route::delete('profile/avatar', [ProfileController::class, 'deleteAvatar']);
        Route::put('password', [ProfileController::class, 'password']);
        Route::patch('security', [ProfileController::class, 'security']);
        Route::patch('notification-preferences', [ProfileController::class, 'notifications']);
        Route::delete('sessions/{id}', [ProfileController::class, 'revokeSession']);
        Route::delete('/', [ProfileController::class, 'destroy']);
        Route::get('tickets', [TicketController::class, 'index']);
        Route::post('tickets', [TicketController::class, 'store']);
        Route::get('tickets/{ticket}', [TicketController::class, 'show']);
        Route::post('tickets/{ticket}/messages', [TicketController::class, 'reply']);
        Route::post('tickets/{ticket}/resolve', [TicketController::class, 'resolve']);
    });
    Route::post('favorites/toggle', [AccountController::class, 'toggleFavorite']);
    Route::post('products/{slug}/reviews', [ContentController::class, 'storeReview']);

    // ── Candidature créateur (écran 40)
    Route::get('studio/application', [ApplicationController::class, 'show']);
    Route::put('studio/application', [ApplicationController::class, 'save']);
    Route::post('studio/application/files', [ApplicationController::class, 'upload']);
    Route::delete('studio/application/samples/{index}', [ApplicationController::class, 'removeSample']);
    Route::post('studio/application/submit', [ApplicationController::class, 'submit']);

    // ── Studio créateur (écrans 41 à 44)
    Route::prefix('studio')->middleware('role:creator')->group(function () {
        Route::get('nav', [StudioController::class, 'nav']);
        Route::get('dashboard', [StudioController::class, 'dashboard']);
        Route::get('products', [StudioController::class, 'products']);
        Route::post('products', [StudioController::class, 'createProduct']);
        Route::get('products/{id}', [StudioController::class, 'showProduct']);
        Route::patch('products/{id}', [StudioController::class, 'updateProduct']);
        Route::delete('products/{id}', [StudioController::class, 'archive']);
        Route::post('products/{id}/files', [StudioController::class, 'uploadFile']);
        Route::delete('products/{id}/files/{file}', [StudioController::class, 'deleteFile']);
        Route::post('products/{id}/images', [StudioController::class, 'uploadImage']);
        Route::delete('products/{id}/images/{image}', [StudioController::class, 'deleteImage']);
        Route::post('products/{id}/submit', [StudioController::class, 'submit']);
        Route::get('sales', [StudioController::class, 'salesList']);
        Route::get('customers', [StudioController::class, 'customers']);
        Route::get('stats', [StudioController::class, 'stats']);
        Route::get('reviews', [StudioController::class, 'reviews']);
        Route::post('reviews/{review}/reply', [StudioController::class, 'replyReview']);
        Route::get('coupons', [StudioController::class, 'coupons']);
        Route::post('coupons', [StudioController::class, 'storeCoupon']);
        Route::post('coupons/{coupon}/toggle', [StudioController::class, 'toggleCoupon']);
        Route::get('profile', [StudioController::class, 'profile']);
        Route::put('profile', [StudioController::class, 'updateProfile']);
        Route::get('earnings', [EarningsController::class, 'show']);
        Route::get('earnings/export', [EarningsController::class, 'export']);
        Route::post('payouts/request', [EarningsController::class, 'request'])->middleware('throttle:otp');
        Route::post('payouts/confirm', [EarningsController::class, 'confirm'])->middleware('throttle:otp');
    });

    // ── Console admin (écrans 50 à 53) — MODERATOR ou ADMIN
    Route::prefix('admin')->middleware('role:staff')->group(function () {
        Route::get('nav', [AdminController::class, 'nav']);
        Route::get('dashboard', [AdminController::class, 'dashboard']);
        Route::post('alerts/{alert}/resolve', [AdminController::class, 'resolveAlert']);
        Route::get('moderation', [AdminController::class, 'moderation']);
        Route::get('moderation/{product}', [AdminController::class, 'moderationShow']);
        Route::post('moderation/{product}/decision', [AdminController::class, 'moderationDecide']);
        Route::get('moderation/{product}/files/{file}', [AdminController::class, 'moderationFile']);
        Route::get('products', [AdminController::class, 'products']);
        Route::post('products/{product}/unpublish', [AdminController::class, 'unpublish']);
        Route::get('categories', [AdminController::class, 'categories']);
        Route::post('categories', [AdminController::class, 'saveCategory']);
        Route::put('categories/{category}', [AdminController::class, 'saveCategory']);
        Route::delete('categories/{category}', [AdminController::class, 'deleteCategory']);
        Route::get('orders', [AdminController::class, 'orders']);
        Route::get('orders/{order}', [AdminController::class, 'order']);
        Route::get('refunds', [AdminController::class, 'refunds']);
        Route::get('creators', [AdminController::class, 'creators']);
        Route::post('applications/{application}/identity', [AdminController::class, 'verifyIdentity']);
        Route::post('applications/{application}/decision', [AdminController::class, 'decideApplication']);
        Route::get('reviews', [AdminController::class, 'reviews']);
        Route::post('reviews/{review}/status', [AdminController::class, 'moderateReview']);
        Route::post('reports/{report}/decision', [AdminController::class, 'decideReport']);
        Route::get('tickets', [AdminController::class, 'tickets']);
        Route::get('tickets/{ticket}', [TicketController::class, 'show']);
        Route::post('tickets/{ticket}/messages', [TicketController::class, 'reply']);
        Route::post('tickets/{ticket}/resolve', [TicketController::class, 'resolve']);
        Route::get('users', [AdminController::class, 'users']);

        // Réservé ADMIN : paiements, commissions, paramètres, utilisateurs, coupons.
        Route::middleware('role:admin')->group(function () {
            Route::post('orders/{order}/counter-verify', [AdminController::class, 'counterVerify']);
            Route::post('orders/{order}/mark-paid', [AdminController::class, 'markPaid']);
            Route::post('orders/{order}/cancel', [AdminController::class, 'cancel']);
            Route::post('orders/{order}/refund', [AdminController::class, 'refund']);
            Route::post('refunds/{refund}/decision', [AdminController::class, 'decideRefund']);
            Route::post('sellers/{seller}/suspend', [AdminController::class, 'suspendSeller']);
            Route::post('sellers/{seller}/plan', [AdminController::class, 'setPlan']);
            Route::post('payouts/{payout}', [AdminController::class, 'payoutAction']);
            Route::get('coupons', [AdminController::class, 'coupons']);
            Route::post('coupons', [AdminController::class, 'saveCoupon']);
            Route::put('coupons/{coupon}', [AdminController::class, 'saveCoupon']);
            Route::patch('users/{user}', [AdminController::class, 'updateUser']);
            Route::get('commissions', [AdminController::class, 'commissions']);
            Route::get('settings', [AdminController::class, 'settings']);
            Route::put('settings', [AdminController::class, 'saveSettings']);
            Route::get('audit', [AdminController::class, 'audit']);
        });
    });
});
