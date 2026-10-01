<?php

namespace App\Services;

use App\Models\LoginToken;
use App\Models\User;
use Illuminate\Support\Str;

/** Liens à usage unique envoyés par email : connexion magique, définition et réinitialisation du mot de passe. */
final class LoginLinks
{
    public const MAGIC = 'magic';

    public const SET_PASSWORD = 'set_password';

    public const RESET_PASSWORD = 'reset_password';

    private const TTL = [self::MAGIC => 15, self::SET_PASSWORD => 60 * 24 * 7, self::RESET_PASSWORD => 30];

    private const PATHS = [self::MAGIC => '/connexion/lien', self::SET_PASSWORD => '/mot-de-passe/definir', self::RESET_PASSWORD => '/mot-de-passe/definir'];

    public function url(User $user, string $purpose, ?string $redirect = null): string
    {
        $plain = Str::random(64);
        LoginToken::create([
            'user_id' => $user->id,
            'purpose' => $purpose,
            'token_hash' => hash('sha256', $plain),
            'redirect' => $redirect,
            'expires_at' => now()->addMinutes(self::TTL[$purpose]),
        ]);

        return rtrim((string) config('app.frontend_url'), '/').self::PATHS[$purpose].'?token='.$plain;
    }

    public function consume(string $plain, array $purposes): ?LoginToken
    {
        $token = LoginToken::where('token_hash', hash('sha256', $plain))
            ->whereIn('purpose', $purposes)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->first();
        $token?->update(['used_at' => now()]);

        return $token;
    }
}
