<?php

namespace App\Sms;

use App\Mail\SimpleMail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/** Développement : le SMS est écrit dans le journal et copié dans Mailpit (dev@diginova.local). */
final class LogSmsSender implements SmsSender
{
    public function send(string $phone, string $message, string $channel = 'sms'): void
    {
        Log::info("[$channel → $phone] $message");
        Mail::to('dev-sms@diginova.local')->send(new SimpleMail("[$channel] $phone", 'SMS simulé', $message));
    }
}
