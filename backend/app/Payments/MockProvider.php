<?php

namespace App\Payments;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Order;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Prestataire simulé pour le développement. L'état « côté prestataire » est conservé en cache,
 * et la page /dev/mock-payment/{ref} permet de confirmer, refuser ou laisser expirer le paiement.
 */
final class MockProvider implements PaymentProvider
{
    public const PREFIXES = [
        'WAVE' => 'wv', 'ORANGE_MONEY' => 'om', 'MTN_MOMO' => 'mtn', 'MOOV_MONEY' => 'mv', 'CARD' => 'ch',
    ];

    public function name(): string
    {
        return 'mock';
    }

    public function createPayment(Order $order, PaymentMethod $method, string $phone): PaymentInit
    {
        $ref = self::PREFIXES[$method->value].'_'.Str::lower(Str::random(16));
        $this->store($ref, ['status' => PaymentStatus::PENDING->value, 'amount' => $order->total, 'order' => $order->number, 'method' => $method->value, 'phone' => $phone]);

        return new PaymentInit(
            providerRef: $ref,
            redirectUrl: rtrim((string) config('app.frontend_url'), '/')."/dev/mock-payment/$ref",
            instructions: $method === PaymentMethod::CARD
                ? 'Validez le paiement 3-D Secure.'
                : 'Une demande de paiement a été envoyée sur votre téléphone. Validez-la avec votre code secret.',
        );
    }

    public function verifyWebhook(array $headers, string $rawBody): WebhookPayload
    {
        $payload = json_decode($rawBody, true) ?: [];
        $signature = $headers['x-mock-signature'] ?? '';
        $expected = hash_hmac('sha256', $rawBody, (string) config('payments.mock.secret'));

        if (! is_string($signature) || ! hash_equals($expected, $signature)) {
            throw new InvalidSignature($payload);
        }

        return new WebhookPayload(
            eventId: (string) ($payload['event_id'] ?? ''),
            providerRef: (string) ($payload['reference'] ?? ''),
            status: (string) ($payload['status'] ?? ''),
            amount: (int) ($payload['amount'] ?? 0),
            raw: $payload,
        );
    }

    public function fetchPaymentStatus(string $providerRef): RemoteStatus
    {
        $state = $this->state($providerRef);

        return new RemoteStatus(
            status: PaymentStatus::from($state['status'] ?? PaymentStatus::FAILED->value),
            amount: (int) ($state['amount'] ?? 0),
        );
    }

    /** @return array<string, mixed>|null */
    public function state(string $ref): ?array
    {
        return Cache::get("mock-payment:$ref");
    }

    /** @param  array<string, mixed>  $state */
    public function store(string $ref, array $state): void
    {
        Cache::put("mock-payment:$ref", $state, now()->addDay());
    }

    /**
     * Construit le webhook signé que le prestataire enverrait.
     *
     * @return array{headers: array<string, string>, body: string}
     */
    public function buildWebhook(string $ref, string $status, bool $tamper = false): array
    {
        $state = $this->state($ref) ?? [];
        $body = json_encode([
            'event_id' => 'evt_'.Str::lower(Str::random(20)),
            'reference' => $ref,
            'status' => $status,
            'amount' => (int) ($state['amount'] ?? 0),
            'currency' => 'XOF',
            'sent_at' => now()->toIso8601String(),
        ], JSON_THROW_ON_ERROR);
        $signature = hash_hmac('sha256', $body, (string) config('payments.mock.secret'));

        return ['headers' => ['x-mock-signature' => $tamper ? strrev($signature) : $signature], 'body' => $body];
    }
}
