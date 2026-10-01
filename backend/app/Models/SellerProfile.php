<?php

namespace App\Models;

use App\Enums\SellerPlan;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SellerProfile extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['payout_account'];

    protected function casts(): array
    {
        return [
            'verified' => 'boolean',
            'plan' => SellerPlan::class,
            'payout_account' => 'encrypted',
            'suspended_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'seller_id');
    }

    public function ledgerEntries(): HasMany
    {
        return $this->hasMany(LedgerEntry::class, 'seller_id');
    }

    public function payouts(): HasMany
    {
        return $this->hasMany(Payout::class, 'seller_id');
    }

    public function payoutAccounts(): HasMany
    {
        return $this->hasMany(PayoutAccount::class, 'seller_id');
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class, 'seller_id');
    }
}
