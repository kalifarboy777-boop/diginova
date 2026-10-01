<?php

namespace App\Payments;

final readonly class WebhookPayload
{
    /** @param  array<string, mixed>  $raw */
    public function __construct(
        public string $eventId,
        public string $providerRef,
        public string $status,
        public int $amount,
        public array $raw,
    ) {}
}
