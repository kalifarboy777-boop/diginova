<?php

namespace App\Models;

use App\Enums\License;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LibraryItem extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['license' => License::class, 'granted_at' => 'datetime', 'revoked_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }

    public function downloads(): HasMany
    {
        return $this->hasMany(DownloadLog::class);
    }

    public function hasUpdate(): bool
    {
        return $this->seen_version !== null && $this->seen_version !== $this->product->version;
    }
}
