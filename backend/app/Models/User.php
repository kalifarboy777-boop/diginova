<?php

namespace App\Models;

use App\Enums\Role;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'phone', 'password', 'role', 'avatar_url', 'country', 'city',
        'two_factor_enabled', 'marketing_opt_in', 'email_verified_at', 'phone_verified_at', 'last_login_at', 'suspended_at',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'suspended_at' => 'datetime',
            'password' => 'hashed',
            'role' => Role::class,
            'two_factor_enabled' => 'boolean',
            'marketing_opt_in' => 'boolean',
        ];
    }

    public function isStaff(): bool
    {
        return in_array($this->role, [Role::ADMIN, Role::MODERATOR], true);
    }

    public function isAdmin(): bool
    {
        return $this->role === Role::ADMIN;
    }

    public function isCreator(): bool
    {
        return $this->role === Role::CREATOR && $this->sellerProfile !== null && $this->sellerProfile->suspended_at === null;
    }

    public function initials(): string
    {
        $parts = preg_split('/\s+/', trim($this->name)) ?: [];

        return mb_strtoupper(collect($parts)->take(2)->map(fn ($p) => mb_substr($p, 0, 1))->implode(''));
    }

    public function firstName(): string
    {
        return explode(' ', trim($this->name))[0];
    }

    public function sellerProfile(): HasOne
    {
        return $this->hasOne(SellerProfile::class);
    }

    public function creatorApplication(): HasOne
    {
        return $this->hasOne(CreatorApplication::class)->latestOfMany();
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function libraryItems(): HasMany
    {
        return $this->hasMany(LibraryItem::class);
    }

    public function favorites(): HasMany
    {
        return $this->hasMany(Favorite::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function cart(): HasOne
    {
        return $this->hasOne(Cart::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(SupportTicket::class);
    }

    public function coupons(): BelongsToMany
    {
        return $this->belongsToMany(Coupon::class)->withPivot('used_at')->withTimestamps();
    }

    public function notificationPreference(): HasOne
    {
        return $this->hasOne(NotificationPreference::class);
    }

    public function socialAccounts(): HasMany
    {
        return $this->hasMany(SocialAccount::class);
    }
}
