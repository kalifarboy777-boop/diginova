<?php

namespace App\Http\Controllers\Api;

use App\Enums\CouponScope;
use App\Enums\CouponType;
use App\Enums\OrderStatus;
use App\Enums\ProductStatus;
use App\Enums\ScanStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\ReviewResource;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Review;
use App\Models\SellerProfile;
use App\Scan\Scanner;
use App\Services\LedgerService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Écrans 41 à 43 + ventes, clients, statistiques, coupons, profil public. */
class StudioController extends Controller
{
    public function __construct(private LedgerService $ledger, private Scanner $scanner) {}

    private function seller(Request $request): SellerProfile
    {
        return $request->user()->sellerProfile ?? abort(403, 'Studio créateur non activé.');
    }

    /** Ventes payées du créateur. */
    private function sales(SellerProfile $seller)
    {
        return OrderItem::where('seller_id', $seller->id)->whereHas('order', fn ($q) => $q->where('status', OrderStatus::PAID));
    }

    public function nav(Request $request): JsonResponse
    {
        $s = $this->seller($request);

        return response()->json([
            'products' => $s->products()->where('status', '!=', ProductStatus::ARCHIVED)->count(),
            'seller' => ['name' => $s->display_name, 'slug' => $s->slug, 'plan' => $s->plan->value, 'verified' => $s->verified],
            'notifications' => $request->user()->unreadNotifications()->count(),
        ]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        $range = $request->validate(['range' => 'nullable|in:7,30,365'])['range'] ?? '30';
        $s = $this->seller($request);
        $now = CarbonImmutable::now();
        $since = $now->subDays(30);
        $prevSince = $now->subDays(60);

        $paidBetween = fn ($from, $to) => (clone $this->sales($s))->whereHas('order', fn ($q) => $q->whereBetween('paid_at', [$from, $to]));
        $current = $paidBetween($since, $now);
        $previous = $paidBetween($prevSince, $since);
        $net = (int) (clone $current)->sum('seller_amount');
        $prevNet = (int) (clone $previous)->sum('seller_amount');
        $count = (clone $current)->count();
        $views = max(1, (int) $s->products()->sum('views_count'));
        $published = $s->products()->published();
        $ratingCount = (int) (clone $published)->sum('rating_count');

        $top = (clone $current)->selectRaw('product_id, count(*) as sales, sum(list_price) as revenue')->groupBy('product_id')
            ->orderByDesc('revenue')->limit(4)->get()->map(function ($row) {
                $p = Product::find($row->product_id);

                return ['id' => $p->id, 'title' => $p->title, 'slug' => $p->slug, 'cover_type' => $p->cover_type, 'sales' => (int) $row->sales,
                    'revenue' => (int) $row->revenue, 'conversion' => round($p->sales_count / max(1, $p->views_count) * 100, 1), 'rating' => $p->rating_avg];
            });

        $balances = $this->ledger->balances($s);
        $recent = (clone $this->sales($s))->with('order.user', 'product')->latest('id')->limit(4)->get()
            ->sortByDesc(fn ($i) => $i->order->paid_at)->values()->map(fn ($i) => [
                'customer' => self::shortName($i->order->user?->name ?? 'Client'), 'initials' => $i->order->user?->initials() ?? 'CL',
                'product' => $i->title, 'amount' => $i->seller_amount, 'paid_at' => $i->order->paid_at->toIso8601String(),
            ]);

        return response()->json([
            'month' => $now->locale('fr')->translatedFormat('F Y'),
            'kpis' => [
                'net' => $net, 'net_change' => $prevNet ? round(($net - $prevNet) / $prevNet * 100) : null,
                'sales' => $count, 'sales_change' => $count - (clone $previous)->count(),
                'conversion' => round((int) (clone $published)->sum('sales_count') / $views * 100, 1),
                'rating' => round((float) (clone $published)->where('rating_count', '>', 0)->avg('rating_avg'), 1), 'rating_count' => $ratingCount,
            ],
            'chart' => $this->series($s, (int) $range),
            'top' => $top,
            'balance' => $balances,
            'todo' => [
                'pending' => $s->products()->where('status', ProductStatus::PENDING_REVIEW)->pluck('title'),
                'unanswered_reviews' => Review::whereIn('product_id', $s->products()->pluck('id'))->whereNull('seller_reply')->count(),
                'rejected' => $s->products()->whereIn('status', [ProductStatus::REJECTED, ProductStatus::CHANGES_REQUESTED])->get(['id', 'title', 'rejection_reason']),
            ],
            'recent' => $recent,
        ]);
    }

    /** @return array{points: array<int, array{label:string, value:int}>, total:int, change:?int} */
    private function series(SellerProfile $s, int $days): array
    {
        $now = CarbonImmutable::now();
        $items = (clone $this->sales($s))->with('order:id,paid_at')->whereHas('order', fn ($q) => $q->where('paid_at', '>=', $now->subDays($days === 365 ? 365 : $days * 2)))->get(['id', 'order_id', 'seller_amount']);
        $points = [];
        if ($days === 365) {
            for ($i = 11; $i >= 0; $i--) {
                $m = $now->subMonths($i);
                $points[] = ['label' => ucfirst($m->locale('fr')->translatedFormat('M')), 'value' => (int) $items->filter(fn ($it) => $it->order->paid_at->isSameMonth($m))->sum('seller_amount')];
            }
        } else {
            for ($i = $days - 1; $i >= 0; $i--) {
                $d = $now->subDays($i);
                $points[] = ['label' => $d->format('j'), 'value' => (int) $items->filter(fn ($it) => $it->order->paid_at->isSameDay($d))->sum('seller_amount')];
            }
        }
        $total = array_sum(array_column($points, 'value'));
        $prev = $days === 365 ? null : (int) $items->filter(fn ($it) => $it->order->paid_at->lt($now->subDays($days)))->sum('seller_amount');

        return ['points' => $points, 'total' => $total, 'change' => $prev ? (int) round(($total - $prev) / $prev * 100) : null];
    }

    public function products(Request $request): JsonResponse
    {
        $f = $request->validate(['status' => 'nullable|in:PUBLISHED,PENDING_REVIEW,DRAFT,REJECTED', 'q' => 'nullable|string|max:80']);
        $s = $this->seller($request);
        $all = $s->products()->where('status', '!=', ProductStatus::ARCHIVED);
        $counts = (clone $all)->selectRaw('status, count(*) as c')->groupBy('status')->pluck('c', 'status');
        $revenue = (clone $this->sales($s))->selectRaw('product_id, count(*) as n, sum(list_price) as r')->groupBy('product_id')->get()->keyBy('product_id');

        $items = (clone $all)->with('category')
            ->when($f['status'] ?? null, fn ($q, $st) => $st === 'REJECTED' ? $q->whereIn('status', ['REJECTED', 'CHANGES_REQUESTED']) : $q->where('status', $st))
            ->when($f['q'] ?? null, fn ($q, $t) => $q->where('title', 'like', "%$t%"))
            ->orderByRaw("CASE status WHEN 'PUBLISHED' THEN 0 WHEN 'PENDING_REVIEW' THEN 1 WHEN 'CHANGES_REQUESTED' THEN 2 WHEN 'REJECTED' THEN 3 ELSE 4 END")
            ->orderByDesc('sales_count')->get();

        return response()->json([
            'counts' => [
                'all' => (clone $all)->count(), 'PUBLISHED' => (int) ($counts['PUBLISHED'] ?? 0), 'PENDING_REVIEW' => (int) ($counts['PENDING_REVIEW'] ?? 0),
                'DRAFT' => (int) ($counts['DRAFT'] ?? 0), 'REJECTED' => (int) (($counts['REJECTED'] ?? 0) + ($counts['CHANGES_REQUESTED'] ?? 0)),
            ],
            'data' => $items->map(fn (Product $p) => [
                'id' => $p->id, 'slug' => $p->slug, 'title' => $p->title, 'category' => $p->category->name, 'cover_type' => $p->cover_type,
                'status' => $p->status->value, 'status_label' => $p->status->label(), 'price' => $p->price,
                'sales' => (int) ($revenue[$p->id]->n ?? 0), 'revenue' => (int) ($revenue[$p->id]->r ?? 0),
                'rating' => $p->rating_count ? $p->rating_avg : null, 'rejection_reason' => $p->rejection_reason,
            ]),
        ]);
    }

    public function showProduct(Request $request, int $id): JsonResponse
    {
        $p = $this->seller($request)->products()->with('files', 'images', 'category', 'subcategory')->findOrFail($id);
        $p->files->each(fn ($f) => $this->scanner->refresh($f));

        return response()->json($this->editorPayload($p->fresh(['files', 'images', 'category', 'subcategory'])));
    }

    /** Création d'un brouillon (étape 1). */
    public function createProduct(Request $request): JsonResponse
    {
        $s = $this->seller($request);
        $data = $this->validateInfo($request, partial: true);
        $category = Category::find($data['category_id'] ?? null) ?? Category::whereNull('parent_id')->orderBy('position')->first();
        $title = $data['title'] ?? 'Nouveau produit';
        $p = $s->products()->create([
            'title' => $title, 'slug' => $this->uniqueSlug($title), 'category_id' => $category->id,
            'subcategory_id' => $data['subcategory_id'] ?? null, 'description' => $data['description'] ?? null,
            'short_description' => isset($data['description']) ? Str::limit($data['description'], 280) : null,
            'tags' => $data['tags'] ?? [], 'price' => 0, 'status' => ProductStatus::DRAFT, 'cover_type' => $category->cover_type,
        ]);

        return response()->json($this->editorPayload($p->load('files', 'images', 'category')), 201);
    }

    /** Brouillon auto-enregistré : chaque étape envoie ses champs. */
    public function updateProduct(Request $request, int $id): JsonResponse
    {
        $p = $this->seller($request)->products()->findOrFail($id);
        abort_if($p->status === ProductStatus::PENDING_REVIEW, 409, 'Produit en cours de modération : modifications bloquées.');
        $data = $this->validateInfo($request, partial: true) + $request->validate([
            'price' => 'sometimes|integer|min:0|max:5000000',
            'compare_at_price' => 'sometimes|nullable|integer|min:0|max:5000000',
            'commercial_enabled' => 'sometimes|boolean',
            'commercial_price' => 'sometimes|nullable|integer|min:0|max:7500000',
            'video_url' => ['sometimes', 'nullable', 'url', 'max:255', 'regex:/^https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\//'],
            'rights_confirmed' => 'sometimes|boolean',
        ], ['video_url.regex' => 'Lien YouTube ou Vimeo uniquement.']);

        if (isset($data['title']) && $data['title'] !== $p->title && $p->status === ProductStatus::DRAFT) {
            $p->slug = $this->uniqueSlug($data['title'], $p->id);
        }
        if (array_key_exists('description', $data)) {
            $p->short_description = Str::limit((string) $data['description'], 280);
        }
        if (array_key_exists('commercial_enabled', $data)) {
            $p->commercial_price = $data['commercial_enabled'] ? ($data['commercial_price'] ?? (int) round(($data['price'] ?? $p->price) * 1.5)) : null;
        } elseif (array_key_exists('commercial_price', $data)) {
            $p->commercial_price = $data['commercial_price'];
        }
        if (isset($data['category_id'])) {
            $p->cover_type = Category::find($data['category_id'])?->cover_type ?? $p->cover_type;
        }
        $draft = $p->draft_data ?? [];
        if (array_key_exists('rights_confirmed', $data)) {
            $draft['rights_confirmed'] = (bool) $data['rights_confirmed'];
        }
        $p->fill(collect($data)->except(['commercial_enabled', 'commercial_price', 'rights_confirmed'])->all());
        $p->draft_data = $draft;
        if ($p->status === ProductStatus::REJECTED || $p->status === ProductStatus::CHANGES_REQUESTED) {
            $p->status = ProductStatus::DRAFT;
        }
        $p->save();

        return response()->json($this->editorPayload($p->fresh(['files', 'images', 'category', 'subcategory'])));
    }

    public function uploadFile(Request $request, int $id): JsonResponse
    {
        $p = $this->seller($request)->products()->findOrFail($id);
        $request->validate(['file' => 'required|file|max:2097152|mimes:zip,pdf,docx,xlsx,pptx,doc,xls,ppt,txt,csv,png,jpg,jpeg,psd,ai,mp3,mp4,epub']);
        $file = $request->file('file');
        $name = Str::limit(Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)), 80, '').'.'.strtolower($file->getClientOriginalExtension());
        $key = "sellers/{$p->seller_id}/{$p->id}/".Str::random(10).'/'.$name;
        Storage::disk('products')->putFileAs(dirname($key), $file, basename($key));
        $p->files()->create(['storage_key' => $key, 'file_name' => $name, 'size' => $file->getSize(),
            'format' => strtoupper($file->getClientOriginalExtension()), 'version' => $p->version, 'scan_status' => ScanStatus::PENDING]);

        return response()->json($this->editorPayload($p->fresh(['files', 'images', 'category', 'subcategory'])), 201);
    }

    public function deleteFile(Request $request, int $id, int $file): JsonResponse
    {
        $p = $this->seller($request)->products()->findOrFail($id);
        $f = $p->files()->findOrFail($file);
        Storage::disk('products')->delete($f->storage_key);
        $f->delete();

        return response()->json($this->editorPayload($p->fresh(['files', 'images', 'category', 'subcategory'])));
    }

    public function uploadImage(Request $request, int $id): JsonResponse
    {
        $p = $this->seller($request)->products()->findOrFail($id);
        $request->validate(['image' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120']);
        abort_if($p->images()->count() >= 8, 422, '8 aperçus maximum.');
        $key = $request->file('image')->store("previews/{$p->id}", 'public');
        $p->images()->create(['key' => $key, 'position' => $p->images()->count()]);
        $p->update(['cover_image_key' => $p->images()->orderBy('position')->first()->key]);

        return response()->json($this->editorPayload($p->fresh(['files', 'images', 'category', 'subcategory'])), 201);
    }

    public function deleteImage(Request $request, int $id, int $image): JsonResponse
    {
        $p = $this->seller($request)->products()->findOrFail($id);
        $img = $p->images()->findOrFail($image);
        Storage::disk('public')->delete($img->key);
        $img->delete();
        $p->images()->orderBy('position')->get()->each(fn ($i, $n) => $i->update(['position' => $n]));
        $p->update(['cover_image_key' => $p->images()->orderBy('position')->first()?->key]);

        return response()->json($this->editorPayload($p->fresh(['files', 'images', 'category', 'subcategory'])));
    }

    public function submit(Request $request, int $id): JsonResponse
    {
        $p = $this->seller($request)->products()->with('files', 'images')->findOrFail($id);
        $p->files->each(fn ($f) => $this->scanner->refresh($f));
        $checklist = $this->checklist($p->fresh(['files', 'images']));
        if (collect($checklist)->contains('done', false)) {
            throw ValidationException::withMessages(['checklist' => 'Complétez la checklist qualité avant de soumettre.']);
        }
        $p->update(['status' => ProductStatus::PENDING_REVIEW, 'submitted_at' => now(), 'rejection_reason' => null]);

        return response()->json($this->editorPayload($p->fresh(['files', 'images', 'category', 'subcategory'])));
    }

    public function archive(Request $request, int $id): JsonResponse
    {
        $p = $this->seller($request)->products()->findOrFail($id);
        $p->update(['status' => $p->sales_count > 0 ? ProductStatus::ARCHIVED : $p->status]);
        if ($p->sales_count === 0 && $p->status === ProductStatus::DRAFT) {
            $p->delete();
        }

        return response()->json(['ok' => true]);
    }

    /** @return array<int, array{key:string,label:string,done:bool}> */
    private function checklist(Product $p): array
    {
        $files = $p->files;

        return [
            ['key' => 'title', 'label' => 'Titre clair et précis', 'done' => mb_strlen($p->title) >= 10 && $p->title !== 'Nouveau produit'],
            ['key' => 'description', 'label' => 'Description de plus de 150 caractères', 'done' => mb_strlen((string) $p->description) > 150],
            ['key' => 'files', 'label' => 'Fichiers analysés par l’antivirus', 'done' => $files->isNotEmpty() && $files->every(fn ($f) => $f->scan_status === ScanStatus::CLEAN)],
            ['key' => 'previews', 'label' => 'Au moins 3 aperçus', 'done' => $p->images->count() >= 3],
            ['key' => 'price', 'label' => 'Prix et licence définis', 'done' => $p->price >= 500],
            ['key' => 'rights', 'label' => 'Je détiens les droits sur ce contenu', 'done' => (bool) ($p->draft_data['rights_confirmed'] ?? false)],
        ];
    }

    /** @return array<string, mixed> */
    private function editorPayload(Product $p): array
    {
        $checklist = $this->checklist($p);
        $steps = [
            'infos' => mb_strlen($p->title) >= 10 && $p->title !== 'Nouveau produit' && mb_strlen((string) $p->description) > 150,
            'files' => $checklist[2]['done'],
            'previews' => $p->images->count() >= 3,
            'pricing' => $p->price >= 500,
            'publish' => $p->status !== ProductStatus::DRAFT,
        ];

        return [
            'id' => $p->id, 'slug' => $p->slug, 'title' => $p->title, 'description' => $p->description, 'tags' => $p->tags ?? [],
            'category_id' => $p->category_id, 'subcategory_id' => $p->subcategory_id,
            'category' => $p->category ? ['name' => $p->category->name, 'label' => $p->category->label] : null,
            'price' => $p->price, 'compare_at_price' => $p->compare_at_price, 'commercial_price' => $p->commercial_price,
            'commercial_enabled' => $p->commercial_price !== null, 'suggested_commercial' => (int) round($p->price * 1.5),
            'video_url' => $p->video_url, 'cover_type' => $p->cover_type, 'status' => $p->status->value, 'status_label' => $p->status->label(),
            'rejection_reason' => $p->rejection_reason, 'rights_confirmed' => (bool) ($p->draft_data['rights_confirmed'] ?? false),
            'files' => $p->files->map(fn ($f) => ['id' => $f->id, 'name' => $f->file_name, 'size' => $f->size, 'format' => $f->format, 'scan_status' => $f->scan_status->value]),
            'images' => $p->images->map(fn ($i) => ['id' => $i->id, 'url' => Storage::disk('public')->url($i->key)]),
            'steps' => $steps, 'checklist' => $checklist,
            'can_submit' => ! collect($checklist)->contains('done', false) && in_array($p->status, [ProductStatus::DRAFT, ProductStatus::REJECTED, ProductStatus::CHANGES_REQUESTED], true),
            'updated_at' => $p->updated_at->toIso8601String(),
            'categories' => Category::whereNull('parent_id')->with('children')->orderBy('position')->get()
                ->map(fn ($c) => ['id' => $c->id, 'name' => $c->name, 'children' => $c->children->map(fn ($s) => ['id' => $s->id, 'name' => $s->name])]),
        ];
    }

    /** @return array<string, mixed> */
    private function validateInfo(Request $request, bool $partial): array
    {
        $s = $partial ? 'sometimes|' : 'required|';

        return $request->validate([
            'title' => $s.'string|min:3|max:80',
            'category_id' => $s.'integer|exists:categories,id',
            'subcategory_id' => 'sometimes|nullable|integer|exists:categories,id',
            'description' => 'sometimes|nullable|string|max:5000',
            'tags' => 'sometimes|array|max:10', 'tags.*' => 'string|max:30',
        ]);
    }

    private function uniqueSlug(string $title, ?int $ignore = null): string
    {
        $base = Str::slug(Str::limit($title, 60, '')) ?: 'produit';
        $slug = $base;
        $i = 2;
        while (Product::where('slug', $slug)->when($ignore, fn ($q) => $q->where('id', '!=', $ignore))->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }

    public function salesList(Request $request): JsonResponse
    {
        $s = $this->seller($request);
        $page = (clone $this->sales($s))->with('order.user')->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->orderByDesc('orders.paid_at')->select('order_items.*')->paginate(15);

        return response()->json([
            'data' => $page->getCollection()->map(fn ($i) => [
                'id' => $i->id, 'order' => $i->order->number, 'customer' => self::shortName($i->order->user?->name ?? 'Client'),
                'product' => $i->title, 'license' => $i->license->value, 'price' => $i->list_price, 'commission' => $i->commission_amount,
                'net' => $i->seller_amount, 'method' => $i->order->payment_method?->label(), 'paid_at' => $i->order->paid_at->toIso8601String(),
            ]),
            'meta' => ['total' => $page->total(), 'page' => $page->currentPage(), 'last_page' => $page->lastPage()],
            'totals' => ['gross' => (int) (clone $this->sales($s))->sum('list_price'), 'net' => (int) (clone $this->sales($s))->sum('seller_amount'), 'count' => (clone $this->sales($s))->count()],
        ]);
    }

    public function customers(Request $request): JsonResponse
    {
        $s = $this->seller($request);
        $rows = (clone $this->sales($s))->join('orders', 'orders.id', '=', 'order_items.order_id')->join('users', 'users.id', '=', 'orders.user_id')
            ->selectRaw('users.id, users.name, users.city, count(*) as purchases, sum(order_items.list_price) as spent, max(orders.paid_at) as last_at')
            ->groupBy('users.id', 'users.name', 'users.city')->orderByDesc('spent')->limit(100)->get();

        return response()->json(['data' => $rows->map(fn ($r) => [
            'name' => self::shortName($r->name), 'initials' => collect(explode(' ', $r->name))->take(2)->map(fn ($w) => mb_substr($w, 0, 1))->implode(''),
            'city' => $r->city, 'purchases' => (int) $r->purchases, 'spent' => (int) $r->spent, 'last_at' => CarbonImmutable::parse($r->last_at)->toIso8601String(),
        ]), 'total' => $rows->count()]);
    }

    public function stats(Request $request): JsonResponse
    {
        $s = $this->seller($request);
        $products = $s->products()->published()->get();
        $sales = (clone $this->sales($s))->selectRaw('product_id, count(*) as n')->groupBy('product_id')->pluck('n', 'product_id');

        return response()->json([
            'chart' => $this->series($s, 365),
            'products' => $products->map(fn ($p) => [
                'title' => $p->title, 'views' => $p->views_count, 'sales' => (int) ($sales[$p->id] ?? 0),
                'conversion' => round(($sales[$p->id] ?? 0) / max(1, $p->views_count) * 100, 2), 'rating' => $p->rating_avg, 'reviews' => $p->rating_count,
            ])->sortByDesc('sales')->values(),
            'methods' => (clone $this->sales($s))->join('orders', 'orders.id', '=', 'order_items.order_id')
                ->selectRaw('orders.payment_method as m, count(*) as n')->groupBy('orders.payment_method')->pluck('n', 'm'),
        ]);
    }

    public function reviews(Request $request): JsonResponse
    {
        $s = $this->seller($request);

        return response()->json(['data' => Review::whereIn('product_id', $s->products()->pluck('id'))->with('user', 'product')->latest()->limit(50)->get()
            ->map(fn ($r) => (new ReviewResource($r))->toArray($request))]);
    }

    public function replyReview(Request $request, Review $review): JsonResponse
    {
        abort_unless($review->product->seller_id === $this->seller($request)->id, 404);
        abort_if($review->seller_reply !== null, 409, 'Vous avez déjà répondu à cet avis.');
        $review->update(['seller_reply' => $request->validate(['reply' => 'required|string|min:2|max:1000'])['reply'], 'seller_replied_at' => now()]);

        return response()->json(['ok' => true]);
    }

    public function coupons(Request $request): JsonResponse
    {
        $s = $this->seller($request);

        return response()->json(['data' => Coupon::where('seller_id', $s->id)->latest()->get()->map(fn ($c) => [
            'id' => $c->id, 'code' => $c->code, 'label' => $c->label(), 'type' => $c->type->value, 'value' => $c->value, 'used' => $c->used_count,
            'limit' => $c->usage_limit, 'expires_at' => $c->expires_at?->toIso8601String(), 'active' => $c->active, 'product' => $c->product?->title,
        ])]);
    }

    public function storeCoupon(Request $request): JsonResponse
    {
        $s = $this->seller($request);
        $data = $request->validate([
            'code' => 'required|string|alpha_num|min:4|max:20|unique:coupons,code',
            'type' => ['required', Rule::enum(CouponType::class)], 'value' => 'required|integer|min:1|max:1000000',
            'product_id' => ['required', 'integer', Rule::exists('products', 'id')->where('seller_id', $s->id)],
            'usage_limit' => 'nullable|integer|min:1', 'expires_at' => 'nullable|date|after:today',
        ]);
        if ($data['type'] === 'PERCENT' && $data['value'] > 90) {
            throw ValidationException::withMessages(['value' => 'Réduction maximale : 90 %.']);
        }
        Coupon::create(['code' => strtoupper($data['code']), 'seller_id' => $s->id, 'scope' => CouponScope::PRODUCT] + $data);

        return $this->coupons($request);
    }

    public function toggleCoupon(Request $request, Coupon $coupon): JsonResponse
    {
        abort_unless($coupon->seller_id === $this->seller($request)->id, 404);
        $coupon->update(['active' => ! $coupon->active]);

        return $this->coupons($request);
    }

    public function profile(Request $request): JsonResponse
    {
        $s = $this->seller($request);

        return response()->json($s->only(['display_name', 'slug', 'bio', 'country', 'verified']) + ['plan' => $s->plan->value, 'commission_rate' => $s->commission_rate]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $s = $this->seller($request);
        $s->update($request->validate(['display_name' => 'required|string|min:2|max:60', 'bio' => 'nullable|string|max:300', 'country' => 'required|string|size:2']));

        return $this->profile($request);
    }

    public static function shortName(string $name): string
    {
        $parts = explode(' ', trim($name));

        return $parts[0].(isset($parts[1]) ? ' '.mb_substr($parts[1], 0, 1).'.' : '');
    }
}
