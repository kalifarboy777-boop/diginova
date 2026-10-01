<?php

namespace App\Http\Controllers\Api;

use App\Enums\ApplicationStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\PayoutStatus;
use App\Enums\ProductStatus;
use App\Enums\RefundStatus;
use App\Enums\ReportStatus;
use App\Enums\Role;
use App\Enums\SellerPlan;
use App\Enums\TicketStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Mail\SimpleMail;
use App\Models\AdminAlert;
use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\CreatorApplication;
use App\Models\Order;
use App\Models\Payout;
use App\Models\Product;
use App\Models\RefundRequest;
use App\Models\Report;
use App\Models\Review;
use App\Models\SellerProfile;
use App\Models\Setting;
use App\Models\SupportTicket;
use App\Models\User;
use App\Notifications\AppNotification;
use App\Payments\PaymentService;
use App\Services\Audit;
use App\Services\FulfillmentService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Écrans 50 à 53 + pages admin complémentaires. */
class AdminController extends Controller
{
    public function nav(Request $request): JsonResponse
    {
        return response()->json([
            'user' => ['name' => $request->user()->name, 'initials' => $request->user()->initials(), 'role' => $request->user()->role->value, 'role_label' => $request->user()->role->label()],
            'counts' => [
                'products' => Product::where('status', ProductStatus::PENDING_REVIEW)->count(),
                'payments' => Order::where('status', OrderStatus::NEEDS_REVIEW)->count(),
                'refunds' => RefundRequest::where('status', RefundStatus::REQUESTED)->count(),
                'creators' => CreatorApplication::whereIn('status', [ApplicationStatus::SUBMITTED, ApplicationStatus::NEEDS_DOCUMENT])->whereNotNull('submitted_at')->count(),
                'tickets' => SupportTicket::where('status', '!=', TicketStatus::RESOLVED)->count(),
                'reports' => Report::where('status', ReportStatus::OPEN)->count(),
            ],
        ]);
    }

    // ───────────────────────────── Écran 50 — pilotage

    public function dashboard(Request $request): JsonResponse
    {
        $days = (int) ($request->validate(['range' => 'nullable|in:1,7,30,365'])['range'] ?? 30);
        $now = CarbonImmutable::now();
        $from = $now->subDays($days);
        $prevFrom = $from->subDays($days);
        $orders = fn ($a, $b) => Order::whereBetween('created_at', [$a, $b]);
        $paid = fn ($a, $b) => Order::where('status', OrderStatus::PAID)->whereBetween('paid_at', [$a, $b]);

        $revenue = (int) $paid($from, $now)->sum('total');
        $prevRevenue = (int) $paid($prevFrom, $from)->sum('total');
        $count = $orders($from, $now)->count();
        $prevCount = $orders($prevFrom, $from)->count();
        $rate = fn ($a, $b) => ($t = $orders($a, $b)->whereIn('status', ['PAID', 'FAILED', 'EXPIRED', 'REFUNDED'])->count()) ? round($orders($a, $b)->whereIn('status', ['PAID', 'REFUNDED'])->count() / $t * 100, 1) : 0;
        $speed = fn ($a, $b) => (int) round(DB::table('payments')->join('orders', 'orders.id', '=', 'payments.order_id')
            ->whereNotNull('payments.verified_at')->whereBetween('orders.paid_at', [$a, $b])
            ->selectRaw('AVG(('.(DB::getDriverName() === 'sqlite' ? "strftime('%s', payments.verified_at) - strftime('%s', payments.created_at)" : 'EXTRACT(EPOCH FROM payments.verified_at - payments.created_at)').')) as s')->value('s') ?? 0);
        $newClients = User::where('role', Role::CLIENT)->whereBetween('created_at', [$from, $now])->count();
        $prevClients = User::where('role', Role::CLIENT)->whereBetween('created_at', [$prevFrom, $from])->count();
        $views = max(1, (int) Product::sum('views_count'));

        $studioId = SellerProfile::where('slug', 'diginova-studio')->value('id');
        $items = DB::table('order_items')->join('orders', 'orders.id', '=', 'order_items.order_id')->where('orders.status', 'PAID')
            ->where('orders.paid_at', '>=', $now->subDays(min($days, 30)))->get(['order_items.seller_id', 'order_items.list_price', 'orders.paid_at']);
        $chart = collect(range(min($days, 30) - 1, 0))->map(function ($i) use ($now, $items, $studioId) {
            $d = $now->subDays($i)->format('Y-m-d');
            $day = $items->filter(fn ($r) => str_starts_with((string) $r->paid_at, $d));

            return ['label' => $now->subDays($i)->format('j'), 'diginova' => (int) $day->where('seller_id', $studioId)->sum('list_price'),
                'creators' => (int) $day->where('seller_id', '!=', $studioId)->sum('list_price')];
        })->values();

        $methods = $paid($from, $now)->selectRaw('payment_method, count(*) as c')->groupBy('payment_method')->pluck('c', 'payment_method');
        $totalMethods = max(1, $methods->sum());
        $cats = DB::table('order_items')->join('orders', 'orders.id', '=', 'order_items.order_id')->join('products', 'products.id', '=', 'order_items.product_id')
            ->join('categories', 'categories.id', '=', 'products.category_id')->where('orders.status', 'PAID')->whereBetween('orders.paid_at', [$from, $now])
            ->selectRaw('categories.name as name, sum(order_items.list_price) as total')->groupBy('categories.name')->orderByDesc('total')->limit(3)->get();
        $catTotal = max(1, (int) DB::table('order_items')->join('orders', 'orders.id', '=', 'order_items.order_id')->where('orders.status', 'PAID')->whereBetween('orders.paid_at', [$from, $now])->sum('list_price'));

        $pct = fn ($a, $b) => $b ? (int) round(($a - $b) / $b * 100) : null;

        return response()->json([
            'today' => $now->toIso8601String(),
            'kpis' => [
                'revenue' => $revenue, 'revenue_change' => $pct($revenue, $prevRevenue),
                'orders' => $count, 'orders_change' => $pct($count, $prevCount),
                'success_rate' => $rate($from, $now), 'success_rate_change' => round($rate($from, $now) - $rate($prevFrom, $from), 1),
                'delivery_seconds' => $speed($from, $now), 'delivery_change' => $speed($from, $now) - $speed($prevFrom, $from),
                'new_clients' => $newClients, 'new_clients_change' => $pct($newClients, $prevClients),
                'conversion' => round(Order::where('status', 'PAID')->count() / $views * 100, 1), 'conversion_change' => 0.3,
            ],
            'chart' => $chart,
            'latest' => Order::with('user', 'latestPayment')->latest()->limit(5)->get()->map(fn ($o) => $this->orderRow($o)),
            'alerts' => $this->alerts(),
            'methods' => collect(PaymentMethod::cases())->map(fn ($m) => ['method' => $m->value, 'label' => $m->label(), 'percent' => (int) round(($methods[$m->value] ?? 0) / $totalMethods * 100)])
                ->sortByDesc('percent')->values(),
            'categories' => $cats->map(fn ($c) => ['name' => $c->name, 'total' => (int) $c->total, 'percent' => (int) round($c->total / $catTotal * 100)]),
        ]);
    }

    /** @return array<int, array<string, mixed>> */
    private function alerts(): array
    {
        $alerts = AdminAlert::whereNull('resolved_at')->latest()->get()->map(fn ($a) => ['id' => $a->id, 'title' => $a->title, 'detail' => $a->detail, 'level' => $a->level, 'href' => null])->all();
        $pending = Product::where('status', ProductStatus::PENDING_REVIEW)->orderBy('submitted_at')->get(['submitted_at']);
        if ($pending->isNotEmpty()) {
            $alerts[] = ['id' => null, 'title' => $pending->count().' produits à modérer', 'detail' => 'Le plus ancien attend depuis '.(int) $pending->first()->submitted_at->diffInHours(now()).' h', 'level' => 'warning', 'href' => '/admin/produits'];
        }
        $apps = CreatorApplication::where('status', ApplicationStatus::SUBMITTED)->whereNotNull('submitted_at')->count();
        if ($apps) {
            $alerts[] = ['id' => null, 'title' => "$apps candidatures créateurs", 'detail' => 'Vérification d’identité requise', 'level' => 'info', 'href' => '/admin/createurs'];
        }

        return $alerts;
    }

    public function resolveAlert(AdminAlert $alert): JsonResponse
    {
        $alert->update(['resolved_at' => now()]);
        Audit::log('alert.resolved', $alert);

        return response()->json(['alerts' => $this->alerts()]);
    }

    // ───────────────────────────── Écran 51 — modération

    public function moderation(Request $request): JsonResponse
    {
        $status = $request->validate(['status' => 'nullable|in:PENDING_REVIEW,CHANGES_REQUESTED,REJECTED'])['status'] ?? 'PENDING_REVIEW';
        $hours = (int) Setting::get('moderation_hours');
        $counts = Product::selectRaw('status, count(*) as c')->whereIn('status', ['PENDING_REVIEW', 'CHANGES_REQUESTED', 'REJECTED'])->groupBy('status')->pluck('c', 'status');

        return response()->json([
            'counts' => $counts, 'target_hours' => $hours,
            'data' => Product::where('status', $status)->with('seller', 'files')->orderBy('submitted_at')->get()->map(fn ($p) => [
                'id' => $p->id, 'title' => $p->title, 'seller' => $p->seller->display_name, 'cover_type' => $p->cover_type,
                'submitted_at' => $p->submitted_at?->toIso8601String(),
                'hours_waiting' => $p->submitted_at ? (int) $p->submitted_at->diffInHours(now()) : null,
                'hours_left' => $p->submitted_at ? max(0, $hours - (int) $p->submitted_at->diffInHours(now())) : null,
                'scan_ok' => $p->files->isNotEmpty() && $p->files->every(fn ($f) => $f->scan_status->value === 'CLEAN'),
            ]),
        ]);
    }

    public function moderationShow(Product $product): JsonResponse
    {
        $product->load('seller.user', 'files', 'images', 'category', 'subcategory');
        $s = $product->seller;

        return response()->json([
            'id' => $product->id, 'title' => $product->title, 'slug' => $product->slug, 'description' => $product->description, 'cover_type' => $product->cover_type,
            'status' => $product->status->value, 'category' => $product->category->name, 'subcategory' => $product->subcategory?->name,
            'price' => $product->price, 'compare_at_price' => $product->compare_at_price, 'commercial' => $product->commercial_price !== null,
            'rights' => (bool) ($product->draft_data['rights_confirmed'] ?? true), 'rejection_reason' => $product->rejection_reason,
            'images' => $product->images->map(fn ($i) => \Storage::disk('public')->url($i->key)),
            'files' => $product->files->map(fn ($f) => ['name' => $f->file_name, 'size' => $f->size, 'scan_status' => $f->scan_status->value]),
            'total_size' => $product->files->sum('size'),
            'seller' => ['name' => $s->display_name, 'initials' => collect(explode(' ', $s->display_name))->take(2)->map(fn ($w) => mb_substr($w, 0, 1))->implode(''),
                'verified' => $s->verified, 'products' => $s->products()->count(), 'rating' => round((float) $s->products()->where('rating_count', '>', 0)->avg('rating_avg'), 1)],
        ]);
    }

    public function moderationDecide(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'decision' => 'required|in:approve,reject,changes',
            'message' => 'required_unless:decision,approve|nullable|string|max:2000',
            'checklist' => 'nullable|array',
        ], ['message.required_unless' => 'Un message au créateur est obligatoire en cas de refus ou de demande de modifications.']);
        abort_unless(in_array($product->status, [ProductStatus::PENDING_REVIEW, ProductStatus::CHANGES_REQUESTED], true), 409, 'Ce produit n’est pas en attente de modération.');

        [$status, $label] = match ($data['decision']) {
            'approve' => [ProductStatus::PUBLISHED, 'Produit publié'],
            'reject' => [ProductStatus::REJECTED, 'Produit refusé'],
            'changes' => [ProductStatus::CHANGES_REQUESTED, 'Modifications demandées'],
        };
        $product->update(['status' => $status, 'rejection_reason' => $data['decision'] === 'approve' ? null : $data['message'],
            'published_at' => $data['decision'] === 'approve' ? ($product->published_at ?? now()) : $product->published_at]);
        Audit::log('product.'.$data['decision'], $product, ['message' => $data['message'] ?? null, 'checklist' => $data['checklist'] ?? []]);

        $user = $product->seller->user;
        $user?->notify(new AppNotification('moderation', "$label : {$product->title}", $data['message'] ?? 'Votre produit est en ligne.', '/studio/produits'));
        if ($user) {
            Mail::to($user->email)->queue(new SimpleMail("$label · {$product->title}", $label,
                $data['decision'] === 'approve' ? "Bonne nouvelle : « {$product->title} » est maintenant en vente sur DigiNova." : "Motif : {$data['message']}",
                'Ouvrir mon studio', rtrim((string) config('app.frontend_url'), '/').'/studio/produits'));
        }

        return response()->json(['status' => $status->value]);
    }

    // ───────────────────────────── Écran 52 — commandes & paiements

    public function orders(Request $request): JsonResponse
    {
        $f = $request->validate(['status' => 'nullable|in:PAID,PENDING,FAILED,NEEDS_REVIEW,REFUNDED,EXPIRED', 'q' => 'nullable|string|max:80', 'method' => 'nullable|string|max:20']);
        $counts = Order::selectRaw('status, count(*) as c')->groupBy('status')->pluck('c', 'status');
        $page = Order::with('user', 'latestPayment', 'items')
            ->when($f['status'] ?? null, fn ($q, $s) => $s === 'PENDING' ? $q->whereIn('status', ['PENDING', 'AWAITING_CONFIRMATION']) : ($s === 'FAILED' ? $q->whereIn('status', ['FAILED', 'EXPIRED']) : $q->where('status', $s)))
            ->when($f['method'] ?? null, fn ($q, $m) => $q->where('payment_method', $m))
            ->when($f['q'] ?? null, fn ($q, $s) => $q->where(fn ($w) => $w->where('number', 'like', "%$s%")->orWhere('email', 'like', "%$s%")
                ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%$s%"))->orWhereHas('items', fn ($i) => $i->where('title', 'like', "%$s%"))))
            ->orderByRaw("CASE WHEN status = 'NEEDS_REVIEW' THEN 0 ELSE 1 END")->latest()->paginate(15);

        return response()->json([
            'counts' => [
                'all' => (int) $counts->sum(), 'PAID' => (int) ($counts['PAID'] ?? 0),
                'PENDING' => (int) (($counts['PENDING'] ?? 0) + ($counts['AWAITING_CONFIRMATION'] ?? 0)),
                'FAILED' => (int) (($counts['FAILED'] ?? 0) + ($counts['EXPIRED'] ?? 0)),
                'NEEDS_REVIEW' => (int) ($counts['NEEDS_REVIEW'] ?? 0), 'REFUNDED' => (int) ($counts['REFUNDED'] ?? 0),
            ],
            'data' => $page->getCollection()->map(fn ($o) => $this->orderRow($o)),
            'meta' => ['total' => $page->total(), 'page' => $page->currentPage(), 'last_page' => $page->lastPage()],
        ]);
    }

    /** @return array<string, mixed> */
    private function orderRow(Order $o): array
    {
        $p = $o->latestPayment;
        $ref = $p?->provider_ref;

        return [
            'id' => $o->id, 'number' => $o->number, 'customer' => $o->user?->name ?? $o->email, 'email' => $o->email, 'total' => $o->total,
            'method' => $o->payment_method?->value, 'method_label' => $o->payment_method?->label(),
            'provider_ref' => $ref ? (Str::length($ref) > 10 ? Str::substr($ref, 0, 5).'…'.Str::substr($ref, -3) : $ref) : null,
            'webhook' => $p?->webhook_status ?? '—', 'attempts' => $p?->attempts ?? 0,
            'status' => $o->status->value, 'status_label' => $o->status->label(), 'created_at' => $o->created_at->toIso8601String(),
        ];
    }

    public function order(Order $order): JsonResponse
    {
        $order->load('user', 'items.product', 'items.libraryItem', 'items.bundle', 'payments', 'events', 'coupon', 'refundRequests');
        $p = $order->payments->sortByDesc('id')->first();

        return response()->json([
            'order' => (new OrderResource($order))->toArray(request()),
            'row' => $this->orderRow($order->setRelation('latestPayment', $p)),
            'customer' => ['name' => $order->user?->name, 'email' => $order->email, 'phone' => $order->phone],
            'payment' => $p ? ['provider' => $p->provider, 'reference' => $p->provider_ref, 'status' => $p->status->value, 'webhook' => $p->webhook_status,
                'attempts' => $p->attempts, 'verified_at' => $p->verified_at?->toIso8601String(), 'method_label' => $p->method->label()] : null,
            'timeline' => $order->events->sortBy('created_at')->values()->map(fn ($e) => ['label' => $e->label, 'detail' => $e->detail, 'level' => $e->level, 'at' => $e->created_at->toIso8601String()]),
            'download_link' => $order->items->contains(fn ($i) => $i->libraryItem !== null) ? 'Généré' : 'Non généré',
            'refund_requests' => $order->refundRequests->map(fn ($r) => ['id' => $r->id, 'reason' => $r->reason, 'status' => $r->status->value]),
            'audit' => AuditLog::where('entity', 'Order')->where('entity_id', $order->id)->with('actor')->latest('created_at')->get()
                ->map(fn ($a) => ['action' => $a->action, 'actor' => $a->actor?->name, 'at' => $a->created_at->toIso8601String(), 'metadata' => $a->metadata]),
        ]);
    }

    public function counterVerify(Order $order, PaymentService $payments): JsonResponse
    {
        $p = $order->latestPayment ?? abort(404, 'Aucun paiement.');
        $result = $payments->counterVerify($p);
        Audit::log('order.counter_verify', $order, ['result' => $result]);

        return response()->json(['result' => $result] + $this->order($order->refresh())->getData(true));
    }

    public function markPaid(Request $request, Order $order, FulfillmentService $fulfillment): JsonResponse
    {
        $reason = $request->validate(['reason' => 'required|string|min:5|max:500'], ['reason.required' => 'Indiquez la justification (référence vérifiée chez le prestataire…).'])['reason'];
        abort_if($order->status === OrderStatus::PAID, 409, 'Commande déjà payée.');
        $order->latestPayment?->update(['status' => PaymentStatus::SUCCEEDED, 'verified_at' => now(), 'webhook_status' => 'Validé manuellement']);
        $order->logEvent('manual', 'Marquée payée manuellement', "Par {$request->user()->name} · $reason", 'warning');
        $fulfillment->markPaid($order);
        Audit::log('order.mark_paid', $order, ['reason' => $reason]);

        return $this->order($order->refresh());
    }

    public function cancel(Request $request, Order $order): JsonResponse
    {
        abort_if(in_array($order->status, [OrderStatus::PAID, OrderStatus::REFUNDED], true), 409, 'Utilisez le remboursement pour une commande payée.');
        $order->update(['status' => OrderStatus::FAILED]);
        $order->logEvent('manual', 'Commande annulée', 'Par '.$request->user()->name, 'danger');
        Audit::log('order.cancel', $order);

        return $this->order($order->refresh());
    }

    public function refund(Request $request, Order $order, FulfillmentService $fulfillment): JsonResponse
    {
        abort_unless($order->status === OrderStatus::PAID, 409, 'Seule une commande payée peut être remboursée.');
        $fulfillment->refund($order->load('items.libraryItem', 'items.seller'), $request->user());
        Audit::log('order.refund', $order);

        return $this->order($order->refresh());
    }

    public function refunds(): JsonResponse
    {
        return response()->json(['data' => RefundRequest::with('order.user')->latest()->limit(100)->get()->map(fn ($r) => [
            'id' => $r->id, 'order_id' => $r->order_id, 'order' => $r->order->number, 'customer' => $r->order->user?->name, 'amount' => $r->order->total,
            'reason' => $r->reason, 'status' => $r->status->value, 'status_label' => $r->status->label(), 'created_at' => $r->created_at->toIso8601String(),
            'paid_at' => $r->order->paid_at?->toIso8601String(),
        ])]);
    }

    public function decideRefund(Request $request, RefundRequest $refund, FulfillmentService $fulfillment): JsonResponse
    {
        $decision = $request->validate(['decision' => 'required|in:approve,reject'])['decision'];
        abort_unless($refund->status === RefundStatus::REQUESTED, 409);
        if ($decision === 'approve') {
            $fulfillment->refund($refund->order->load('items.libraryItem', 'items.seller'), $request->user());
        } else {
            $refund->update(['status' => RefundStatus::REJECTED, 'decided_by' => $request->user()->id, 'decided_at' => now()]);
        }
        Audit::log('refund.'.$decision, $refund);
        $refund->order->user?->notify(new AppNotification('refund', $decision === 'approve' ? 'Remboursement accepté' : 'Remboursement refusé', 'Commande '.$refund->order->number, '/compte/commandes'));

        return $this->refunds();
    }

    // ───────────────────────────── Écran 53 — créateurs

    public function creators(Request $request): JsonResponse
    {
        $tab = $request->validate(['tab' => 'nullable|in:applications,active,suspended,payouts'])['tab'] ?? 'applications';
        $active = SellerProfile::whereNull('suspended_at')->whereHas('user', fn ($q) => $q->where('role', Role::CREATOR));
        $oldest = CreatorApplication::where('status', ApplicationStatus::SUBMITTED)->whereNotNull('submitted_at')->min('submitted_at');
        $decided = CreatorApplication::where('reviewed_at', '>=', now()->subDays(90));

        $stats = [
            'active' => (clone $active)->count(),
            'active_month' => (clone $active)->where('created_at', '>=', now()->startOfMonth())->count(),
            'pending' => CreatorApplication::whereIn('status', [ApplicationStatus::SUBMITTED, ApplicationStatus::NEEDS_DOCUMENT])->whereNotNull('submitted_at')->count(),
            'oldest_hours' => $oldest ? (int) CarbonImmutable::parse($oldest)->diffInHours(now()) : null,
            'acceptance' => ($t = (clone $decided)->count()) ? (int) round((clone $decided)->where('status', ApplicationStatus::APPROVED)->count() / $t * 100) : null,
            'paid_out' => (int) DB::table('order_items')->join('orders', 'orders.id', '=', 'order_items.order_id')->where('orders.status', 'PAID')
                ->where('orders.paid_at', '>=', now()->subDays(30))->sum('order_items.seller_amount'),
            'suspended' => SellerProfile::whereNotNull('suspended_at')->count(),
            'payouts' => Payout::where('status', PayoutStatus::REQUESTED)->count(),
        ];

        $data = match ($tab) {
            'applications' => CreatorApplication::with('user')->whereIn('status', [ApplicationStatus::SUBMITTED, ApplicationStatus::NEEDS_DOCUMENT])
                ->whereNotNull('submitted_at')->orderBy('submitted_at')->get()->map(fn ($a) => $this->applicationRow($a)),
            'active', 'suspended' => SellerProfile::with('user')->when($tab === 'active', fn ($q) => $q->whereNull('suspended_at'), fn ($q) => $q->whereNotNull('suspended_at'))
                ->withCount(['products' => fn ($q) => $q->published()])->orderByDesc('created_at')->limit(200)->get()->map(fn ($s) => [
                    'id' => $s->id, 'name' => $s->display_name, 'slug' => $s->slug, 'email' => $s->user?->email, 'plan' => $s->plan->value,
                    'commission_rate' => $s->commission_rate, 'products' => $s->products_count, 'verified' => $s->verified, 'country' => $s->country,
                    'since' => $s->created_at->toIso8601String(), 'suspended' => $s->suspended_at !== null,
                ]),
            'payouts' => Payout::with('seller')->where('status', PayoutStatus::REQUESTED)->orWhere('status', PayoutStatus::PROCESSING)->latest()->get()->map(fn ($p) => [
                'id' => $p->id, 'reference' => $p->reference, 'seller' => $p->seller->display_name, 'amount' => $p->amount, 'account' => $p->account_label,
                'status' => $p->status->value, 'status_label' => $p->status->label(), 'created_at' => $p->created_at->toIso8601String(),
            ]),
        };

        return response()->json(['stats' => $stats, 'tab' => $tab, 'data' => $data]);
    }

    /** @return array<string, mixed> */
    private function applicationRow(CreatorApplication $a): array
    {
        $countries = ['CI' => 'CI', 'SN' => 'SN', 'TG' => 'TG', 'BJ' => 'BJ', 'CM' => 'CM', 'BF' => 'BF', 'ML' => 'ML'];

        return [
            'id' => $a->id, 'studio_name' => $a->studio_name, 'initials' => collect(explode(' ', (string) $a->studio_name))->take(2)->map(fn ($w) => mb_substr($w, 0, 1))->implode(''),
            'location' => trim(($a->city ? $a->city.', ' : '').($countries[$a->country] ?? $a->country)), 'bio' => $a->bio, 'categories' => $a->categories ?? [],
            'hours' => (int) $a->submitted_at->diffInHours(now()), 'id_status' => $a->id_status,
            'id_label' => match ($a->id_status) {
                'VERIFIED' => 'Pièce vérifiée', 'BLURRY' => 'Pièce floue · à redemander', 'PENDING' => 'À vérifier', default => 'Non fournie'
            },
            'payout_label' => match ($a->payout_method) {
                'WAVE' => 'Wave', 'ORANGE_MONEY' => 'Orange Money', 'MTN_MOMO' => 'MTN MoMo', 'MOOV_MONEY' => 'Moov Money', 'BANK' => 'Banque', default => '—'
            }
                .' · '.($a->payout_verified ? 'vérifié' : 'en attente'),
            'payout_verified' => $a->payout_verified, 'samples' => collect($a->sample_files ?? [])->pluck('name'), 'portfolio_url' => $a->portfolio_url,
            'status' => $a->status->value, 'can_approve' => $a->id_status === 'VERIFIED',
        ];
    }

    public function verifyIdentity(Request $request, CreatorApplication $application): JsonResponse
    {
        $status = $request->validate(['id_status' => 'required|in:VERIFIED,BLURRY'])['id_status'];
        $application->update(['id_status' => $status]);
        Audit::log('application.identity', $application, ['id_status' => $status]);

        return response()->json($this->applicationRow($application));
    }

    public function decideApplication(Request $request, CreatorApplication $application): JsonResponse
    {
        $data = $request->validate(['decision' => 'required|in:approve,reject,document', 'message' => 'required_unless:decision,approve|nullable|string|max:1000']);
        abort_if($data['decision'] === 'approve' && $application->id_status !== 'VERIFIED', 422, 'Impossible d’approuver tant que l’identité n’est pas vérifiée.');

        DB::transaction(function () use ($application, $data, $request) {
            $status = match ($data['decision']) {
                'approve' => ApplicationStatus::APPROVED, 'reject' => ApplicationStatus::REJECTED, 'document' => ApplicationStatus::NEEDS_DOCUMENT
            };
            $application->update(['status' => $status, 'review_note' => $data['message'] ?? null, 'reviewer_id' => $request->user()->id, 'reviewed_at' => now()]);
            if ($data['decision'] === 'approve') {
                $user = $application->user;
                $user->update(['role' => Role::CREATOR]);
                $slug = Str::slug($application->studio_name);
                $seller = SellerProfile::firstOrCreate(['user_id' => $user->id], [
                    'display_name' => $application->studio_name, 'slug' => SellerProfile::where('slug', $slug)->exists() ? $slug.'-'.$user->id : $slug,
                    'bio' => $application->bio, 'country' => $application->country, 'verified' => true,
                    'plan' => SellerPlan::STANDARD, 'commission_rate' => (int) Setting::get('commission_standard'), 'payout_method' => $application->payout_method,
                ]);
                if ($application->payout_account) {
                    $seller->payoutAccounts()->create(['method' => $application->payout_method, 'label' => $this->methodLabel($application->payout_method),
                        'account' => $application->payout_account, 'masked' => '•• '.substr(preg_replace('/\D/', '', $application->payout_account), -4), 'is_default' => true]);
                }
            }
            Audit::log('application.'.$data['decision'], $application, ['message' => $data['message'] ?? null]);
        });

        $title = match ($data['decision']) {
            'approve' => 'Votre studio DigiNova est ouvert !', 'reject' => 'Votre candidature n’a pas été retenue', 'document' => 'Un document est nécessaire'
        };
        Mail::to($application->user->email)->queue(new SimpleMail($title, $title, $data['message'] ?? 'Bienvenue parmi les créateurs DigiNova. Ajoutez votre premier produit dès maintenant.',
            $data['decision'] === 'reject' ? null : 'Ouvrir mon studio', rtrim((string) config('app.frontend_url'), '/').($data['decision'] === 'approve' ? '/studio' : '/studio/candidature')));

        return response()->json(['ok' => true]);
    }

    private function methodLabel(?string $m): string
    {
        return match ($m) {
            'WAVE' => 'Wave', 'ORANGE_MONEY' => 'Orange Money', 'MTN_MOMO' => 'MTN MoMo', 'MOOV_MONEY' => 'Moov Money', default => 'Compte bancaire'
        };
    }

    public function suspendSeller(Request $request, SellerProfile $seller): JsonResponse
    {
        $seller->update(['suspended_at' => $seller->suspended_at ? null : now()]);
        Audit::log($seller->suspended_at ? 'seller.suspend' : 'seller.reactivate', $seller);

        return response()->json(['suspended' => $seller->suspended_at !== null]);
    }

    public function payoutAction(Request $request, Payout $payout): JsonResponse
    {
        $action = $request->validate(['action' => 'required|in:process,paid,failed'])['action'];
        DB::transaction(function () use ($payout, $action) {
            $payout->update(['status' => match ($action) {
                'process' => PayoutStatus::PROCESSING, 'paid' => PayoutStatus::PAID, 'failed' => PayoutStatus::FAILED
            },
                'processed_at' => $action === 'paid' ? now() : $payout->processed_at]);
            if ($action === 'failed') {
                // Échec du virement : le montant est recrédité au solde du créateur.
                $payout->seller->ledgerEntries()->create(['payout_id' => $payout->id, 'amount' => $payout->amount, 'type' => 'ADJUSTMENT',
                    'description' => "Retrait {$payout->reference} échoué · recrédité", 'available_at' => now()]);
            }
        });
        Audit::log('payout.'.$action, $payout);
        $payout->seller->user?->notify(new AppNotification('payout', "Retrait {$payout->reference} : ".$payout->status->label(), null, '/studio/revenus'));

        return response()->json(['status' => $payout->status->value]);
    }

    // ───────────────────────────── Catalogue, coupons, utilisateurs, avis, tickets, réglages

    public function products(Request $request): JsonResponse
    {
        $f = $request->validate(['q' => 'nullable|string|max:80', 'status' => 'nullable|string|max:30']);

        return response()->json(['data' => Product::with('seller', 'category')
            ->when($f['q'] ?? null, fn ($q, $s) => $q->where('title', 'like', "%$s%"))
            ->when($f['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->orderByDesc('sales_count')->limit(200)->get()->map(fn ($p) => [
                'id' => $p->id, 'title' => $p->title, 'slug' => $p->slug, 'seller' => $p->seller->display_name, 'category' => $p->category->name,
                'price' => $p->price, 'status' => $p->status->value, 'status_label' => $p->status->label(), 'sales' => $p->sales_count, 'rating' => $p->rating_avg,
                'cover_type' => $p->cover_type,
            ])]);
    }

    public function unpublish(Request $request, Product $product): JsonResponse
    {
        $product->update(['status' => ProductStatus::ARCHIVED]);
        Audit::log('product.unpublish', $product, ['reason' => $request->input('reason')]);

        return response()->json(['ok' => true]);
    }

    public function categories(): JsonResponse
    {
        return response()->json(['data' => Category::whereNull('parent_id')->with('children')->withCount('products')->orderBy('position')->get()->map(fn ($c) => [
            'id' => $c->id, 'name' => $c->name, 'label' => $c->label, 'slug' => $c->slug, 'description' => $c->description, 'cover_type' => $c->cover_type,
            'products' => $c->products_count, 'position' => $c->position,
            'children' => $c->children->map(fn ($s) => ['id' => $s->id, 'name' => $s->name, 'slug' => $s->slug]),
        ])]);
    }

    public function saveCategory(Request $request, ?Category $category = null): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:60', 'label' => 'nullable|string|max:40', 'description' => 'nullable|string|max:255',
            'parent_id' => 'nullable|integer|exists:categories,id', 'cover_type' => 'nullable|in:chart,grid,chat,sheet,doc,notion,book,brand',
        ]);
        $category ??= new Category(['slug' => Str::slug($data['name']), 'position' => Category::max('position') + 1]);
        $category->fill($data + ['label' => mb_strtoupper($data['label'] ?? $data['name'])])->save();
        Audit::log('category.save', $category);

        return $this->categories();
    }

    public function deleteCategory(Category $category): JsonResponse
    {
        abort_if($category->products()->exists() || $category->subProducts()->exists(), 409, 'Catégorie utilisée par des produits.');
        Audit::log('category.delete', $category, ['name' => $category->name]);
        $category->delete();

        return $this->categories();
    }

    public function coupons(): JsonResponse
    {
        return response()->json(['data' => Coupon::with('seller', 'product')->latest()->get()->map(fn ($c) => [
            'id' => $c->id, 'code' => $c->code, 'label' => $c->label(), 'type' => $c->type->value, 'value' => $c->value, 'scope' => $c->scope->value,
            'min_amount' => $c->min_amount, 'used' => $c->used_count, 'limit' => $c->usage_limit, 'active' => $c->active,
            'starts_at' => $c->starts_at?->toIso8601String(), 'expires_at' => $c->expires_at?->toIso8601String(), 'seller' => $c->seller?->display_name,
        ])]);
    }

    public function saveCoupon(Request $request, ?Coupon $coupon = null): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'alpha_num', 'max:30', Rule::unique('coupons', 'code')->ignore($coupon?->id)],
            'description' => 'nullable|string|max:120', 'type' => 'required|in:PERCENT,FIXED', 'value' => 'required|integer|min:1',
            'scope' => 'required|in:ALL,PACKS,PRODUCT', 'product_id' => 'nullable|required_if:scope,PRODUCT|integer|exists:products,id',
            'min_amount' => 'nullable|integer|min:0', 'usage_limit' => 'nullable|integer|min:1', 'starts_at' => 'nullable|date', 'expires_at' => 'nullable|date', 'active' => 'boolean',
        ]);
        if ($data['type'] === 'PERCENT' && $data['value'] > 100) {
            throw ValidationException::withMessages(['value' => 'Maximum 100 %.']);
        }
        $coupon ??= new Coupon;
        $coupon->fill(['code' => strtoupper($data['code']), 'min_amount' => $data['min_amount'] ?? 0] + $data)->save();
        Audit::log('coupon.save', $coupon);

        return $this->coupons();
    }

    public function users(Request $request): JsonResponse
    {
        $f = $request->validate(['q' => 'nullable|string|max:80', 'role' => 'nullable|in:CLIENT,CREATOR,MODERATOR,ADMIN']);
        $page = User::withCount(['orders as paid_orders' => fn ($q) => $q->where('status', 'PAID')])
            ->when($f['q'] ?? null, fn ($q, $s) => $q->where(fn ($w) => $w->where('name', 'like', "%$s%")->orWhere('email', 'like', "%$s%")->orWhere('phone', 'like', "%$s%")))
            ->when($f['role'] ?? null, fn ($q, $r) => $q->where('role', $r))->latest()->paginate(20);

        return response()->json([
            'data' => $page->getCollection()->map(fn ($u) => [
                'id' => $u->id, 'name' => $u->name, 'initials' => $u->initials(), 'email' => $u->email, 'phone' => $u->phone, 'role' => $u->role->value,
                'role_label' => $u->role->label(), 'orders' => $u->paid_orders, 'created_at' => $u->created_at->toIso8601String(),
                'last_login_at' => $u->last_login_at?->toIso8601String(), 'suspended' => $u->suspended_at !== null,
            ]),
            'meta' => ['total' => $page->total(), 'page' => $page->currentPage(), 'last_page' => $page->lastPage()],
        ]);
    }

    public function updateUser(Request $request, User $user): JsonResponse
    {
        $data = $request->validate(['role' => 'sometimes|in:CLIENT,CREATOR,MODERATOR,ADMIN', 'suspended' => 'sometimes|boolean']);
        abort_if($user->id === $request->user()->id, 422, 'Vous ne pouvez pas modifier votre propre compte ici.');
        if (isset($data['role'])) {
            abort_if($data['role'] === 'CREATOR' && ! $user->sellerProfile, 422, 'Ce compte n’a pas de studio : passez par une candidature.');
            $user->update(['role' => Role::from($data['role'])]);
        }
        if (array_key_exists('suspended', $data)) {
            $user->update(['suspended_at' => $data['suspended'] ? now() : null]);
            if ($data['suspended']) {
                DB::table('sessions')->where('user_id', $user->id)->delete();
            }
        }
        Audit::log('user.update', $user, $data);

        return response()->json(['ok' => true]);
    }

    public function reviews(): JsonResponse
    {
        return response()->json([
            'reports' => Report::with('product', 'reporter', 'review')->latest()->limit(100)->get()->map(fn ($r) => [
                'id' => $r->id, 'product' => $r->product?->title, 'product_id' => $r->product_id, 'product_slug' => $r->product?->slug, 'reason' => $r->reason, 'details' => $r->details,
                'reporter' => $r->reporter?->name ?? 'Visiteur', 'status' => $r->status->value, 'status_label' => $r->status->label(), 'created_at' => $r->created_at->toIso8601String(),
            ]),
            'reviews' => Review::with('user', 'product')->latest()->limit(100)->get()->map(fn ($r) => [
                'id' => $r->id, 'product' => $r->product->title, 'author' => $r->user->name, 'rating' => $r->rating, 'comment' => $r->comment,
                'status' => $r->status->value, 'reply' => $r->seller_reply, 'created_at' => $r->created_at->toIso8601String(),
            ]),
        ]);
    }

    public function moderateReview(Request $request, Review $review): JsonResponse
    {
        $status = $request->validate(['status' => 'required|in:PUBLISHED,HIDDEN'])['status'];
        $review->update(['status' => $status]);
        Audit::log('review.'.strtolower($status), $review);

        return $this->reviews();
    }

    public function decideReport(Request $request, Report $report): JsonResponse
    {
        $decision = $request->validate(['decision' => 'required|in:dismiss,unpublish'])['decision'];
        $report->update(['status' => $decision === 'dismiss' ? ReportStatus::DISMISSED : ReportStatus::ACTIONED]);
        if ($decision === 'unpublish' && $report->product) {
            $report->product->update(['status' => ProductStatus::ARCHIVED]);
        }
        Audit::log('report.'.$decision, $report);

        return $this->reviews();
    }

    public function tickets(Request $request): JsonResponse
    {
        $status = $request->validate(['status' => 'nullable|in:OPEN,IN_PROGRESS,RESOLVED'])['status'] ?? null;

        return response()->json(['data' => SupportTicket::with('user', 'order')->when($status, fn ($q) => $q->where('status', $status))
            ->orderByRaw("CASE status WHEN 'OPEN' THEN 0 WHEN 'IN_PROGRESS' THEN 1 ELSE 2 END")->orderByDesc('last_message_at')->limit(200)->get()
            ->map(fn ($t) => TicketController::summary($t))]);
    }

    public function commissions(): JsonResponse
    {
        $sellers = SellerProfile::with('user')->whereNull('suspended_at')->get();

        return response()->json([
            'settings' => ['standard' => (int) Setting::get('commission_standard'), 'pro' => (int) Setting::get('commission_pro'), 'pro_price' => (int) Setting::get('pro_plan_price')],
            'collected_30d' => (int) DB::table('order_items')->join('orders', 'orders.id', '=', 'order_items.order_id')->where('orders.status', 'PAID')
                ->where('orders.paid_at', '>=', now()->subDays(30))->sum('order_items.commission_amount'),
            'sellers' => $sellers->map(fn ($s) => ['id' => $s->id, 'name' => $s->display_name, 'plan' => $s->plan->value, 'rate' => $s->commission_rate,
                'sales_30d' => (int) $s->orderItems()->whereHas('order', fn ($q) => $q->where('status', 'PAID')->where('paid_at', '>=', now()->subDays(30)))->sum('list_price')]),
        ]);
    }

    /** Bascule Standard ↔ Pro (sans abonnement payant en V1). */
    public function setPlan(Request $request, SellerProfile $seller): JsonResponse
    {
        $plan = SellerPlan::from($request->validate(['plan' => 'required|in:STANDARD,PRO'])['plan']);
        $seller->update(['plan' => $plan, 'commission_rate' => (int) Setting::get($plan === SellerPlan::PRO ? 'commission_pro' : 'commission_standard')]);
        Audit::log('seller.plan', $seller, ['plan' => $plan->value]);

        return $this->commissions();
    }

    public function settings(): JsonResponse
    {
        return response()->json(collect(Setting::DEFAULTS)->map(fn ($v, $k) => Setting::get($k)));
    }

    public function saveSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'commission_standard' => 'sometimes|integer|between:0,50', 'commission_pro' => 'sometimes|integer|between:0,50',
            'guarantee_days' => 'sometimes|integer|between:0,30', 'payout_minimum' => 'sometimes|integer|between:0,100000',
            'download_link_minutes' => 'sometimes|integer|between:1,120', 'download_limit' => 'sometimes|integer|between:1,100',
            'payment_timeout_minutes' => 'sometimes|integer|between:1,60', 'bundle_discount_percent' => 'sometimes|integer|between:0,50',
            'pro_plan_price' => 'sometimes|integer|min:0', 'moderation_hours' => 'sometimes|integer|between:1,240',
        ]);
        foreach ($data as $k => $v) {
            $old = Setting::get($k);
            Setting::put($k, $v);
            AuditLog::create(['actor_id' => $request->user()->id, 'action' => 'setting.update', 'entity' => 'Setting', 'metadata' => ['key' => $k, 'from' => $old, 'to' => $v], 'ip' => $request->ip()]);
        }

        return $this->settings();
    }

    public function audit(): JsonResponse
    {
        return response()->json(['data' => AuditLog::with('actor')->latest('created_at')->limit(200)->get()->map(fn ($a) => [
            'id' => $a->id, 'actor' => $a->actor?->name, 'action' => $a->action, 'entity' => $a->entity, 'entity_id' => $a->entity_id,
            'metadata' => $a->metadata, 'ip' => $a->ip, 'at' => $a->created_at->toIso8601String(),
        ])]);
    }
}
