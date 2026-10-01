<?php

namespace App\Http\Resources;

use App\Enums\License;
use App\Models\LibraryItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin LibraryItem */
class LibraryItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $p = $this->product;

        return [
            'id' => $this->id,
            'product' => [
                'id' => $p->id, 'slug' => $p->slug, 'title' => $p->title, 'cover_type' => $p->cover_type,
                'category' => $p->category?->label, 'category_name' => $p->category?->name, 'category_slug' => $p->category?->slug,
                'version' => $p->version, 'version_updated_at' => $p->version_updated_at?->toIso8601String(),
            ],
            'license' => $this->license->value,
            'license_label' => $this->license === License::COMMERCIAL ? 'Commerciale' : 'Personnelle',
            'granted_at' => $this->granted_at->toIso8601String(),
            'download_count' => $this->download_count,
            'download_limit' => $this->download_limit,
            'has_update' => $this->hasUpdate(),
            'revoked' => $this->revoked_at !== null,
            'order_number' => $this->orderItem?->order?->number,
            'order_id' => $this->orderItem?->order_id,
            'reviewed' => $this->when(isset($this->reviewed), fn () => (bool) $this->reviewed),
            'files' => $this->when($this->relationLoaded('product') && $p->relationLoaded('files'), fn () => $p->files->map(fn ($f) => [
                'id' => $f->id, 'name' => $f->file_name, 'size' => $f->size, 'format' => $f->format, 'version' => $f->version,
            ])),
        ];
    }
}
