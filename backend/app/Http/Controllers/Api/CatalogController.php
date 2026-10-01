<?php

namespace App\Http\Controllers\Api;

use App\Ai\Recommender;
use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\BundleResource;
use App\Http\Resources\ProductCardResource;
use App\Http\Resources\ProductResource;
use App\Http\Resources\ReviewResource;
use App\Models\Bundle;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Product;
use App\Models\Review;
use App\Models\SellerProfile;
use App\Models\Setting;
use App\Models\User;
use App\Services\ProductSearch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class CatalogController extends Controller
{
    public function __construct(private ProductSearch $search) {}

    /** Écran 01 — accueil. */
    public function home(): JsonResponse
    {
        $cards = fn ($q) => ProductCardResource::collection($q->with(['category', 'seller'])->limit(8)->get());
        $bundle = Bundle::where('featured', true)->where('active', true)->with('products.category')->first();
        $announce = Coupon::where('code', 'BIENVENUE')->where('active', true)->first();

        return response()->json([
            'announcement' => $announce ? ['text' => 'Offre de lancement : '.$announce->description.' avec le code '.$announce->code, 'code' => $announce->code] : null,
            'hero' => [
                'resources' => Product::published()->count(),
                'customers' => User::whereHas('orders', fn ($q) => $q->where('status', OrderStatus::PAID))->count(),
                'rating' => round((float) Review::avg('rating') ?: 4.9, 1),
                'products' => ProductCardResource::collection(Product::published()->whereIn('slug', ['business-plan-pro', 'pack-500-prompts-ia'])->with('category')->orderByDesc('sales_count')->get()),
            ],
            'categories' => Category::whereNull('parent_id')->orderBy('position')->limit(6)->get()->map(fn ($c) => [
                'name' => $c->name, 'slug' => $c->slug, 'icon' => $c->icon, 'cover_type' => $c->cover_type,
                'count' => Product::published()->where('category_id', $c->id)->count(),
            ]),
            'tabs' => [
                'tendances' => $cards(Product::published()->orderByDesc('sales_count')),
                'nouveautes' => $cards(Product::published()->orderByDesc('published_at')),
                'meilleures-ventes' => $cards(Product::published()->orderByDesc('rating_count')),
                'petits-prix' => $cards(Product::published()->where('price', '<=', 5000)->orderByDesc('sales_count')),
            ],
            'bundle' => $bundle ? new BundleResource($bundle) : null,
            'testimonials' => ReviewResource::collection(Review::with('user', 'product')->where('rating', 5)->whereNotNull('comment')->latest()->limit(3)->get()),
            'creator' => [
                'share' => 100 - (int) Setting::get('commission_standard'),
                'payout_delay_hours' => 48,
            ],
        ]);
    }

    public function categories(): JsonResponse
    {
        return response()->json(Category::whereNull('parent_id')->with('children')->orderBy('position')->get()->map(fn ($c) => [
            'name' => $c->name, 'label' => $c->label, 'slug' => $c->slug, 'icon' => $c->icon, 'cover_type' => $c->cover_type, 'description' => $c->description,
            'count' => Product::published()->where('category_id', $c->id)->count(),
            'children' => $c->children->map(fn ($s) => ['name' => $s->name, 'slug' => $s->slug]),
        ]));
    }

    /** Écrans 02 et 03 — boutique, catégorie, recherche. */
    public function products(Request $request): JsonResponse
    {
        $f = $request->validate([
            'q' => 'nullable|string|max:120', 'category' => 'nullable|string|max:80', 'sub' => 'nullable|array', 'sub.*' => 'string|max:120',
            'min' => 'nullable|integer|min:0', 'max' => 'nullable|integer|min:0', 'rating' => 'nullable|numeric|between:0,5',
            'format' => 'nullable|array', 'format.*' => 'string|max:10', 'license' => 'nullable|in:personal,commercial',
            'sort' => 'nullable|in:'.implode(',', ProductSearch::SORTS), 'per_page' => 'nullable|integer|between:1,48', 'seller' => 'nullable|string|max:80',
        ]);
        $query = $this->search->query($f);
        if (! empty($f['seller'])) {
            $query->whereHas('seller', fn ($s) => $s->where('slug', $f['seller']));
        }
        $page = $query->paginate($f['per_page'] ?? 12)->withQueryString();
        $this->flagFavorites($request, $page->getCollection());

        $category = ! empty($f['category']) ? Category::with('children', 'parent')->where('slug', $f['category'])->first() : null;
        $facets = $this->search->facets($f);

        return response()->json([
            'data' => ProductCardResource::collection($page->getCollection()),
            'meta' => ['total' => $page->total(), 'page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage()],
            'category' => $category ? [
                'name' => $category->name, 'slug' => $category->slug, 'description' => $category->description,
                'parent' => $category->parent ? ['name' => $category->parent->name, 'slug' => $category->parent->slug] : null,
                'count' => Product::published()->where(fn ($w) => $w->where('category_id', $category->id)->orWhere('subcategory_id', $category->id))->count(),
                'children' => ($category->parent ?? $category)->children()->get()->map(fn ($s) => [
                    'name' => $s->name, 'slug' => $s->slug, 'count' => (int) ($facets['subcategories'][$s->id] ?? 0),
                ]),
            ] : null,
            'facets' => [
                'formats' => $facets['formats'],
                'categories' => Category::whereIn('id', array_keys($facets['categories']->all()))->get()
                    ->map(fn ($c) => ['name' => $c->name, 'slug' => $c->slug, 'count' => (int) $facets['categories'][$c->id]])->sortByDesc('count')->values(),
                'price_max' => (int) Product::published()->max('price'),
            ],
            'suggestion' => ! empty($f['q']) ? app(Recommender::class)->suggest($f['q']) : null,
        ]);
    }

    /** Menu de suggestions du header. */
    public function suggest(Request $request): JsonResponse
    {
        $q = (string) $request->validate(['q' => 'required|string|min:1|max:80'])['q'];
        $products = $this->search->query(['q' => $q])->limit(2)->get();
        $titles = $this->search->query(['q' => $q])->limit(6)->pluck('title');
        $category = Category::whereNotNull('parent_id')->where('name', 'like', '%'.Str::before($q, ' ').'%')->withCount(['subProducts' => fn ($w) => $w->published()])->first();

        return response()->json([
            'suggestions' => $titles->map(fn ($t) => Str::lower(Str::before($t, ' —')))->prepend(Str::lower($q))->unique()->take(3)->values(),
            'category' => $category ? ['name' => $category->name, 'slug' => $category->slug, 'count' => $category->sub_products_count] : null,
            'products' => ProductCardResource::collection($products),
        ]);
    }

    /** Écran 04 — fiche produit. */
    public function show(Request $request, string $slug): JsonResponse
    {
        $product = Product::where('slug', $slug)->with(['category', 'subcategory', 'seller.user', 'files', 'images'])->firstOrFail();
        $user = $request->user('sanctum');
        $isOwner = $user && ($product->seller->user_id === $user->id || $user->isStaff());
        abort_unless($product->status->value === 'PUBLISHED' || $isOwner, 404);
        $product->increment('views_count');

        $together = Product::published()->where('id', '!=', $product->id)
            ->where(fn ($w) => $w->where('category_id', $product->category_id)->orWhereIn('id', $product->bundles()->with('products')->get()->flatMap->products->pluck('id')))
            ->orderByDesc('sales_count')->limit(2)->with('category')->get();
        $togetherAll = collect([$product])->merge($together);
        $togetherTotal = $togetherAll->sum('price');
        $discount = (int) Setting::get('bundle_discount_percent');

        $related = Product::published()->where('id', '!=', $product->id)->whereNotIn('id', $together->pluck('id'))
            ->orderByRaw('CASE WHEN category_id = ? THEN 0 ELSE 1 END', [$product->category_id])->orderByDesc('sales_count')
            ->with(['category', 'seller'])->limit(4)->get();
        $this->flagFavorites($request, collect([$product])->merge($related));

        $owned = $user ? $user->libraryItems()->where('product_id', $product->id)->whereNull('revoked_at')->exists() : false;

        return response()->json([
            'product' => new ProductResource($product),
            'reviews' => ReviewResource::collection($product->reviews()->where('status', 'PUBLISHED')->with('user')->latest()->limit(2)->get()),
            'together' => [
                'products' => ProductCardResource::collection($togetherAll),
                'total' => $togetherTotal,
                'price' => (int) round($togetherTotal * (100 - $discount) / 100),
                'discount_percent' => $discount,
            ],
            'related' => ProductCardResource::collection($related),
            'viewer' => [
                'owns' => $owned,
                'can_review' => $owned && ! $product->reviews()->where('user_id', $user?->id)->exists(),
                'is_favorite' => (bool) ($product->is_favorite ?? false),
            ],
        ]);
    }

    public function reviews(string $slug): JsonResponse
    {
        $product = Product::published()->where('slug', $slug)->firstOrFail();

        return ReviewResource::collection($product->reviews()->where('status', 'PUBLISHED')->with('user')->latest()->paginate(10))->response();
    }

    public function bundles(): JsonResponse
    {
        return BundleResource::collection(Bundle::where('active', true)->with('products.category')->orderByDesc('featured')->get())->response();
    }

    public function bundle(string $slug): JsonResponse
    {
        return (new BundleResource(Bundle::where('active', true)->where('slug', $slug)->with('products.category', 'products.seller')->firstOrFail()))->response();
    }

    public function seller(string $slug): JsonResponse
    {
        $seller = SellerProfile::where('slug', $slug)->with('user')->firstOrFail();
        $products = $seller->products()->published();

        return response()->json([
            'name' => $seller->display_name, 'slug' => $seller->slug, 'bio' => $seller->bio, 'verified' => $seller->verified,
            'plan' => $seller->plan->value, 'country' => $seller->country, 'city' => $seller->user?->city, 'member_since' => $seller->created_at->year,
            'product_count' => (clone $products)->count(),
            'rating' => round((float) (clone $products)->where('rating_count', '>', 0)->avg('rating_avg'), 1),
            'sales' => (int) (clone $products)->sum('sales_count'),
            'review_count' => (int) (clone $products)->sum('rating_count'),
        ]);
    }

    /** @param  Collection<int, Product>  $products */
    private function flagFavorites(Request $request, $products): void
    {
        $user = $request->user('sanctum');
        if (! $user || $products->isEmpty()) {
            return;
        }
        $ids = $user->favorites()->whereIn('product_id', $products->pluck('id'))->pluck('product_id')->flip();
        $products->each(fn ($p) => $p->is_favorite = $ids->has($p->id));
    }
}
