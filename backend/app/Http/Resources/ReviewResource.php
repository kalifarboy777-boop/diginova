<?php

namespace App\Http\Resources;

use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Review */
class ReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $parts = explode(' ', trim($this->user->name));

        return [
            'id' => $this->id,
            'author' => $parts[0].(isset($parts[1]) ? ' '.mb_substr($parts[1], 0, 1).'.' : ''),
            'initials' => $this->user->initials(),
            'rating' => $this->rating,
            'comment' => $this->comment,
            'verified' => true,
            'created_at' => $this->created_at->toIso8601String(),
            'seller_reply' => $this->seller_reply,
            'seller_replied_at' => $this->seller_replied_at?->toIso8601String(),
            'product' => $this->whenLoaded('product', fn () => ['title' => $this->product->title, 'slug' => $this->product->slug]),
        ];
    }
}
