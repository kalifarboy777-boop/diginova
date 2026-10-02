<?php

namespace App\Http\Controllers\Api;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Http\Controllers\Controller;
use App\Http\Resources\LibraryItemResource;
use App\Http\Resources\OrderResource;
use App\Mail\SimpleMail;
use App\Models\Order;
use App\Payments\PaymentService;
use App\Services\CartService;
use App\Services\LoginLinks;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Cookie;

/** Écrans 21 à 24 — checkout invité, attente, succès, échec. */
class CheckoutController extends Controller
{
    public function __construct(
        private CartService $carts,
        private OrderService $orders,
        private PaymentService $payments,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => 'required|email:rfc|max:190',
            'phone' => ['required', 'string', 'regex:/^\+?[0-9 ]{8,20}$/'],
            'payment_phone' => ['nullable', 'string', 'regex:/^\+?[0-9 ]{8,20}$/'],
            'method' => ['required', Rule::enum(PaymentMethod::class)],
            'accept_terms' => 'accepted',
        ], [
            'accept_terms.accepted' => 'Veuillez accepter les conditions générales de vente.',
            'phone.regex' => 'Numéro de téléphone invalide.',
        ]);

        $cart = $this->carts->resolve($request->user(), $request->cookie(CartController::COOKIE)) ?? abort(422, 'Votre panier est vide.');
        $phone = preg_replace('/\s+/', '', $data['phone']);
        ['order' => $order, 'created' => $created] = $this->orders->createFromCart(
            $cart, $data['email'], $phone, PaymentMethod::from($data['method']), $request->user(),
        );
        $payment = $this->payments->initiate($order, PaymentMethod::from($data['method']), preg_replace('/\s+/', '', $data['payment_phone'] ?? $phone));

        return response()->json([
            'order_id' => $order->id,
            'number' => $order->number,
            'account_created' => $created,
            'redirect_url' => $payment->raw_payload['redirect_url'] ?? null,
        ], 201)->withCookie($this->orderCookie($order));
    }

    /** Suivi en temps réel (polling 3 s) de la page d'attente. */
    public function status(Request $request, Order $order): JsonResponse
    {
        $this->authorizeOrder($request, $order);
        $order = $this->payments->refresh($order);
        $payment = $order->latestPayment;

        return response()->json([
            'id' => $order->id,
            'number' => $order->number,
            'status' => $order->status->value,
            'total' => $order->total,
            'method' => $order->payment_method?->value,
            'method_label' => $order->payment_method?->label(),
            'payment_phone' => $order->payment_phone,
            'expires_at' => $order->expires_at?->toIso8601String(),
            'server_time' => now()->toIso8601String(),
            'instructions' => $payment?->raw_payload['instructions'] ?? null,
            'redirect_url' => $payment?->raw_payload['redirect_url'] ?? null,
            'reference' => $payment?->provider_ref,
            'attempts' => $order->payments()->count(),
        ]);
    }

    /** « Renvoyer la demande » / « Changer de moyen de paiement » / nouvel essai après échec. */
    public function retry(Request $request, Order $order): JsonResponse
    {
        $this->authorizeOrder($request, $order);
        $data = $request->validate([
            'method' => ['nullable', Rule::enum(PaymentMethod::class)],
            'payment_phone' => ['nullable', 'string', 'regex:/^\+?[0-9 ]{8,20}$/'],
        ]);
        abort_if($order->status === OrderStatus::PAID, 409, 'Cette commande est déjà payée.');
        abort_if($order->status === OrderStatus::NEEDS_REVIEW, 409, 'Cette commande est en cours de vérification par notre équipe.');

        $payment = $this->payments->initiate(
            $order,
            isset($data['method']) ? PaymentMethod::from($data['method']) : null,
            isset($data['payment_phone']) ? preg_replace('/\s+/', '', $data['payment_phone']) : null,
        );

        return response()->json(['order_id' => $order->id, 'redirect_url' => $payment->raw_payload['redirect_url'] ?? null]);
    }

    /** Écran 23 — récapitulatif et fichiers de la commande payée. */
    public function summary(Request $request, Order $order): JsonResponse
    {
        $this->authorizeOrder($request, $order);
        $order->load(['items.product.category', 'items.product.files', 'items.libraryItem.product.files', 'items.libraryItem.product.category', 'items.libraryItem.orderItem.order', 'items.bundle', 'coupon', 'invoice', 'user']);

        return response()->json([
            'order' => new OrderResource($order),
            'library' => $order->status === OrderStatus::PAID
                ? LibraryItemResource::collection($order->items->map->libraryItem->filter()->values())
                : [],
            'account' => [
                'email' => $order->email,
                'first_name' => $order->user?->firstName(),
                'needs_password' => $order->user && $order->user->password === null,
                'logged_in' => $request->user()?->id === $order->user_id,
            ],
        ]);
    }

    /** Bloc « Votre compte a été créé » : envoie le lien pour définir le mot de passe. */
    public function sendPasswordLink(Request $request, Order $order): JsonResponse
    {
        $this->authorizeOrder($request, $order);
        $user = $order->user;
        abort_unless($user && $user->password === null, 409, 'Ce compte a déjà un mot de passe.');
        $url = app(LoginLinks::class)->url($user, LoginLinks::SET_PASSWORD, '/compte/bibliotheque');
        Mail::to($user->email)->send(new SimpleMail('Définissez votre mot de passe DigiNova', 'Votre compte est prêt',
            'Cliquez sur le bouton ci-dessous pour choisir votre mot de passe et retrouver vos achats à tout moment.', 'Définir mon mot de passe', $url));

        return response()->json(['message' => 'Lien envoyé à '.$user->email.'.']);
    }

    public static function canAccess(Request $request, Order $order): bool
    {
        $user = $request->user('sanctum');
        if ($user && ($user->id === $order->user_id || $user->isStaff())) {
            return true;
        }
        $token = $request->cookie('dn_order_'.$order->id) ?? $request->header('X-Order-Token');

        return is_string($token) && hash_equals($order->access_token, $token);
    }

    private function authorizeOrder(Request $request, Order $order): void
    {
        abort_unless(self::canAccess($request, $order), 404);
    }

    private function orderCookie(Order $order): Cookie
    {
        return cookie('dn_order_'.$order->id, $order->access_token, 60 * 24 * 7, '/', null, null, true, false, Cookie::SAMESITE_LAX);
    }
}
