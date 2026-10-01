<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Contrôle d'accès par rôle :
 *  role:staff    → MODERATOR ou ADMIN
 *  role:admin    → ADMIN uniquement (paiements, commissions, paramètres)
 *  role:creator  → studio actif
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $user = $request->user();
        $ok = $user && match ($role) {
            'staff' => $user->isStaff(),
            'admin' => $user->isAdmin(),
            'creator' => $user->isCreator(),
            default => false,
        };
        abort_unless($ok, 403, 'Accès réservé.');

        return $next($request);
    }
}
