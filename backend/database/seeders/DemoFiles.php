<?php

namespace Database\Seeders;

use Illuminate\Support\Facades\Storage;
use ZipArchive;

/** Génère de petits fichiers de démonstration valides (PDF, ZIP, DOCX, XLSX) dans le disque privé « products ». */
final class DemoFiles
{
    public static function make(string $key, string $fileName, string $productTitle): int
    {
        $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        $content = match ($ext) {
            'pdf' => self::pdf($productTitle, $fileName),
            'docx' => self::docx($productTitle),
            'xlsx' => self::xlsx($productTitle),
            default => self::zip($productTitle, $fileName),
        };
        Storage::disk('products')->put($key, $content);

        return strlen($content);
    }

    /** PDF minimal écrit à la main (une page, Helvetica) : léger et valide. */
    public static function pdf(string $title, string $fileName): string
    {
        $esc = fn (string $t) => str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], (string) iconv('UTF-8', 'Windows-1252//TRANSLIT', $t));
        $stream = "0.118 0.106 0.294 rg 40 742 515 60 re f\n"
            ."BT /F2 22 Tf 1 1 1 rg 60 764 Td (DigiNova) Tj ET\n"
            .'BT /F2 20 Tf 0.067 0.094 0.153 rg 60 690 Td ('.$esc($title).") Tj ET\n"
            .'BT /F1 11 Tf 0.294 0.333 0.388 rg 60 660 Td ('.$esc('Fichier de démonstration : '.$fileName).") Tj ET\n"
            .'BT /F1 11 Tf 60 642 Td ('.$esc('Ce document remplace le contenu réel du produit en développement.').") Tj ET\n";
        $objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
            '<< /Length '.strlen($stream)." >>\nstream\n{$stream}endstream",
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
        ];
        $pdf = "%PDF-1.4\n";
        $offsets = [];
        foreach ($objects as $i => $obj) {
            $offsets[] = strlen($pdf);
            $pdf .= ($i + 1)." 0 obj\n$obj\nendobj\n";
        }
        $xref = strlen($pdf);
        $pdf .= "xref\n0 ".(count($objects) + 1)."\n0000000000 65535 f \n";
        foreach ($offsets as $o) {
            $pdf .= sprintf("%010d 00000 n \n", $o);
        }

        return $pdf."trailer\n<< /Size ".(count($objects) + 1)." /Root 1 0 R >>\nstartxref\n$xref\n%%EOF\n";
    }

    private static function zip(string $title, string $fileName): string
    {
        $tmp = tempnam(sys_get_temp_dir(), 'dn');
        $zip = new ZipArchive;
        $zip->open($tmp, ZipArchive::OVERWRITE);
        $zip->addFromString('LISEZ-MOI.txt', "$title\n\nArchive de démonstration DigiNova ($fileName).\n");
        $zip->addFromString('apercu.pdf', self::pdf($title, 'apercu.pdf'));
        $zip->close();
        $data = (string) file_get_contents($tmp);
        @unlink($tmp);

        return $data;
    }

    private static function docx(string $title): string
    {
        $t = htmlspecialchars($title, ENT_XML1);

        return self::ooxml([
            '[Content_Types].xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
            '_rels/.rels' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
            'word/document.xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:rPr><w:b/><w:sz w:val="40"/></w:rPr><w:t>'.$t.'</w:t></w:r></w:p><w:p><w:r><w:t>Document de démonstration DigiNova.</w:t></w:r></w:p></w:body></w:document>',
        ]);
    }

    private static function xlsx(string $title): string
    {
        $t = htmlspecialchars($title, ENT_XML1);

        return self::ooxml([
            '[Content_Types].xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
            '_rels/.rels' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
            'xl/workbook.xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="DigiNova" sheetId="1" r:id="rId1"/></sheets></workbook>',
            'xl/_rels/workbook.xml.rels' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
            'xl/worksheets/sheet1.xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>'.$t.'</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>Montant (FCFA)</t></is></c><c r="B2"><v>12000</v></c></row></sheetData></worksheet>',
        ]);
    }

    /** @param  array<string, string>  $parts */
    private static function ooxml(array $parts): string
    {
        $tmp = tempnam(sys_get_temp_dir(), 'dn');
        $zip = new ZipArchive;
        $zip->open($tmp, ZipArchive::OVERWRITE);
        foreach ($parts as $name => $xml) {
            $zip->addFromString($name, $xml);
        }
        $zip->close();
        $data = (string) file_get_contents($tmp);
        @unlink($tmp);

        return $data;
    }
}
