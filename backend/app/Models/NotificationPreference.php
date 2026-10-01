<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationPreference extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['order_confirmation' => 'boolean', 'product_updates' => 'boolean', 'price_drops' => 'boolean', 'newsletter' => 'boolean', 'magic_link_login' => 'boolean'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
