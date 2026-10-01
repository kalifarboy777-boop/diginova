<?php

namespace App\Http\Resources;

use App\Enums\ProductStatus;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Product */
class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $seller = $this->seller;

        return array_merge((new ProductCardResource($this->resource))->toArray($request), [
            'short_description' => $this->short_description,
            'description' => $this->description,
            'commercial_price' => $this->commercialPrice(),
            'has_commercial' => true,
            'subcategory' => $this->subcategory ? ['name' => $this->subcategory->name, 'slug' => $this->subcategory->slug] : null,
            'sales_count' => $this->sales_count,
            'tags' => $this->tags ?? [],
            'formats' => $this->formats ?? [],
            'includes' => $this->includes ?? [],
            'faq' => $this->faq ?? [],
            'version' => $this->version,
            'version_updated_at' => $this->version_updated_at?->toIso8601String(),
            'compatibility' => $this->compatibility,
            'language' => $this->language,
            'total_size' => (int) $this->files->sum('size'),
            'file_count' => $this->files->count(),
            'preview_pages' => $this->preview_pages,
            'video_url' => $this->video_url,
            'video_duration' => $this->video_duration,
            'images' => $this->images->map(fn ($i) => asset('storage/'.$i->key)),
            // Liste ordonnée de 5★ à 1★ (pourcentages).
            'rating_distribution' => self::distribution($this->rating_distribution),
            'published' => $this->status === ProductStatus::PUBLISHED,
            'seller' => [
                'name' => $seller->display_name,
                'slug' => $seller->slug,
                'initials' => collect(explode(' ', $seller->display_name))->take(2)->map(fn ($w) => mb_substr($w, 0, 1))->implode(''),
                'verified' => $seller->verified,
                'plan' => $seller->plan->value,
                'city' => $seller->user?->city,
                'member_since' => $seller->created_at->year,
                'product_count' => $seller->products()->published()->count(),
                'rating' => round((float) $seller->products()->published()->where('rating_count', '>', 0)->avg('rating_avg'), 1),
                'sales' => (int) $seller->products()->sum('sales_count'),
            ],
        ]);
    }

    /** @return array<int, int> */
    public static function distribution(?array $d): array
    {
        if (! $d) {
            return [0, 0, 0, 0, 0];
        }
        if (array_key_exists(5, $d)) {
            return array_map(fn ($s) => (int) ($d[$s] ?? 0), [5, 4, 3, 2, 1]);
        }

        return array_map('intval', array_values(array_pad($d, 5, 0)));
    }
}
