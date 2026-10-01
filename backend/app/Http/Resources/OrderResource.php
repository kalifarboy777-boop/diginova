<?php

namespace App\Http\Resources;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Order */
class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $items = $this->relationLoaded('items') ? $this->items : collect();
        $first = $items->first();

        return [
            'id' => $this->id,
            'number' => $this->number,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'email' => $this->email,
            'phone' => $this->phone,
            'subtotal' => $this->subtotal,
            'discount' => $this->discount,
            'total' => $this->total,
            'coupon' => $this->coupon?->code,
            'payment_method' => $this->payment_method?->value,
            'payment_method_label' => $this->payment_method?->label(),
            'payment_phone' => $this->payment_phone,
            'created_at' => $this->created_at->toIso8601String(),
            'paid_at' => $this->paid_at?->toIso8601String(),
            'expires_at' => $this->expires_at?->toIso8601String(),
            'items_count' => $items->count(),
            'summary' => $first ? ($items->first()->bundle?->title ?? $first->title).($items->count() > 1 && ! $first->bundle_id ? ' + '.($items->count() - 1) : '') : null,
            'items' => $items->map(fn ($i) => [
                'id' => $i->id,
                'title' => $i->title,
                'license' => $i->license->value,
                'list_price' => $i->list_price,
                'unit_price' => $i->unit_price,
                'bundle' => $i->bundle?->title,
                'product' => $i->relationLoaded('product') ? ['slug' => $i->product->slug, 'cover_type' => $i->product->cover_type, 'category' => $i->product->category?->label] : null,
                'library_item_id' => $i->relationLoaded('libraryItem') ? $i->libraryItem?->id : null,
            ])->values(),
            'has_invoice' => $this->relationLoaded('invoice') ? $this->invoice !== null : null,
        ];
    }
}
