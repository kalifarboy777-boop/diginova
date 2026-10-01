<?php

namespace App\Http\Controllers\Api;

use App\Enums\ScanStatus;
use App\Http\Controllers\Controller;
use App\Models\AdminAlert;
use App\Models\LibraryItem;
use App\Models\ProductFile;
use App\Models\Setting;
use App\Services\Watermarker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

/** Livraison sécurisée : propriété, limite, révocation, journal, URL signée 15 min, filigrane PDF. */
class DownloadController extends Controller
{
    public function __construct(private Watermarker $watermarker) {}

    public function file(Request $request, LibraryItem $item, ProductFile $file): JsonResponse
    {
        $this->authorizeItem($request, $item);
        abort_unless($file->product_id === $item->product_id, 404);
        abort_unless($file->scan_status === ScanStatus::CLEAN, 423, 'Ce fichier est en cours d’analyse antivirus.');

        $this->consume($request, $item, $file);
        $key = strtolower($file->format) === 'pdf'
            ? $this->watermarker->watermarkedKey($file->storage_key, $item->user->email, $item->id, $file->id)
            : $file->storage_key;

        return $this->signed($key, $file->file_name);
    }

    /** « Tout télécharger » : archive ZIP de tous les fichiers (compte pour un téléchargement). */
    public function all(Request $request, LibraryItem $item): JsonResponse
    {
        $this->authorizeItem($request, $item);
        $files = $item->product->files()->where('scan_status', ScanStatus::CLEAN)->get();
        abort_if($files->isEmpty(), 404);
        $this->consume($request, $item, null);

        $disk = Storage::disk('products');
        $key = "bundles/{$item->id}/".$item->product->slug.'-v'.$item->product->version.'.zip';
        if (! $disk->exists($key)) {
            $tmp = tempnam(sys_get_temp_dir(), 'dz');
            $zip = new ZipArchive;
            $zip->open($tmp, ZipArchive::OVERWRITE);
            foreach ($files as $f) {
                $src = strtolower($f->format) === 'pdf' ? $this->watermarker->watermarkedKey($f->storage_key, $item->user->email, $item->id, $f->id) : $f->storage_key;
                $zip->addFromString($f->file_name, (string) $disk->get($src));
            }
            $zip->close();
            $disk->put($key, (string) file_get_contents($tmp));
            @unlink($tmp);
        }

        return $this->signed($key, $item->product->slug.'.zip');
    }

    private function authorizeItem(Request $request, LibraryItem $item): void
    {
        $item->loadMissing('user', 'product', 'orderItem.order');
        $user = $request->user('sanctum');
        $owner = $user && $user->id === $item->user_id;
        $viaOrder = ! $owner && $item->orderItem && CheckoutController::canAccess($request, $item->orderItem->order);
        abort_unless($owner || $viaOrder, 404);
        abort_if($item->revoked_at !== null, 403, 'L’accès à ce produit a été révoqué (commande remboursée).');
    }

    private function consume(Request $request, LibraryItem $item, ?ProductFile $file): void
    {
        DB::transaction(function () use ($request, $item, $file) {
            $locked = LibraryItem::whereKey($item->id)->lockForUpdate()->first();
            abort_if($locked->download_count >= $locked->download_limit, 429,
                "Limite de {$locked->download_limit} téléchargements atteinte. Contactez le support pour la réinitialiser.");
            $locked->increment('download_count');
            $locked->update(['seen_version' => $item->product->version]);
            $locked->downloads()->create([
                'product_file_id' => $file?->id, 'ip' => $request->ip(), 'user_agent' => substr((string) $request->userAgent(), 0, 250),
            ]);
        });

        $ips = $item->downloads()->where('created_at', '>=', now()->subDay())->distinct()->count('ip');
        if ($ips > 5 && ! AdminAlert::where('type', 'download_abuse')->where('subject_id', $item->id)->whereNull('resolved_at')->exists()) {
            AdminAlert::create(['type' => 'download_abuse', 'title' => 'Téléchargements suspects', 'level' => 'danger',
                'detail' => "$ips adresses IP en 24 h · {$item->product->title} · {$item->user->email}",
                'subject_type' => LibraryItem::class, 'subject_id' => $item->id]);
        }
    }

    private function signed(string $key, string $name): JsonResponse
    {
        $minutes = (int) Setting::get('download_link_minutes');
        $url = Storage::disk('products')->temporaryUrl($key, now()->addMinutes($minutes), [
            'ResponseContentDisposition' => 'attachment; filename="'.$name.'"',
        ]);

        return response()->json(['url' => $url, 'expires_in' => $minutes * 60, 'file_name' => $name]);
    }
}
