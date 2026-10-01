<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/** Déconnecte immédiatement un compte suspendu. */
class EnsureActive
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->suspended_at) {
            Auth::guard('web')->logout();
            abort(403, 'Ce compte est suspendu. Contactez le support.');
        }

        return $next($request);
    }
}
