<?php

namespace App\Support;

final class Money
{
    /** 12000 → « 12 000 FCFA » (espace fine insécable, comme Intl fr-FR). */
    public static function format(int $amount, bool $short = false): string
    {
        $n = number_format($amount, 0, ',', "\u{202F}");

        return $short ? "$n F" : "$n FCFA";
    }
}
