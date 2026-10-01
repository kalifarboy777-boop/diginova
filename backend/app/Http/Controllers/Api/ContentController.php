<?php

namespace App\Http\Controllers\Api;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\ReviewResource;
use App\Models\BlogPost;
use App\Models\ContactMessage;
use App\Models\HelpArticle;
use App\Models\NewsletterSubscriber;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Report;
use App\Models\Review;
use App\Notifications\AppNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Écran 06 (aide & contact), blog, newsletter, avis vérifiés et signalements. */
class ContentController extends Controller
{
    public function help(Request $request): JsonResponse
    {
        $q = $request->validate(['q' => 'nullable|string|max:120'])['q'] ?? null;
        $counts = HelpArticle::selectRaw('category, count(*) as c')->groupBy('category')->pluck('c', 'category');

        return response()->json([
            'topics' => collect(config('help.topics'))->map(fn ($t, $key) => $t + ['slug' => $key, 'count' => (int) ($counts[$key] ?? 0)])->values(),
            'popular' => HelpArticle::where('is_faq', true)->orderBy('position')->get(['title', 'slug', 'category']),
            'results' => $q ? HelpArticle::where('title', 'like', "%$q%")->orWhere('body', 'like', "%$q%")->limit(10)->get(['title', 'slug', 'category']) : null,
            'contact' => config('help.contact'),
        ]);
    }

    public function helpArticle(string $slug): JsonResponse
    {
        $a = HelpArticle::where('slug', $slug)->firstOrFail();

        return response()->json($a->only(['title', 'slug', 'body', 'category']) + [
            'topic' => config("help.topics.$a->category"),
            'related' => HelpArticle::where('category', $a->category)->where('id', '!=', $a->id)->get(['title', 'slug']),
        ]);
    }

    public function contact(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:80', 'email' => 'required|email', 'subject' => 'required|string|max:120',
            'order_number' => 'nullable|string|max:20', 'message' => 'required|string|min:10|max:5000',
            'attachment' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);
        unset($data['attachment']);
        ContactMessage::create($data);

        return response()->json(['message' => 'Message envoyé. Nous vous répondons sous 24 h ouvrées.'], 201);
    }

    public function newsletter(Request $request): JsonResponse
    {
        $email = mb_strtolower($request->validate(['email' => 'required|email:rfc|max:190'])['email']);
        NewsletterSubscriber::firstOrCreate(['email' => $email], ['confirmed_at' => now()]);

        return response()->json(['message' => 'Merci ! Votre premier produit gratuit arrive dans votre boîte mail.'], 201);
    }

    public function blog(): JsonResponse
    {
        return response()->json(BlogPost::whereNotNull('published_at')->latest('published_at')->get(['title', 'slug', 'excerpt', 'cover_type', 'author', 'published_at']));
    }

    public function blogPost(string $slug): JsonResponse
    {
        return response()->json(BlogPost::whereNotNull('published_at')->where('slug', $slug)->firstOrFail());
    }

    /** Seuls les acheteurs peuvent laisser un avis (badge « Achat vérifié »). */
    public function storeReview(Request $request, string $slug): JsonResponse
    {
        $product = Product::published()->where('slug', $slug)->firstOrFail();
        $data = $request->validate(['rating' => 'required|integer|between:1,5', 'comment' => 'nullable|string|max:2000']);
        $user = $request->user();
        $item = OrderItem::where('product_id', $product->id)
            ->whereHas('order', fn ($q) => $q->where('user_id', $user->id)->where('status', OrderStatus::PAID))
            ->whereHas('libraryItem', fn ($q) => $q->whereNull('revoked_at'))->first();
        abort_unless($item, 403, 'Seuls les clients ayant acheté ce produit peuvent laisser un avis.');
        abort_if(Review::where('user_id', $user->id)->where('product_id', $product->id)->exists(), 409, 'Vous avez déjà noté ce produit.');

        $review = DB::transaction(function () use ($product, $user, $item, $data) {
            $review = Review::create(['user_id' => $user->id, 'product_id' => $product->id, 'order_item_id' => $item->id] + $data);
            $count = $product->rating_count + 1;
            $dist = $product->rating_distribution ?? [5 => 0, 4 => 0, 3 => 0, 2 => 0, 1 => 0];
            // Répartition en % recalculée de façon incrémentale.
            $abs = collect($dist)->map(fn ($p) => $p * $product->rating_count / 100);
            $abs[$data['rating']] = ($abs[$data['rating']] ?? 0) + 1;
            $product->update([
                'rating_avg' => round(($product->rating_avg * $product->rating_count + $data['rating']) / $count, 1),
                'rating_count' => $count,
                'rating_distribution' => $abs->map(fn ($n) => (int) round($n / $count * 100))->all(),
            ]);
            $product->seller->user?->notify(new AppNotification('review', "Nouvel avis {$data['rating']} ★ sur {$product->title}", $data['comment'] ?? null, '/studio/produits'));

            return $review;
        });

        return (new ReviewResource($review->load('user')))->response()->setStatusCode(201);
    }

    public function report(Request $request, string $slug): JsonResponse
    {
        $product = Product::published()->where('slug', $slug)->firstOrFail();
        $data = $request->validate(['reason' => 'required|string|max:120', 'details' => 'nullable|string|max:2000']);
        Report::create($data + ['product_id' => $product->id, 'reporter_id' => $request->user('sanctum')?->id]);

        return response()->json(['message' => 'Merci, notre équipe de modération va examiner ce produit.'], 201);
    }
}
