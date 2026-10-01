<?php

namespace App\Http\Resources;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Product */
class ProductCardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'category' => $this->whenLoaded('category', fn () => ['name' => $this->category->name, 'label' => $this->category->label, 'slug' => $this->category->slug]),
            'price' => $this->price,
            'compare_at_price' => $this->compare_at_price,
            'rating' => $this->rating_avg,
            'rating_count' => $this->rating_count,
            'cover_type' => $this->cover_type,
            'cover_url' => $this->cover_image_key ? asset('storage/'.$this->cover_image_key) : null,
            'badge' => $this->badge,
            'seller' => $this->whenLoaded('seller', fn () => ['name' => $this->seller->display_name, 'slug' => $this->seller->slug]),
            'is_favorite' => $this->when(isset($this->is_favorite), fn () => (bool) $this->is_favorite),
        ];
    }
}
