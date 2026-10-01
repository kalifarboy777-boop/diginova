<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

/** Écran 34 — profil, sécurité, notifications, sessions, suppression de compte. */
class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $u = $request->user();
        $prefs = $u->notificationPreference ?? $u->notificationPreference()->create();
        [$first, $last] = array_pad(explode(' ', $u->name, 2), 2, '');

        return response()->json([
            'first_name' => $first, 'last_name' => $last, 'email' => $u->email, 'email_verified' => $u->email_verified_at !== null,
            'phone' => $u->phone, 'phone_verified' => $u->phone_verified_at !== null, 'country' => $u->country, 'city' => $u->city,
            'avatar_url' => $u->avatar_url, 'has_password' => $u->password !== null,
            'password_changed_at' => $u->updated_at->toIso8601String(),
            'two_factor_enabled' => $u->two_factor_enabled,
            'notifications' => $prefs->only(['order_confirmation', 'product_updates', 'price_drops', 'newsletter', 'magic_link_login']),
            'sessions' => $this->sessions($request),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $u = $request->user();
        $data = $request->validate([
            'first_name' => 'required|string|max:40', 'last_name' => 'nullable|string|max:40',
            'email' => ['required', 'email:rfc', 'max:190', Rule::unique('users', 'email')->ignore($u->id)],
            'phone' => ['nullable', 'string', 'regex:/^\+?[0-9 ]{8,20}$/'],
            'country' => 'required|string|size:2', 'city' => 'nullable|string|max:80',
        ]);
        $phone = $data['phone'] ? OtpService::normalize($data['phone']) : null;
        if ($phone && $phone !== $u->phone && User::where('phone', $phone)->exists()) {
            throw ValidationException::withMessages(['phone' => 'Ce numéro est déjà utilisé.']);
        }
        $u->fill([
            'name' => trim($data['first_name'].' '.($data['last_name'] ?? '')), 'email' => mb_strtolower($data['email']),
            'phone' => $phone, 'country' => strtoupper($data['country']), 'city' => $data['city'],
        ]);
        if ($u->isDirty('email')) {
            $u->email_verified_at = null;
        }
        if ($u->isDirty('phone')) {
            $u->phone_verified_at = null;
        }
        $u->save();

        return $this->show($request);
    }

    public function avatar(Request $request): JsonResponse
    {
        $request->validate(['avatar' => 'required|image|mimes:jpg,jpeg,png|max:2048'], ['avatar.max' => 'JPG ou PNG, 2 Mo maximum.']);
        $u = $request->user();
        $path = $request->file('avatar')->store('avatars', 'public');
        $u->update(['avatar_url' => Storage::disk('public')->url($path)]);

        return response()->json(['avatar_url' => $u->avatar_url]);
    }

    public function deleteAvatar(Request $request): JsonResponse
    {
        $request->user()->update(['avatar_url' => null]);

        return response()->json(['avatar_url' => null]);
    }

    public function password(Request $request): JsonResponse
    {
        $u = $request->user();
        $data = $request->validate([
            'current_password' => [$u->password ? 'required' : 'nullable', 'string'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);
        if ($u->password && ! Hash::check($data['current_password'] ?? '', $u->password)) {
            throw ValidationException::withMessages(['current_password' => 'Mot de passe actuel incorrect.']);
        }
        $u->update(['password' => $data['password']]);
        DB::table('sessions')->where('user_id', $u->id)->where('id', '!=', $request->session()->getId())->delete();

        return response()->json(['message' => 'Mot de passe modifié. Vos autres sessions ont été déconnectées.']);
    }

    public function security(Request $request): JsonResponse
    {
        $u = $request->user();
        $data = $request->validate(['two_factor_enabled' => 'sometimes|boolean', 'magic_link_login' => 'sometimes|boolean']);
        if (($data['two_factor_enabled'] ?? false) && ! $u->phone_verified_at) {
            throw ValidationException::withMessages(['two_factor_enabled' => 'Vérifiez d’abord votre numéro de téléphone.']);
        }
        if (array_key_exists('two_factor_enabled', $data)) {
            $u->update(['two_factor_enabled' => $data['two_factor_enabled']]);
        }
        if (array_key_exists('magic_link_login', $data)) {
            $u->notificationPreference()->updateOrCreate([], ['magic_link_login' => $data['magic_link_login']]);
        }

        return $this->show($request);
    }

    public function notifications(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_confirmation' => 'sometimes|boolean', 'product_updates' => 'sometimes|boolean',
            'price_drops' => 'sometimes|boolean', 'newsletter' => 'sometimes|boolean',
        ]);
        $request->user()->notificationPreference()->updateOrCreate([], $data);
        if (array_key_exists('newsletter', $data)) {
            $request->user()->update(['marketing_opt_in' => $data['newsletter']]);
        }

        return $this->show($request);
    }

    public function revokeSession(Request $request, string $id): JsonResponse
    {
        abort_if($id === $request->session()->getId(), 422, 'Utilisez « Se déconnecter » pour cette session.');
        DB::table('sessions')->where('user_id', $request->user()->id)->where('id', $id)->delete();

        return response()->json(['sessions' => $this->sessions($request)]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $u = $request->user();
        $request->validate(['confirmation' => 'required|in:SUPPRIMER'], ['confirmation.in' => 'Tapez SUPPRIMER pour confirmer.']);
        abort_if($u->isStaff(), 403, 'Un compte d’administration ne peut pas être supprimé ici.');
        abort_if($u->sellerProfile()->exists(), 409, 'Fermez d’abord votre studio créateur (contactez le support).');

        DB::transaction(function () use ($u) {
            // Les commandes sont conservées (obligations comptables) mais anonymisées.
            $u->orders()->update(['email' => 'supprime-'.$u->id.'@diginova.invalid', 'phone' => null, 'payment_phone' => null]);
            $u->libraryItems()->update(['revoked_at' => now()]);
            $u->favorites()->delete();
            $u->update(['name' => 'Compte supprimé', 'email' => 'supprime-'.$u->id.'@diginova.invalid', 'phone' => null,
                'password' => null, 'avatar_url' => null, 'two_factor_enabled' => false]);
            DB::table('sessions')->where('user_id', $u->id)->delete();
        });
        Auth::guard('web')->logout();

        return response()->json(['message' => 'Votre compte a été supprimé.']);
    }

    /** @return array<int, array<string, mixed>> */
    private function sessions(Request $request): array
    {
        $current = $request->session()->getId();

        return DB::table('sessions')->where('user_id', $request->user()->id)->orderByDesc('last_activity')->get()->map(function ($s) use ($current) {
            $ua = (string) $s->user_agent;
            $device = str_contains($ua, 'iPhone') ? 'iPhone' : (str_contains($ua, 'Android') ? 'Android' : (str_contains($ua, 'Mac') ? 'Mac' : (str_contains($ua, 'Windows') ? 'Windows' : 'Appareil')));
            $browser = str_contains($ua, 'Edg') ? 'Edge' : (str_contains($ua, 'Chrome') ? 'Chrome' : (str_contains($ua, 'Firefox') ? 'Firefox' : (str_contains($ua, 'Safari') ? 'Safari' : 'Navigateur')));

            return [
                'id' => $s->id, 'device' => "$device · $browser", 'ip' => $s->ip_address, 'location' => 'Abidjan',
                'last_activity' => date(DATE_ATOM, $s->last_activity), 'current' => $s->id === $current,
            ];
        })->all();
    }
}
