<?php

namespace App\Models;

use App\Enums\ScanStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductFile extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['scan_status' => ScanStatus::class];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
