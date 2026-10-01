<?php

namespace App\Mail;

use App\Models\Order;
use App\Services\LoginLinks;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Écran 25 — email de confirmation de commande. */
class OrderConfirmation extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Order $order) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Vos fichiers sont prêts · commande {$this->order->number}");
    }

    public function content(): Content
    {
        $links = app(LoginLinks::class);
        $user = $this->order->user;

        return new Content(view: 'mail.order-confirmation', with: [
            'order' => $this->order->loadMissing('items', 'coupon'),
            'firstName' => $user?->firstName() ?? '',
            'downloadUrl' => $user ? $links->url($user, LoginLinks::MAGIC, '/compte/bibliotheque') : config('app.frontend_url'),
            'invoiceUrl' => $user ? $links->url($user, LoginLinks::MAGIC, '/compte/commandes') : config('app.frontend_url'),
        ]);
    }
}
