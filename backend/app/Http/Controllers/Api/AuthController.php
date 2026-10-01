<?php

namespace App\Http\Controllers\Api;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Mail\SimpleMail;
use App\Models\SocialAccount;
use App\Models\User;
use App\Services\CartService;
use App\Services\LoginLinks;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite;

/** Écrans 10 à 14 et 66 — connexion, inscription, code SMS, lien magique, mot de passe oublié, Google. */
class AuthController extends Controller
{
    public function __construct(private OtpService $otp, private LoginLinks $links, private CartService $carts) {}

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $request->user() ? self::present($request->user()) : null]);
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|min:2|max:80',
            'email' => 'required|email:rfc|max:190|unique:users,email',
            'phone' => ['required', 'string', 'regex:/^\+?[0-9 ]{8,20}$/'],
            'password' => ['required', Password::min(8)->letters()->numbers()],
            'account_type' => 'required|in:buyer,seller',
            'accept_terms' => 'accepted',
        ], [
            'email.unique' => 'Un compte existe déjà avec cette adresse. Connectez-vous.',
            'accept_terms.accepted' => 'Veuillez accepter les conditions générales d’utilisation.',
        ]);
        $phone = OtpService::normalize($data['phone']);
        if (User::where('phone', $phone)->exists()) {
            throw ValidationException::withMessages(['phone' => 'Ce numéro est déjà associé à un compte.']);
        }

        $user = User::create([
            'name' => $data['name'], 'email' => mb_strtolower($data['email']), 'phone' => $phone,
            'password' => $data['password'], 'role' => Role::CLIENT,
        ]);
        $user->notificationPreference()->create();
        $this->login($request, $user, true);
        $this->otp->send($phone, 'verify');

        return response()->json([
            'user' => self::present($user),
            'next' => '/verification?raison=inscription'.($data['account_type'] === 'seller' ? '&suite=/studio/candidature' : ''),
        ], 201);
    }

    public function loginWithPassword(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => 'required|email', 'password' => 'required|string', 'remember' => 'boolean']);
        $user = User::where('email', mb_strtolower($data['email']))->first();

        if (! $user || ! $user->password || ! Auth::guard('web')->validate(['email' => $user->email, 'password' => $data['password']])) {
            throw ValidationException::withMessages(['email' => 'Email ou mot de passe incorrect.']);
        }

        if ($user->two_factor_enabled && $user->phone) {
            $request->session()->put('auth.2fa', ['user_id' => $user->id, 'remember' => (bool) ($data['remember'] ?? false)]);
            $this->otp->send($user->phone, '2fa');

            return response()->json(['two_factor' => true, 'phone' => self::maskPhone($user->phone), 'next' => '/verification?raison=2fa']);
        }

        $this->login($request, $user, (bool) ($data['remember'] ?? false));

        return response()->json(['user' => self::present($user), 'next' => self::home($user)]);
    }

    public function sendOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['nullable', 'string', 'regex:/^\+?[0-9 ]{8,20}$/'],
            'purpose' => 'required|in:login,verify,2fa',
            'channel' => 'nullable|in:sms,whatsapp',
        ]);
        $phone = match ($data['purpose']) {
            'verify' => $request->user()?->phone,
            '2fa' => User::find($request->session()->get('auth.2fa.user_id'))?->phone,
            default => isset($data['phone']) ? OtpService::normalize($data['phone']) : null,
        } ?? throw ValidationException::withMessages(['phone' => 'Numéro de téléphone requis.']);

        if ($data['purpose'] === 'login' && ! User::where('phone', $phone)->exists()) {
            throw ValidationException::withMessages(['phone' => 'Aucun compte n’est associé à ce numéro.']);
        }
        $this->otp->send($phone, $data['purpose'], $data['channel'] ?? 'sms');

        return response()->json(['phone' => self::maskPhone($phone), 'resend_in' => OtpService::RESEND_SECONDS, 'expires_in' => OtpService::TTL_MINUTES * 60]);
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => 'required|digits:6',
            'purpose' => 'required|in:login,verify,2fa',
            'phone' => ['nullable', 'string', 'regex:/^\+?[0-9 ]{8,20}$/'],
        ]);

        if ($data['purpose'] === 'verify') {
            $user = $request->user() ?? abort(401);
            $this->otp->verify($user->phone, $data['code'], 'verify');
            $user->update(['phone_verified_at' => now()]);

            return response()->json(['user' => self::present($user), 'next' => self::home($user)]);
        }

        if ($data['purpose'] === '2fa') {
            $pending = $request->session()->get('auth.2fa') ?? throw ValidationException::withMessages(['code' => 'Session expirée, reconnectez-vous.']);
            $user = User::findOrFail($pending['user_id']);
            $this->otp->verify($user->phone, $data['code'], '2fa');
            $request->session()->forget('auth.2fa');
            $this->login($request, $user, $pending['remember']);

            return response()->json(['user' => self::present($user), 'next' => self::home($user)]);
        }

        $phone = OtpService::normalize($data['phone'] ?? '');
        $this->otp->verify($phone, $data['code'], 'login');
        $user = User::where('phone', $phone)->firstOrFail();
        $user->update(['phone_verified_at' => $user->phone_verified_at ?? now()]);
        $this->login($request, $user, true);

        return response()->json(['user' => self::present($user), 'next' => self::home($user)]);
    }

    public function sendMagicLink(Request $request): JsonResponse
    {
        $email = mb_strtolower($request->validate(['email' => 'required|email'])['email']);
        if ($user = User::where('email', $email)->first()) {
            Mail::to($user->email)->send(new SimpleMail('Votre lien de connexion DigiNova', 'Connexion en un clic',
                'Cliquez sur le bouton ci-dessous pour vous connecter. Ce lien est valable 15 minutes et ne peut servir qu’une fois.',
                'Me connecter', $this->links->url($user, LoginLinks::MAGIC),
                footnote: 'Vous n’êtes pas à l’origine de cette demande ? Ignorez simplement cet email.'));
        }

        // Réponse identique que le compte existe ou non (pas d'énumération des comptes).
        return response()->json(['message' => "Si un compte existe pour $email, un lien de connexion vient d’être envoyé."]);
    }

    public function consumeMagicLink(Request $request): JsonResponse
    {
        $token = $request->validate(['token' => 'required|string|size:64'])['token'];
        $login = $this->links->consume($token, [LoginLinks::MAGIC]) ?? throw ValidationException::withMessages(['token' => 'Ce lien a expiré ou a déjà été utilisé.']);
        $user = $login->user;
        $user->update(['email_verified_at' => $user->email_verified_at ?? now()]);
        $this->login($request, $user, true);

        return response()->json(['user' => self::present($user), 'next' => $login->redirect ?: self::home($user)]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $email = mb_strtolower($request->validate(['email' => 'required|email:rfc'], ['email.email' => 'Cette adresse email semble incomplète.'])['email']);
        if ($user = User::where('email', $email)->first()) {
            Mail::to($user->email)->send(new SimpleMail('Réinitialisez votre mot de passe DigiNova', 'Nouveau mot de passe',
                'Vous avez demandé à changer votre mot de passe. Ce lien est valable 30 minutes.',
                'Choisir un nouveau mot de passe', $this->links->url($user, LoginLinks::RESET_PASSWORD),
                footnote: 'Si vous n’avez rien demandé, ignorez cet email : votre mot de passe actuel reste valable.'));
        }

        return response()->json(['email' => $email, 'resend_in' => 60]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => 'required|string|size:64',
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);
        $login = $this->links->consume($data['token'], [LoginLinks::RESET_PASSWORD, LoginLinks::SET_PASSWORD])
            ?? throw ValidationException::withMessages(['token' => 'Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau.']);
        $user = $login->user;
        $user->update(['password' => $data['password'], 'email_verified_at' => $user->email_verified_at ?? now()]);
        // Déconnecte les autres sessions après un changement de mot de passe.
        \DB::table('sessions')->where('user_id', $user->id)->delete();
        $this->login($request, $user, true);

        return response()->json(['user' => self::present($user), 'next' => $login->redirect ?: self::home($user)]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['ok' => true]);
    }

    public function googleRedirect(): RedirectResponse
    {
        abort_unless(config('services.google.client_id'), 404, 'Connexion Google non configurée.');

        return Socialite::driver('google')->redirect();
    }

    public function googleCallback(Request $request): RedirectResponse
    {
        $front = rtrim((string) config('app.frontend_url'), '/');
        try {
            $google = Socialite::driver('google')->user();
        } catch (\Throwable) {
            return redirect($front.'/connexion?erreur=google');
        }
        $account = SocialAccount::where('provider', 'google')->where('provider_id', $google->getId())->first();
        $user = $account?->user ?? User::firstOrCreate(
            ['email' => mb_strtolower((string) $google->getEmail())],
            ['name' => $google->getName() ?: Str::before((string) $google->getEmail(), '@'), 'role' => Role::CLIENT, 'email_verified_at' => now(), 'avatar_url' => $google->getAvatar()],
        );
        $account ?? $user->socialAccounts()->create(['provider' => 'google', 'provider_id' => $google->getId()]);
        $this->login($request, $user, true);

        return redirect($front.self::home($user));
    }

    private function login(Request $request, User $user, bool $remember): void
    {
        if ($user->suspended_at) {
            throw ValidationException::withMessages(['email' => 'Ce compte est suspendu. Contactez le support.']);
        }
        $guestCart = $request->cookie(CartController::COOKIE);
        Auth::guard('web')->login($user, $remember);
        $request->session()->regenerate();
        $user->update(['last_login_at' => now()]);
        $this->carts->merge($guestCart, $user);
    }

    public static function home(User $user): string
    {
        return match (true) {
            $user->isStaff() => '/admin',
            $user->isCreator() => '/studio',
            default => '/compte',
        };
    }

    public static function maskPhone(string $phone): string
    {
        $d = preg_replace('/\D/', '', $phone);
        $local = substr($d, -10);

        return '+'.substr($d, 0, strlen($d) - 10).' '.substr($local, 0, 2).' •• •• '.substr($local, 6, 2).' '.substr($local, 8, 2);
    }

    /** @return array<string, mixed> */
    public static function present(User $user): array
    {
        $user->loadMissing('sellerProfile');

        return [
            'id' => $user->id,
            'name' => $user->name,
            'first_name' => $user->firstName(),
            'initials' => $user->initials(),
            'email' => $user->email,
            'phone' => $user->phone,
            'phone_verified' => $user->phone_verified_at !== null,
            'email_verified' => $user->email_verified_at !== null,
            'role' => $user->role->value,
            'avatar_url' => $user->avatar_url,
            'has_password' => $user->password !== null,
            'is_creator' => $user->isCreator(),
            'seller' => $user->sellerProfile ? [
                'name' => $user->sellerProfile->display_name, 'slug' => $user->sellerProfile->slug,
                'plan' => $user->sellerProfile->plan->value, 'verified' => $user->sellerProfile->verified,
            ] : null,
        ];
    }
}
