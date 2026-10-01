<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    public const DEFAULTS = [
        'commission_standard' => 15,
        'commission_pro' => 10,
        'guarantee_days' => 7,
        'payout_minimum' => 5000,
        'download_link_minutes' => 15,
        'download_limit' => 10,
        'payment_timeout_minutes' => 5,
        'bundle_discount_percent' => 15,
        'pro_plan_price' => 9900,
        'moderation_hours' => 72,
    ];

    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['value' => 'json'];
    }

    public static function get(string $key): mixed
    {
        return Cache::rememberForever("setting.$key", fn () => static::find($key)?->value ?? self::DEFAULTS[$key] ?? null);
    }

    public static function put(string $key, mixed $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
        Cache::forget("setting.$key");
    }
}
