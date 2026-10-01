<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/** Notification affichée dans la cloche des espaces client / studio / admin. */
class AppNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $kind,
        public string $title,
        public ?string $body = null,
        public ?string $url = null,
    ) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return ['kind' => $this->kind, 'title' => $this->title, 'body' => $this->body, 'url' => $this->url];
    }
}
