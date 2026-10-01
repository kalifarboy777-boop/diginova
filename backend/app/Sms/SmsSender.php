<?php

namespace App\Sms;

interface SmsSender
{
    /** @param  'sms'|'whatsapp'  $channel */
    public function send(string $phone, string $message, string $channel = 'sms'): void;
}
