<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Bundle extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['featured' => 'boolean', 'active' => 'boolean'];
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'bundle_items');
    }
}
