<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Email transactionnel simple au gabarit DigiNova : titre, texte, bouton (lien magique, mot de passe, modération…). */
class SimpleMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $subjectLine,
        public string $heading,
        public string $body,
        public ?string $buttonLabel = null,
        public ?string $buttonUrl = null,
        public ?string $code = null,
        public ?string $footnote = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subjectLine);
    }

    public function content(): Content
    {
        return new Content(view: 'mail.simple');
    }
}
