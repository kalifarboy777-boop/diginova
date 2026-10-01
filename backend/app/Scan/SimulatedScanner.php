<?php

namespace App\Scan;

use App\Enums\ScanStatus;
use App\Models\ProductFile;

/**
 * Antivirus simulé (développement) : le fichier reste « Analyse en cours… » quelques secondes,
 * puis devient sain — sauf s'il contient la signature de test EICAR.
 * En production : brancher ClamAV (clamd) ou un service d'analyse via cette interface.
 */
final class SimulatedScanner implements Scanner
{
    private const EICAR = 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

    public function refresh(ProductFile $file): ProductFile
    {
        if ($file->scan_status !== ScanStatus::PENDING || $file->created_at->diffInSeconds(now()) < 4) {
            return $file;
        }
        $head = (string) \Storage::disk('products')->get($file->storage_key);
        $file->update(['scan_status' => str_contains(substr($head, 0, 4096), self::EICAR) ? ScanStatus::INFECTED : ScanStatus::CLEAN]);

        return $file;
    }
}
