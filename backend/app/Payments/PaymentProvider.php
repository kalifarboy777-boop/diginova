<?php

namespace App\Payments;

use App\Enums\PaymentMethod;
use App\Models\Order;

interface PaymentProvider
{
    public function name(): string;

    /** Initie le paiement chez le prestataire (push USSD / validation dans l'app / page carte). */
    public function createPayment(Order $order, PaymentMethod $method, string $phone): PaymentInit;

    /**
     * Vérifie la signature du webhook et en extrait l'événement.
     *
     * @param  array<string, string>  $headers
     *
     * @throws InvalidSignature
     */
    public function verifyWebhook(array $headers, string $rawBody): WebhookPayload;

    /** Contre-vérification auprès de l'API du prestataire : seule source de vérité pour le statut et le montant. */
    public function fetchPaymentStatus(string $providerRef): RemoteStatus;
}
