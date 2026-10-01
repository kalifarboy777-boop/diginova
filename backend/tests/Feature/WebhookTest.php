<?php

use App\Enums\OrderStatus;
use App\Models\AdminAlert;
use App\Models\LedgerEntry;
use App\Models\LibraryItem;
use App\Models\WebhookEvent;
use App\Payments\MockProvider;
use Tests\Feature\Support;

function sendWebhook(array $hook)
{
    return test()->call('POST', '/api/webhooks/mock', [], [], [], [
        'HTTP_X_MOCK_SIGNATURE' => $hook['headers']['x-mock-signature'], 'CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json',
    ], $hook['body']);
}

it('livre la commande après un webhook signé et une contre-vérification', function () {
    $order = Support::pendingOrder();
    $ref = $order->latestPayment->provider_ref;
    $mock = app(MockProvider::class);
    $mock->store($ref, ['status' => 'SUCCEEDED', 'amount' => $order->total]);

    sendWebhook($mock->buildWebhook($ref, 'SUCCEEDED'))->assertOk();

    expect($order->refresh()->status)->toBe(OrderStatus::PAID)
        ->and(LibraryItem::where('user_id', $order->user_id)->count())->toBe(1)
        ->and(LedgerEntry::where('type', 'SALE')->first()->amount)->toBe(10200) // 12 000 − 15 %
        ->and(LedgerEntry::first()->available_at->isAfter(now()->addDays(6)))->toBeTrue()
        ->and($order->invoice)->not->toBeNull();
});

it('rejette une signature invalide et met la commande à vérifier sans rien livrer', function () {
    $order = Support::pendingOrder();
    $ref = $order->latestPayment->provider_ref;
    $mock = app(MockProvider::class);
    $mock->store($ref, ['status' => 'SUCCEEDED', 'amount' => $order->total]);

    sendWebhook($mock->buildWebhook($ref, 'SUCCEEDED', tamper: true))->assertStatus(401);

    expect($order->refresh()->status)->toBe(OrderStatus::NEEDS_REVIEW)
        ->and(LibraryItem::count())->toBe(0)
        ->and(AdminAlert::where('type', 'payment_review')->exists())->toBeTrue();
});

it('refuse de payer si le montant confirmé par le prestataire diffère', function () {
    $order = Support::pendingOrder();
    $ref = $order->latestPayment->provider_ref;
    $mock = app(MockProvider::class);
    $mock->store($ref, ['status' => 'SUCCEEDED', 'amount' => $order->total - 1000]);

    sendWebhook($mock->buildWebhook($ref, 'SUCCEEDED'))->assertOk();

    expect($order->refresh()->status)->toBe(OrderStatus::NEEDS_REVIEW)->and(LibraryItem::count())->toBe(0);
});

it('ne fait pas confiance au contenu du webhook : seul le statut contre-vérifié compte', function () {
    $order = Support::pendingOrder();
    $ref = $order->latestPayment->provider_ref;
    $mock = app(MockProvider::class);
    // Le prestataire indique toujours « en attente » même si le webhook annonce un succès.
    sendWebhook($mock->buildWebhook($ref, 'SUCCEEDED'))->assertOk();

    expect($order->refresh()->status)->toBe(OrderStatus::AWAITING_CONFIRMATION)->and(LibraryItem::count())->toBe(0);
});

it('traite un événement en double une seule fois (idempotence)', function () {
    $order = Support::pendingOrder();
    $ref = $order->latestPayment->provider_ref;
    $mock = app(MockProvider::class);
    $mock->store($ref, ['status' => 'SUCCEEDED', 'amount' => $order->total]);
    $hook = $mock->buildWebhook($ref, 'SUCCEEDED');

    sendWebhook($hook)->assertOk();
    sendWebhook($hook)->assertOk()->assertJson(['message' => 'Événement déjà traité']);

    expect(WebhookEvent::count())->toBe(1)
        ->and(LibraryItem::count())->toBe(1)
        ->and(LedgerEntry::where('type', 'SALE')->count())->toBe(1);
});

it('passe la commande en échec quand le prestataire refuse', function () {
    $order = Support::pendingOrder();
    $ref = $order->latestPayment->provider_ref;
    $mock = app(MockProvider::class);
    $mock->store($ref, ['status' => 'FAILED', 'amount' => $order->total]);

    sendWebhook($mock->buildWebhook($ref, 'FAILED'))->assertOk();

    expect($order->refresh()->status)->toBe(OrderStatus::FAILED);
});

it('expire la commande quand le délai de 5 minutes est dépassé', function () {
    $order = Support::pendingOrder();
    $this->travel(6)->minutes();

    $this->withCredentials()->withUnencryptedCookie('dn_order_'.$order->id, $order->access_token)
        ->getJson("/api/orders/{$order->id}/status")->assertOk()->assertJson(['status' => 'EXPIRED']);
});

it('n’expose pas une commande sans jeton ni session', function () {
    $order = Support::pendingOrder();
    $this->getJson("/api/orders/{$order->id}/status")->assertNotFound();
});
