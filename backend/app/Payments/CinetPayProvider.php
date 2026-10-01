<?php

namespace App\Payments;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Order;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Adaptateur CinetPay (API v2). À VALIDER avec la documentation officielle et les clés de production
 * avant mise en ligne : champs exacts, canaux disponibles par pays et format de la signature x-token.
 */
final class CinetPayProvider implements PaymentProvider
{
    private const CHANNELS = [
        'WAVE' => 'WALLET', 'ORANGE_MONEY' => 'MOBILE_MONEY', 'MTN_MOMO' => 'MOBILE_MONEY',
        'MOOV_MONEY' => 'MOBILE_MONEY', 'CARD' => 'CREDIT_CARD',
    ];

    public function name(): string
    {
        return 'cinetpay';
    }

    public function createPayment(Order $order, PaymentMethod $method, string $phone): PaymentInit
    {
        $ref = 'cp_'.$order->number.'_'.Str::lower(Str::random(6));
        $response = Http::asJson()->timeout(15)->post($this->base().'/v2/payment', [
            'apikey' => config('payments.cinetpay.api_key'),
            'site_id' => config('payments.cinetpay.site_id'),
            'transaction_id' => $ref,
            'amount' => $order->total,
            'currency' => 'XOF',
            'description' => "Commande {$order->number}",
            'customer_phone_number' => preg_replace('/\D/', '', $phone),
            'customer_email' => $order->email,
            'channels' => self::CHANNELS[$method->value],
            'notify_url' => rtrim((string) config('app.url'), '/').'/api/webhooks/cinetpay',
            'return_url' => rtrim((string) config('app.frontend_url'), '/')."/checkout/{$order->id}/attente",
            'lang' => 'fr',
        ]);

        if (! $response->successful() || $response->json('code') !== '201') {
            throw new RuntimeException('CinetPay : initialisation refusée ('.$response->json('message', 'erreur inconnue').').');
        }

        return new PaymentInit($ref, $response->json('data.payment_url'), 'Finalisez le paiement sur la page sécurisée.');
    }

    public function verifyWebhook(array $headers, string $rawBody): WebhookPayload
    {
        parse_str($rawBody, $form);
        $fields = ['cpm_site_id', 'cpm_trans_id', 'cpm_trans_date', 'cpm_amount', 'cpm_currency', 'signature', 'payment_method',
            'cel_phone_num', 'cpm_phone_prefixe', 'cpm_language', 'cpm_version', 'cpm_payment_config', 'cpm_page_action',
            'cpm_custom', 'cpm_designation', 'cpm_error_message'];
        $data = implode('', array_map(fn ($f) => (string) ($form[$f] ?? ''), $fields));
        $expected = hash_hmac('sha256', $data, (string) config('payments.cinetpay.secret_key'));
        $token = $headers['x-token'] ?? '';

        if (! is_string($token) || ! hash_equals($expected, $token)) {
            throw new InvalidSignature($form);
        }

        $ref = (string) ($form['cpm_trans_id'] ?? '');

        return new WebhookPayload(
            eventId: 'cp_'.sha1($ref.($form['cpm_trans_date'] ?? '').($form['cpm_error_message'] ?? '')),
            providerRef: $ref,
            status: (string) ($form['cpm_error_message'] ?? ''),
            amount: (int) ($form['cpm_amount'] ?? 0),
            raw: $form,
        );
    }

    public function fetchPaymentStatus(string $providerRef): RemoteStatus
    {
        $response = Http::asJson()->timeout(15)->post($this->base().'/v2/payment/check', [
            'apikey' => config('payments.cinetpay.api_key'),
            'site_id' => config('payments.cinetpay.site_id'),
            'transaction_id' => $providerRef,
        ]);

        $status = match ($response->json('data.status')) {
            'ACCEPTED' => PaymentStatus::SUCCEEDED,
            'REFUSED', 'CANCELED' => PaymentStatus::FAILED,
            default => PaymentStatus::PENDING,
        };

        return new RemoteStatus($status, (int) $response->json('data.amount', 0), (string) $response->json('data.currency', 'XOF'));
    }

    private function base(): string
    {
        return rtrim((string) config('payments.cinetpay.base_url'), '/');
    }
}
