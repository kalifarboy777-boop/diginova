<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductImage extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
