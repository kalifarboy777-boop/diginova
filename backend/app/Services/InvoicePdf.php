<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Order;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

/** Facture PDF générée à la demande puis conservée dans le stockage privé. */
final class InvoicePdf
{
    public function download(Order $order): Response
    {
        $invoice = $order->invoice ?? Invoice::create(['order_id' => $order->id, 'number' => Numbers::invoice($order)]);
        $disk = Storage::disk('products');
        if (! $invoice->pdf_key || ! $disk->exists($invoice->pdf_key)) {
            $order->loadMissing('items', 'coupon', 'user');
            $pdf = Pdf::loadView('pdf.invoice', ['order' => $order, 'invoice' => $invoice])->setPaper('a4');
            $key = "invoices/{$invoice->number}.pdf";
            $disk->put($key, $pdf->output());
            $invoice->update(['pdf_key' => $key]);
        }

        return response($disk->get($invoice->pdf_key), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="facture-'.$invoice->number.'.pdf"',
        ]);
    }
}
