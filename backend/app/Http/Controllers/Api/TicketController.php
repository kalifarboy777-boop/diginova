<?php

namespace App\Http\Controllers\Api;

use App\Enums\TicketStatus;
use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use App\Notifications\AppNotification;
use App\Services\Numbers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/** Écran 35 — tickets de support (client) et réponses de l'équipe (admin). */
class TicketController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tickets = $request->user()->tickets()->with('order')->orderByDesc('last_message_at')->get();

        return response()->json(['data' => $tickets->map(fn ($t) => self::summary($t)),
            'open' => $tickets->where('status', '!=', TicketStatus::RESOLVED)->count(), 'resolved' => $tickets->where('status', TicketStatus::RESOLVED)->count()]);
    }

    public function show(Request $request, SupportTicket $ticket): JsonResponse
    {
        $this->authorizeTicket($request, $ticket);

        return response()->json(self::detail($ticket));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject' => 'required|string|min:4|max:120', 'message' => 'required|string|min:5|max:5000',
            'order_number' => 'nullable|string|max:20', 'attachments' => 'nullable|array|max:3',
            'attachments.*' => 'file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);
        $order = ! empty($data['order_number']) ? $request->user()->orders()->where('number', $data['order_number'])->first() : null;
        $ticket = $request->user()->tickets()->create([
            'number' => Numbers::ticket(), 'subject' => $data['subject'], 'order_id' => $order?->id,
            'status' => TicketStatus::OPEN, 'last_message_at' => now(),
        ]);
        $ticket->messages()->create(['author_id' => $request->user()->id, 'body' => $data['message'], 'attachments' => $this->store_files($request)]);

        return response()->json(self::detail($ticket), 201);
    }

    public function reply(Request $request, SupportTicket $ticket): JsonResponse
    {
        $this->authorizeTicket($request, $ticket);
        $data = $request->validate(['message' => 'required|string|min:1|max:5000', 'attachments' => 'nullable|array|max:3', 'attachments.*' => 'file|mimes:jpg,jpeg,png,pdf|max:5120']);
        $staff = $request->user()->isStaff() && $request->user()->id !== $ticket->user_id;
        $ticket->messages()->create(['author_id' => $request->user()->id, 'from_staff' => $staff, 'body' => $data['message'], 'attachments' => $this->store_files($request)]);
        $ticket->update(['last_message_at' => now(), 'status' => $staff ? TicketStatus::IN_PROGRESS : ($ticket->status === TicketStatus::RESOLVED ? TicketStatus::OPEN : $ticket->status),
            'assignee_id' => $staff ? $request->user()->id : $ticket->assignee_id]);
        if ($staff) {
            $ticket->user->notify(new AppNotification('ticket', 'Réponse du support · #'.self::num($ticket), mb_substr($data['message'], 0, 120), '/compte/support/'.$ticket->id));
        }

        return response()->json(self::detail($ticket->refresh()));
    }

    public function resolve(Request $request, SupportTicket $ticket): JsonResponse
    {
        $this->authorizeTicket($request, $ticket);
        $ticket->update(['status' => TicketStatus::RESOLVED]);

        return response()->json(self::detail($ticket));
    }

    public static function num(SupportTicket $t): string
    {
        return str_pad((string) $t->number, 4, '0', STR_PAD_LEFT);
    }

    /** @return array<string, mixed> */
    public static function summary(SupportTicket $t): array
    {
        return [
            'id' => $t->id, 'number' => self::num($t), 'subject' => $t->subject, 'status' => $t->status->value, 'status_label' => $t->status->label(),
            'last_message_at' => $t->last_message_at?->toIso8601String(), 'order_number' => $t->order?->number,
            'customer' => $t->relationLoaded('user') ? ['name' => $t->user->name, 'email' => $t->user->email] : null,
        ];
    }

    /** @return array<string, mixed> */
    public static function detail(SupportTicket $t): array
    {
        $t->load('messages.author', 'order.items', 'user');

        return self::summary($t) + [
            'order' => $t->order ? ['number' => $t->order->number, 'title' => $t->order->items->first()?->title] : null,
            'messages' => $t->messages->sortBy('created_at')->values()->map(fn ($m) => [
                'id' => $m->id, 'body' => $m->body, 'from_staff' => $m->from_staff,
                'author' => $m->from_staff ? $m->author->firstName().' · Support DigiNova' : 'Vous',
                'author_name' => $m->author->name, 'initials' => $m->from_staff ? 'DN' : $m->author->initials(),
                'attachments' => collect($m->attachments ?? [])->map(fn ($a) => ['name' => $a['name'], 'size' => $a['size'] ?? null, 'url' => isset($a['key']) ? Storage::disk('public')->url($a['key']) : null]),
                'created_at' => $m->created_at->toIso8601String(),
            ]),
        ];
    }

    private function authorizeTicket(Request $request, SupportTicket $ticket): void
    {
        abort_unless($ticket->user_id === $request->user()->id || $request->user()->isStaff(), 404);
    }

    /** @return array<int, array{name:string,size:int,key:string}> */
    private function store_files(Request $request): array
    {
        return collect($request->file('attachments', []))->map(fn ($f) => [
            'name' => $f->getClientOriginalName(), 'size' => $f->getSize(), 'key' => $f->store('tickets', 'public'),
        ])->all();
    }
}
