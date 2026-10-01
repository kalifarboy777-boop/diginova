<?php

namespace App\Services;

use App\Models\OtpCode;
use App\Sms\SmsSender;
use Illuminate\Validation\ValidationException;

/** Codes à 6 chiffres : 5 essais, expiration 10 min, renvoi après 60 s. */
final class OtpService
{
    public const TTL_MINUTES = 10;

    public const MAX_ATTEMPTS = 5;

    public const RESEND_SECONDS = 60;

    public function __construct(private SmsSender $sms) {}

    public static function normalize(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone);
        if (strlen($digits) === 10) {
            $digits = '225'.$digits;
        }

        return '+'.$digits;
    }

    public function send(string $phone, string $purpose = 'login', string $channel = 'sms'): OtpCode
    {
        $phone = self::normalize($phone);
        $last = OtpCode::where('phone', $phone)->where('purpose', $purpose)->latest('id')->first();
        if ($last && $last->created_at->diffInSeconds(now()) < self::RESEND_SECONDS) {
            $wait = self::RESEND_SECONDS - (int) $last->created_at->diffInSeconds(now());
            throw ValidationException::withMessages(['phone' => "Patientez $wait s avant de demander un nouveau code."]);
        }
        $code = (string) random_int(100000, 999999);
        $otp = OtpCode::create([
            'phone' => $phone, 'purpose' => $purpose, 'code_hash' => hash('sha256', $code.config('app.key')),
            'expires_at' => now()->addMinutes(self::TTL_MINUTES),
        ]);
        $this->sms->send($phone, "DigiNova : votre code est $code. Il expire dans ".self::TTL_MINUTES.' minutes. Ne le partagez jamais.', $channel);

        return $otp;
    }

    public function verify(string $phone, string $code, string $purpose = 'login'): bool
    {
        $phone = self::normalize($phone);
        $otp = OtpCode::where('phone', $phone)->where('purpose', $purpose)->whereNull('consumed_at')->latest('id')->first();
        if (! $otp || $otp->expires_at->isPast()) {
            throw ValidationException::withMessages(['code' => 'Ce code a expiré. Demandez-en un nouveau.']);
        }
        if ($otp->attempts >= self::MAX_ATTEMPTS) {
            throw ValidationException::withMessages(['code' => 'Trop de tentatives. Demandez un nouveau code.']);
        }
        if (! hash_equals($otp->code_hash, hash('sha256', $code.config('app.key')))) {
            $otp->increment('attempts');
            $left = self::MAX_ATTEMPTS - $otp->attempts;
            throw ValidationException::withMessages(['code' => $left > 0 ? "Code incorrect. Il vous reste $left essai".($left > 1 ? 's' : '').'.' : 'Trop de tentatives. Demandez un nouveau code.']);
        }
        $otp->update(['consumed_at' => now()]);

        return true;
    }
}
