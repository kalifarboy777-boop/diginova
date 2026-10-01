<?php

namespace App\Http\Resources;

use App\Models\Bundle;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Bundle */
class BundleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'tagline' => $this->tagline,
            'highlights' => array_values(array_filter(explode("\n", (string) $this->description))),
            'price' => $this->price,
            'value' => $this->value,
            'discount_percent' => $this->value > 0 ? (int) round((1 - $this->price / $this->value) * 100) : 0,
            'cover_type' => $this->cover_type,
            'featured' => $this->featured,
            'products' => ProductCardResource::collection($this->whenLoaded('products')),
        ];
    }
}
