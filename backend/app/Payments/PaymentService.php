<?php

namespace App\Payments;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\AdminAlert;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\WebhookEvent;
use App\Services\FulfillmentService;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

final class PaymentService
{
    public function __construct(
        private PaymentManager $manager,
        private FulfillmentService $fulfillment,
    ) {}

    /** Lance (ou relance) une demande de paiement pour la commande. */
    public function initiate(Order $order, ?PaymentMethod $method = null, ?string $phone = null): Payment
    {
        if (! in_array($order->status, [OrderStatus::PENDING, OrderStatus::AWAITING_CONFIRMATION, OrderStatus::FAILED, OrderStatus::EXPIRED], true)) {
            throw new \DomainException('Cette commande ne peut plus être payée.');
        }

        $method ??= $order->payment_method;
        $phone ??= $order->payment_phone ?? $order->phone ?? '';
        $provider = $this->manager->provider();

        $order->payments()->whereIn('status', [PaymentStatus::INITIATED, PaymentStatus::PENDING])
            ->update(['status' => PaymentStatus::EXPIRED]);

        $init = $provider->createPayment($order, $method, $phone);
        $payment = $order->payments()->create([
            'provider' => $provider->name(),
            'method' => $method,
            'provider_ref' => $init->providerRef,
            'amount' => $order->total,
            'status' => PaymentStatus::PENDING,
            'raw_payload' => ['redirect_url' => $init->redirectUrl, 'instructions' => $init->instructions],
            'attempts' => $order->payments()->count() + 1,
        ]);

        $order->update([
            'status' => OrderStatus::AWAITING_CONFIRMATION,
            'payment_method' => $method,
            'payment_phone' => $phone,
            'expires_at' => now()->addMinutes((int) Setting::get('payment_timeout_minutes')),
        ]);
        $order->logEvent('payment_initiated', 'Paiement initié · '.$method->label(), $phone ? "Demande envoyée au $phone" : null);

        return $payment;
    }

    /**
     * Traitement d'un webhook. La commande n'est payée que si : signature valide,
     * événement jamais traité, ET contre-vérification API (statut + montant exact).
     *
     * @param  array<string, string>  $headers
     * @return array{status:int, message:string}
     */
    public function handleWebhook(string $providerName, array $headers, string $rawBody): array
    {
        $provider = $this->manager->provider($providerName);

        try {
            $event = $provider->verifyWebhook($headers, $rawBody);
        } catch (InvalidSignature $e) {
            $this->recordInvalidSignature($providerName, $e->payload);

            return ['status' => 401, 'message' => 'Signature invalide'];
        }

        try {
            $record = WebhookEvent::create([
                'provider' => $providerName,
                'event_id' => $event->eventId,
                'signature_valid' => true,
                'payload' => $event->raw,
            ]);
        } catch (UniqueConstraintViolationException) {
            return ['status' => 200, 'message' => 'Événement déjà traité'];
        }

        $payment = Payment::where('provider_ref', $event->providerRef)->with('order')->first();
        if (! $payment) {
            $record->update(['error' => 'Paiement introuvable', 'processed_at' => now()]);

            return ['status' => 404, 'message' => 'Paiement introuvable'];
        }

        $order = $payment->order;
        $order->logEvent('webhook', 'Webhook reçu', now()->format('H:i:s').' · signature valide');
        $payment->update(['webhook_status' => 'Signature OK']);

        $result = $this->counterVerify($payment);
        $record->update(['processed_at' => now(), 'error' => $result === 'ok' ? null : $result]);

        return ['status' => 200, 'message' => $result];
    }

    /** Contre-vérification auprès du prestataire puis application du statut. */
    public function counterVerify(Payment $payment): string
    {
        $order = $payment->order;
        $remote = $this->manager->provider($payment->provider)->fetchPaymentStatus($payment->provider_ref);
        $order->logEvent('counter_check', 'Contre-vérification API', $remote->status->label().' · '.number_format($remote->amount, 0, ',', ' ').' '.$remote->currency);

        return DB::transaction(function () use ($payment, $order, $remote) {
            $payment->refresh();

            if ($remote->status === PaymentStatus::SUCCEEDED) {
                if ($remote->amount !== $payment->amount || $remote->amount !== $order->total || $remote->currency !== 'XOF') {
                    $this->flag($order, $payment, 'Montant différent', "Montant confirmé {$remote->amount} ≠ attendu {$order->total}");

                    return 'Montant différent';
                }
                $payment->update(['status' => PaymentStatus::SUCCEEDED, 'verified_at' => now(), 'webhook_status' => 'Vérifié']);
                DB::afterCommit(fn () => $this->fulfillment->markPaid($order));

                return 'ok';
            }

            if ($remote->status === PaymentStatus::FAILED) {
                $payment->update(['status' => PaymentStatus::FAILED, 'webhook_status' => 'Refusé']);
                $order->update(['status' => OrderStatus::FAILED]);
                $order->logEvent('failed', 'Paiement refusé', null, 'danger');

                return 'Paiement refusé';
            }

            if ($remote->status === PaymentStatus::EXPIRED) {
                $this->expire($order);

                return 'Paiement expiré';
            }

            return 'En attente';
        });
    }

    /** Appelé par le suivi de la page d'attente : expire la commande si le délai est dépassé. */
    public function refresh(Order $order): Order
    {
        if ($order->status === OrderStatus::AWAITING_CONFIRMATION && $order->expires_at?->isPast()) {
            $payment = $order->latestPayment;
            if ($payment) {
                $remote = $this->manager->provider($payment->provider)->fetchPaymentStatus($payment->provider_ref);
                if ($remote->status === PaymentStatus::SUCCEEDED) {
                    $this->counterVerify($payment);

                    return $order->refresh();
                }
            }
            $this->expire($order);
        }

        return $order->refresh();
    }

    public function expire(Order $order): void
    {
        $order->update(['status' => OrderStatus::EXPIRED]);
        $order->payments()->whereIn('status', [PaymentStatus::INITIATED, PaymentStatus::PENDING])
            ->update(['status' => PaymentStatus::EXPIRED, 'webhook_status' => 'Expiré']);
        $order->logEvent('expired', 'Délai de paiement dépassé', null, 'warning');
    }

    private function flag(Order $order, Payment $payment, string $why, string $detail): void
    {
        $order->update(['status' => OrderStatus::NEEDS_REVIEW]);
        $payment->update(['webhook_status' => $why]);
        $order->logEvent('needs_review', 'À vérifier · '.$why, $detail, 'danger');
        AdminAlert::create([
            'type' => 'payment_review', 'title' => "Commande {$order->number} à vérifier", 'detail' => $detail,
            'level' => 'danger', 'subject_type' => Order::class, 'subject_id' => $order->id,
        ]);
    }

    /** @param  array<string, mixed>  $payload */
    private function recordInvalidSignature(string $provider, array $payload): void
    {
        $ref = (string) ($payload['reference'] ?? $payload['cpm_trans_id'] ?? '');
        WebhookEvent::create([
            'provider' => $provider,
            'event_id' => 'invalid_'.sha1(json_encode($payload).microtime()),
            'signature_valid' => false,
            'payload' => $payload,
            'processed_at' => now(),
            'error' => 'Signature invalide',
        ]);

        $payment = $ref ? Payment::where('provider_ref', $ref)->with('order')->first() : null;
        if ($payment && $payment->order->status !== OrderStatus::PAID) {
            $payment->increment('attempts');
            $payment->order->logEvent('webhook', 'Webhook reçu', now()->format('H:i:s').' · signature invalide', 'danger');
            $this->flag($payment->order, $payment, 'Échec signature', 'Signature webhook invalide');
        }
    }
}
