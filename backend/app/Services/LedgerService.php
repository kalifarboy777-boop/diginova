<?php

namespace App\Services;

use App\Enums\LedgerType;
use App\Enums\PayoutStatus;
use App\Models\Payout;
use App\Models\PayoutAccount;
use App\Models\SellerProfile;
use App\Models\Setting;
use App\Support\Money;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class LedgerService
{
    /** @return array{available:int, pending:int, withdrawn_year:int, payouts_year:int} */
    public function balances(SellerProfile $seller): array
    {
        $now = now();
        $q = $seller->ledgerEntries();

        return [
            'available' => (int) (clone $q)->where('available_at', '<=', $now)->sum('amount'),
            'pending' => (int) (clone $q)->where('available_at', '>', $now)->sum('amount'),
            'withdrawn_year' => (int) $seller->payouts()->whereYear('created_at', $now->year)
                ->whereIn('status', [PayoutStatus::PAID, PayoutStatus::PROCESSING, PayoutStatus::REQUESTED])->sum('amount'),
            'payouts_year' => $seller->payouts()->whereYear('created_at', $now->year)->count(),
        ];
    }

    public function requestPayout(SellerProfile $seller, PayoutAccount $account, int $amount): Payout
    {
        return DB::transaction(function () use ($seller, $account, $amount) {
            SellerProfile::whereKey($seller->id)->lockForUpdate()->first();
            $available = $this->balances($seller)['available'];
            $min = (int) Setting::get('payout_minimum');

            if ($amount < $min) {
                throw ValidationException::withMessages(['amount' => 'Le retrait minimum est de '.Money::format($min).'.']);
            }
            if ($amount > $available) {
                throw ValidationException::withMessages(['amount' => 'Le montant dépasse votre solde disponible ('.Money::format($available).').']);
            }

            $payout = $seller->payouts()->create([
                'payout_account_id' => $account->id,
                'reference' => Numbers::payout(),
                'amount' => $amount,
                'method' => $account->method,
                'account_label' => $account->label.' · '.$account->masked,
                'status' => PayoutStatus::REQUESTED,
            ]);
            $seller->ledgerEntries()->create([
                'payout_id' => $payout->id,
                'amount' => -$amount,
                'type' => LedgerType::PAYOUT,
                'description' => "Retrait {$payout->reference}",
                'available_at' => now(),
            ]);

            return $payout;
        });
    }
}
