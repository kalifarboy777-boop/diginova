<?php

namespace App\Models;

use App\Enums\CouponScope;
use App\Enums\CouponType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Coupon extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['type' => CouponType::class, 'scope' => CouponScope::class, 'starts_at' => 'datetime', 'expires_at' => 'datetime', 'active' => 'boolean'];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(SellerProfile::class, 'seller_id');
    }

    public function label(): string
    {
        return $this->description ?? ($this->type === CouponType::PERCENT ? '-'.$this->value.' %' : '-'.number_format($this->value, 0, ',', ' ').' F');
    }
}
