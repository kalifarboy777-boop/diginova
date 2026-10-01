<?php

namespace App\Payments;

use RuntimeException;

final class InvalidSignature extends RuntimeException
{
    /** @param  array<string, mixed>  $payload */
    public function __construct(public readonly array $payload = [], string $message = 'Signature webhook invalide')
    {
        parent::__construct($message);
    }
}
