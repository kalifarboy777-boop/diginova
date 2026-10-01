<?php

namespace App\Http\Controllers\Api;

use App\Enums\License;
use App\Enums\OrderStatus;
use App\Enums\RefundStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\LibraryItemResource;
use App\Http\Resources\OrderResource;
use App\Http\Resources\ProductCardResource;
use App\Models\Favorite;
use App\Models\Order;
use App\Models\Product;
use App\Models\Setting;
use App\Services\CartService;
use App\Services\InvoicePdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Écrans 30 à 33 — tableau de bord, bibliothèque, commandes, favoris. */
class AccountController extends Controller
{
    /** Compteurs de la barre latérale (bibliothèque, favoris, coupons). */
    public function nav(Request $request): JsonResponse
    {
        $u = $request->user();

        return response()->json([
            'library' => $u->libraryItems()->whereNull('revoked_at')->count(),
            'favorites' => $u->favorites()->count(),
            'coupons' => $this->couponQuery($u)->count(),
            'tickets_open' => $u->tickets()->where('status', '!=', 'RESOLVED')->count(),
            'notifications' => $u->unreadNotifications()->count(),
        ]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        $u = $request->user();
        $library = $u->libraryItems()->whereNull('revoked_at');
        $paid = $u->orders()->where('status', OrderStatus::PAID);
        $monthStart = now()->startOfMonth();
        $weekStart = now()->subDays(7);
        $savings = (int) (clone $paid)->sum('discount')
            + (int) DB::table('order_items')->join('orders', 'orders.id', '=', 'order_items.order_id')->join('products', 'products.id', '=', 'order_items.product_id')
                ->where('orders.user_id', $u->id)->where('orders.status', 'PAID')->whereNotNull('products.compare_at_price')->where('order_items.license', 'PERSONAL')
                ->selectRaw('COALESCE(SUM(products.compare_at_price - order_items.list_price), 0) as s')->value('s');
        $downloads = DB::table('download_logs')->join('library_items', 'library_items.id', '=', 'download_logs.library_item_id')->where('library_items.user_id', $u->id);
        $coupons = $this->couponQuery($u)->get();
        $update = $u->libraryItems()->whereNull('revoked_at')->with('product')->get()->first(fn ($li) => $li->hasUpdate());

        $owned = $u->libraryItems()->pluck('product_id');
        $favoriteCats = Product::whereIn('id', $owned)->pluck('category_id')->countBy()->sortDesc()->keys();

        return response()->json([
            'stats' => [
                'products' => (clone $library)->count(),
                'products_month' => (clone $library)->where('granted_at', '>=', $monthStart)->count(),
                'downloads' => (clone $downloads)->count(),
                'downloads_week' => (clone $downloads)->where('download_logs.created_at', '>=', $weekStart)->count(),
                'savings' => $savings,
                'coupons' => $coupons->count(),
                'coupons_expiring' => $coupons->filter(fn ($c) => $c->expires_at && $c->expires_at->lt(now()->addDays(7)))->count(),
                'coupons_expiring_days' => ($soon = $coupons->filter(fn ($c) => $c->expires_at)->sortBy('expires_at')->first()) ? (int) ceil(now()->diffInDays($soon->expires_at)) : null,
            ],
            'recent' => LibraryItemResource::collection((clone $library)->with('product.category', 'orderItem.order')->latest('granted_at')->limit(3)->get()),
            'orders' => OrderResource::collection($u->orders()->with('items.bundle')->latest()->limit(3)->get()),
            'update' => $update ? [
                'library_item_id' => $update->id, 'title' => $update->product->title, 'version' => $update->product->version,
                'message' => $update->product->title.' passe en v'.$update->product->version.' : nouveaux contenus inclus gratuitement.',
            ] : null,
            'coupons' => $coupons->map(fn ($c) => ['code' => $c->code, 'label' => $c->label(), 'expires_at' => $c->expires_at?->toIso8601String()])->values(),
            'recommended' => ProductCardResource::collection(Product::published()->whereNotIn('id', $owned)
                ->orderByRaw('CASE WHEN category_id IN ('.($favoriteCats->take(3)->implode(',') ?: '0').') THEN 0 ELSE 1 END')
                ->orderByDesc('sales_count')->with('category')->limit(3)->get()),
        ]);
    }

    public function library(Request $request): JsonResponse
    {
        $f = $request->validate(['category' => 'nullable|string|max:80', 'q' => 'nullable|string|max:80', 'sort' => 'nullable|in:recent,ancien,titre']);
        $u = $request->user();
        $base = $u->libraryItems()->whereNull('revoked_at')->with('product.category', 'orderItem.order');
        $all = (clone $base)->get();

        $items = $all
            ->when($f['category'] ?? null, fn ($c, $cat) => $c->filter(fn ($li) => $li->product->category->slug === $cat))
            ->when($f['q'] ?? null, fn ($c, $q) => $c->filter(fn ($li) => str_contains(mb_strtolower($li->product->title), mb_strtolower($q))))
            ->sortBy(fn ($li) => match ($f['sort'] ?? 'recent') {
                'titre' => $li->product->title, 'ancien' => $li->granted_at->timestamp, default => -$li->granted_at->timestamp
            })
            ->values();
        $reviewed = $u->reviews()->pluck('product_id')->flip();
        $items->each(fn ($li) => $li->reviewed = $reviewed->has($li->product_id));

        return response()->json([
            'data' => LibraryItemResource::collection($items),
            'total' => $all->count(),
            'categories' => $all->groupBy(fn ($li) => $li->product->category->slug)->map(fn ($g) => [
                'slug' => $g->first()->product->category->slug, 'name' => $g->first()->product->category->name, 'count' => $g->count(),
            ])->sortByDesc('count')->values(),
        ]);
    }

    public function libraryItem(Request $request, int $item): JsonResponse
    {
        $li = $request->user()->libraryItems()->with('product.files', 'product.category', 'orderItem.order')->findOrFail($item);
        $li->reviewed = $request->user()->reviews()->where('product_id', $li->product_id)->exists();

        return (new LibraryItemResource($li))->response();
    }

    public function orders(Request $request): JsonResponse
    {
        $f = $request->validate([
            'q' => 'nullable|string|max:80', 'status' => 'nullable|in:PAID,PENDING,FAILED,REFUNDED,EXPIRED',
            'period' => 'nullable|in:30,90,365,all', 'method' => 'nullable|in:WAVE,ORANGE_MONEY,MTN_MOMO,MOOV_MONEY,CARD',
            'per_page' => 'nullable|integer|between:1,50',
        ]);
        $page = $this->ordersQuery($request, $f)->paginate($f['per_page'] ?? 7);

        return response()->json([
            'data' => OrderResource::collection($page->getCollection()),
            'meta' => ['total' => $page->total(), 'page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'from' => $page->firstItem(), 'to' => $page->lastItem()],
        ]);
    }

    public function exportOrders(Request $request): StreamedResponse
    {
        $orders = $this->ordersQuery($request, $request->only(['q', 'status', 'period', 'method']))->get();

        return response()->streamDownload(function () use ($orders) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Commande', 'Date', 'Produits', 'Paiement', 'Montant (FCFA)', 'Statut'], ';');
            foreach ($orders as $o) {
                fputcsv($out, [$o->number, $o->created_at->format('d/m/Y H:i'), $o->items->pluck('title')->implode(' + '),
                    $o->payment_method?->label(), $o->total, $o->status->label()], ';');
            }
            fclose($out);
        }, 'commandes-diginova.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function invoice(Request $request, Order $order, InvoicePdf $pdf): Response
    {
        abort_unless($order->user_id === $request->user()->id || $request->user()->isStaff(), 404);
        abort_unless($order->status === OrderStatus::PAID || $order->status === OrderStatus::REFUNDED, 404);

        return $pdf->download($order);
    }

    public function requestRefund(Request $request, Order $order): JsonResponse
    {
        abort_unless($order->user_id === $request->user()->id, 404);
        $reason = $request->validate(['reason' => 'required|string|min:10|max:1000'])['reason'];
        abort_unless($order->status === OrderStatus::PAID, 409, 'Seules les commandes payées peuvent être remboursées.');
        abort_if($order->paid_at->lt(now()->subDays((int) Setting::get('guarantee_days'))), 409, 'La période de garantie de 7 jours est dépassée.');
        abort_if($order->refundRequests()->where('status', RefundStatus::REQUESTED)->exists(), 409, 'Une demande est déjà en cours.');
        $order->refundRequests()->create(['user_id' => $request->user()->id, 'reason' => $reason]);
        $order->logEvent('refund_requested', 'Demande de remboursement', $reason, 'warning');

        return response()->json(['message' => 'Demande envoyée. Réponse sous 48 h.'], 201);
    }

    public function favorites(Request $request): JsonResponse
    {
        $favs = $request->user()->favorites()->with('product.category', 'product.seller')->latest()->get()
            ->filter(fn ($f) => $f->product?->status->value === 'PUBLISHED')->values();

        return response()->json(['data' => $favs->map(fn (Favorite $f) => (new ProductCardResource($f->product))->toArray($request) + [
            'price_at_save' => $f->price_at_save,
            'price_drop' => $f->product->price < $f->price_at_save,
            'favorite_id' => $f->id,
        ])]);
    }

    public function toggleFavorite(Request $request): JsonResponse
    {
        $product = Product::published()->findOrFail($request->validate(['product_id' => 'required|integer'])['product_id']);
        $fav = $request->user()->favorites()->where('product_id', $product->id)->first();
        $fav ? $fav->delete() : $request->user()->favorites()->create(['product_id' => $product->id, 'price_at_save' => $product->price]);

        return response()->json(['favorite' => ! $fav, 'count' => $request->user()->favorites()->count()]);
    }

    public function favoritesToCart(Request $request, CartService $carts): JsonResponse
    {
        $cart = $carts->resolve($request->user(), null, true);
        foreach ($request->user()->favorites()->with('product')->get() as $f) {
            if ($f->product->status->value === 'PUBLISHED') {
                $carts->addProduct($cart, $f->product, License::PERSONAL);
            }
        }

        return app(CartController::class)->respond($request, $cart->refresh());
    }

    public function coupons(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->couponQuery($request->user())->get()->map(fn ($c) => [
            'code' => $c->code, 'label' => $c->label(), 'scope' => $c->scope->value, 'min_amount' => $c->min_amount,
            'expires_at' => $c->expires_at?->toIso8601String(),
        ])]);
    }

    public function notifications(Request $request): JsonResponse
    {
        $u = $request->user();

        return response()->json(['data' => $u->notifications()->limit(20)->get()->map(fn ($n) => $n->data + [
            'id' => $n->id, 'read' => $n->read_at !== null, 'created_at' => $n->created_at->toIso8601String(),
        ]), 'unread' => $u->unreadNotifications()->count()]);
    }

    public function readNotifications(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['unread' => 0]);
    }

    private function couponQuery($user)
    {
        return $user->coupons()->wherePivotNull('used_at')->where('active', true)
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))->orderBy('expires_at');
    }

    private function ordersQuery(Request $request, array $f)
    {
        return $request->user()->orders()->with('items.bundle', 'invoice')
            ->when($f['q'] ?? null, fn ($q, $s) => $q->where(fn ($w) => $w->where('number', 'like', "%$s%")->orWhereHas('items', fn ($i) => $i->where('title', 'like', "%$s%"))))
            ->when($f['status'] ?? null, fn ($q, $s) => $s === 'PENDING' ? $q->whereIn('status', ['PENDING', 'AWAITING_CONFIRMATION', 'NEEDS_REVIEW']) : $q->where('status', $s))
            ->when(($f['period'] ?? '365') !== 'all', fn ($q) => $q->where('created_at', '>=', now()->subDays((int) ($f['period'] ?? 365))))
            ->when($f['method'] ?? null, fn ($q, $m) => $q->where('payment_method', $m))
            ->latest();
    }
}
