<?php

namespace App\Scan;

use App\Models\ProductFile;

interface Scanner
{
    /** Met à jour scan_status (PENDING → CLEAN | INFECTED). */
    public function refresh(ProductFile $file): ProductFile;
}
