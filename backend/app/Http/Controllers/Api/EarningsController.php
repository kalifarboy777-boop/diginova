<?php

namespace App\Http\Controllers\Api;

use App\Enums\LedgerType;
use App\Http\Controllers\Controller;
use App\Models\SellerProfile;
use App\Models\Setting;
use App\Services\LedgerService;
use App\Services\OtpService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Écran 44 — revenus, grand livre et retraits confirmés par SMS. */
class EarningsController extends Controller
{
    public function __construct(private LedgerService $ledger, private OtpService $otp) {}

    private function seller(Request $request): SellerProfile
    {
        return $request->user()->sellerProfile ?? abort(403);
    }

    public function show(Request $request): JsonResponse
    {
        $s = $this->seller($request);
        $year = now()->year;
        $sales = $s->ledgerEntries()->where('type', LedgerType::SALE)->whereYear('created_at', $year)->get(['amount', 'created_at']);
        $months = collect(range(1, now()->month))->map(fn ($m) => [
            'label' => ucfirst(CarbonImmutable::create($year, $m, 1)->locale('fr')->translatedFormat('M')),
            'value' => (int) $sales->filter(fn ($e) => $e->created_at->month === $m)->sum('amount'),
        ]);
        $last = $months->last()['value'] ?? 0;
        $prev = $months->count() > 1 ? $months[$months->count() - 2]['value'] : 0;

        return response()->json([
            'balance' => $this->ledger->balances($s),
            'commission' => ['rate' => $s->commission_rate, 'plan' => $s->plan->value, 'standard' => (int) Setting::get('commission_standard'), 'pro' => (int) Setting::get('commission_pro')],
            'guarantee_days' => (int) Setting::get('guarantee_days'),
            'minimum' => (int) Setting::get('payout_minimum'),
            'chart' => ['points' => $months, 'change' => $prev ? (int) round(($last - $prev) / $prev * 100) : null],
            'payouts' => $s->payouts()->latest()->limit(20)->get()->map(fn ($p) => [
                'id' => $p->id, 'reference' => $p->reference, 'amount' => $p->amount, 'account' => $p->account_label,
                'status' => $p->status->value, 'status_label' => $p->status->label(), 'created_at' => $p->created_at->toIso8601String(),
            ]),
            'accounts' => $s->payoutAccounts()->orderByDesc('is_default')->get()->map(fn ($a) => [
                'id' => $a->id, 'method' => $a->method, 'label' => $a->label, 'masked' => $a->masked, 'is_default' => $a->is_default,
            ]),
            'phone' => $request->user()->phone ? AuthController::maskPhone($request->user()->phone) : null,
        ]);
    }

    /** Étape 1 : vérifie le montant puis envoie le code de confirmation par SMS. */
    public function request(Request $request): JsonResponse
    {
        $s = $this->seller($request);
        $data = $request->validate(['amount' => 'required|integer|min:1', 'account_id' => 'required|integer']);
        $s->payoutAccounts()->findOrFail($data['account_id']);
        $available = $this->ledger->balances($s)['available'];
        $min = (int) Setting::get('payout_minimum');
        if ($data['amount'] < $min || $data['amount'] > $available) {
            throw ValidationException::withMessages(['amount' => 'Montant entre '.number_format($min, 0, ',', ' ').' et '.number_format($available, 0, ',', ' ').' FCFA.']);
        }
        $phone = $request->user()->phone ?? throw ValidationException::withMessages(['amount' => 'Ajoutez un numéro de téléphone à votre profil.']);
        $this->otp->send($phone, 'payout');
        $request->session()->put('payout.pending', $data + ['at' => now()->timestamp]);

        return response()->json(['phone' => AuthController::maskPhone($phone), 'resend_in' => OtpService::RESEND_SECONDS]);
    }

    /** Étape 2 : confirmation par code, création du retrait et débit du solde. */
    public function confirm(Request $request): JsonResponse
    {
        $s = $this->seller($request);
        $code = $request->validate(['code' => 'required|digits:6'])['code'];
        $pending = $request->session()->get('payout.pending') ?? throw ValidationException::withMessages(['code' => 'Demande expirée, recommencez.']);
        $this->otp->verify($request->user()->phone, $code, 'payout');
        $request->session()->forget('payout.pending');
        $payout = $this->ledger->requestPayout($s, $s->payoutAccounts()->findOrFail($pending['account_id']), (int) $pending['amount']);

        return response()->json(['reference' => $payout->reference, 'amount' => $payout->amount], 201);
    }

    public function export(Request $request): StreamedResponse
    {
        $entries = $this->seller($request)->ledgerEntries()->latest()->get();

        return response()->streamDownload(function () use ($entries) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Date', 'Type', 'Libellé', 'Montant (FCFA)', 'Disponible le'], ';');
            foreach ($entries as $e) {
                fputcsv($out, [$e->created_at->format('d/m/Y'), $e->type->label(), $e->description, $e->amount, $e->available_at->format('d/m/Y')], ';');
            }
            fclose($out);
        }, 'releve-diginova.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
