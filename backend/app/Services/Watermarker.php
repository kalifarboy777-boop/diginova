<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use setasign\Fpdi\Fpdi;
use Throwable;

/** Filigrane des PDF vendus avec l'email de l'acheteur (copie mise en cache par achat). */
final class Watermarker
{
    public function watermarkedKey(string $sourceKey, string $email, int $libraryItemId, int $fileId): string
    {
        $disk = Storage::disk('products');
        $target = "watermarked/$libraryItemId/$fileId-".substr(sha1($email.$sourceKey), 0, 12).'.pdf';
        if ($disk->exists($target)) {
            return $target;
        }

        $tmpIn = tempnam(sys_get_temp_dir(), 'wm');
        file_put_contents($tmpIn, $disk->get($sourceKey));
        try {
            $pdf = new Fpdi;
            $pages = $pdf->setSourceFile($tmpIn);
            $label = iconv('UTF-8', 'Windows-1252//TRANSLIT', "Licence accordée à $email · DigiNova");
            for ($i = 1; $i <= $pages; $i++) {
                $tpl = $pdf->importPage($i);
                $size = $pdf->getTemplateSize($tpl);
                $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                $pdf->useTemplate($tpl);
                $pdf->SetFont('Helvetica', '', 8);
                $pdf->SetTextColor(150, 150, 160);
                $pdf->SetXY(10, $size['height'] - 10);
                $pdf->Cell($size['width'] - 20, 5, (string) $label, 0, 0, 'C');
            }
            $disk->put($target, $pdf->Output('S'));
        } catch (Throwable $e) {
            // PDF non importable (chiffré, version récente) : on livre l'original plutôt que de bloquer l'acheteur.
            report($e);

            return $sourceKey;
        } finally {
            @unlink($tmpIn);
        }

        return $target;
    }
}
