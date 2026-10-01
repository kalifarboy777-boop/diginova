<?php

use App\Enums\LedgerType;
use App\Models\User;
use App\Services\FulfillmentService;
use App\Services\LedgerService;
use App\Services\OtpService;
use App\Sms\SmsSender;
use Illuminate\Validation\ValidationException;
use Tests\Feature\Support;

beforeEach(function () {
    $this->sent = [];
    $this->app->instance(SmsSender::class, new class($this) implements SmsSender
    {
        public function __construct(private $test) {}

        public function send(string $phone, string $message, string $channel = 'sms'): void
        {
            $this->test->sent[] = $message;
        }
    });
});

function lastCode($test): string
{
    preg_match('/(\d{6})/', end($test->sent), $m);

    return $m[1];
}

it('vérifie un code OTP et bloque après 5 essais', function () {
    $otp = app(OtpService::class);
    $otp->send('0708421855');
    expect(fn () => $otp->verify('+2250708421855', '000000'))->toThrow(ValidationException::class);
    expect($otp->verify('+225 07 08 42 18 55', lastCode($this)))->toBeTrue();

    $this->travel(2)->minutes();
    $otp->send('0708421855');
    foreach (range(1, 5) as $i) {
        try {
            $otp->verify('0708421855', '111111');
        } catch (ValidationException) {
        }
    }
    expect(fn () => $otp->verify('0708421855', lastCode($this)))->toThrow(ValidationException::class, 'Trop de tentatives');
});

it('impose 60 s entre deux envois et 10 min de validité', function () {
    $otp = app(OtpService::class);
    $otp->send('0708421855');
    expect(fn () => $otp->send('0708421855'))->toThrow(ValidationException::class);
    $code = lastCode($this);
    $this->travel(11)->minutes();
    expect(fn () => $otp->verify('0708421855', $code))->toThrow(ValidationException::class, 'expiré');
});

it('inscrit puis connecte un utilisateur avec mot de passe', function () {
    $this->fromFrontend()->postJson('/api/auth/register', [
        'name' => 'Aïcha Koné', 'email' => 'aicha@ex.ci', 'phone' => '07 08 42 18 55', 'password' => 'Secret123',
        'account_type' => 'seller', 'accept_terms' => true,
    ])->assertCreated()->assertJsonPath('next', '/verification?raison=inscription&suite=/studio/candidature');

    expect(User::first()->phone)->toBe('+2250708421855');
    $this->fromFrontend()->postJson('/api/auth/login', ['email' => 'aicha@ex.ci', 'password' => 'mauvais'])->assertUnprocessable();
    $this->fromFrontend()->postJson('/api/auth/login', ['email' => 'aicha@ex.ci', 'password' => 'Secret123'])->assertOk()->assertJsonPath('user.email', 'aicha@ex.ci');
});

it('calcule solde disponible / en garantie et refuse les retraits hors bornes', function () {
    $order = Support::pendingOrder(Support::product(rate: 10));
    app(FulfillmentService::class)->markPaid($order, notify: false);
    $seller = $order->items->first()->seller;
    $ledger = app(LedgerService::class);

    expect($ledger->balances($seller))->toMatchArray(['available' => 0, 'pending' => 10800]);
    $this->travel(8)->days();
    expect($ledger->balances($seller)['available'])->toBe(10800);

    $account = $seller->payoutAccounts()->create(['method' => 'WAVE', 'label' => 'Wave', 'account' => '+225070000', 'masked' => '07 ••']);
    expect(fn () => $ledger->requestPayout($seller, $account, 4000))->toThrow(ValidationException::class, 'minimum');
    expect(fn () => $ledger->requestPayout($seller, $account, 20000))->toThrow(ValidationException::class, 'dépasse');
    $ledger->requestPayout($seller, $account, 10000);
    expect($ledger->balances($seller)['available'])->toBe(800)
        ->and($seller->ledgerEntries()->where('type', LedgerType::PAYOUT)->sum('amount'))->toBe(-10000);
});
