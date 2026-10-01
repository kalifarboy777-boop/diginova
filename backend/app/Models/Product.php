<?php

namespace App\Models;

use App\Enums\ProductStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'status' => ProductStatus::class,
            'tags' => 'array',
            'formats' => 'array',
            'highlights' => 'array',
            'includes' => 'array',
            'faq' => 'array',
            'draft_data' => 'array',
            'rating_distribution' => 'array',
            'rating_avg' => 'float',
            'published_at' => 'datetime',
            'submitted_at' => 'datetime',
            'version_updated_at' => 'datetime',
        ];
    }

    /** Licence commerciale = prix + 50 % par défaut. */
    public function commercialPrice(): int
    {
        return $this->commercial_price ?? (int) round($this->price * 1.5);
    }

    public function priceFor(string $license): int
    {
        return $license === 'COMMERCIAL' ? $this->commercialPrice() : $this->price;
    }

    public function scopePublished(Builder $q): Builder
    {
        return $q->where('status', ProductStatus::PUBLISHED);
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(SellerProfile::class, 'seller_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function subcategory(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'subcategory_id');
    }

    public function files(): HasMany
    {
        return $this->hasMany(ProductFile::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('position');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function bundles(): BelongsToMany
    {
        return $this->belongsToMany(Bundle::class, 'bundle_items');
    }
}
