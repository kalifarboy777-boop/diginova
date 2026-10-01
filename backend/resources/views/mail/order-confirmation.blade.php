@php
    use App\Support\Money;
    $cell = 'padding:12px 16px;border-top:1px solid #E5E7EB;font-family:Inter, Arial, sans-serif;';
@endphp
@component('mail.layout', ['title' => 'Merci pour votre achat'])
    <x-mail.title>Merci pour votre achat{{ $firstName ? ', '.$firstName : '' }} !</x-mail.title>
    <x-mail.text>Votre paiement de {{ Money::format($order->total) }} a bien été reçu. Vos fichiers sont prêts : cliquez ci-dessous pour les télécharger. Ils restent aussi disponibles à vie dans votre bibliothèque.</x-mail.text>
    <x-mail.button :href="$downloadUrl">&#8681;&nbsp; Télécharger mes fichiers</x-mail.button>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #E5E7EB;border-radius:12px;border-collapse:separate;margin:0 0 20px;">
        <tr style="background:#F8F9FC;">
            <td style="padding:12px 16px;font-family:Inter, Arial, sans-serif;font-weight:600;font-size:12px;line-height:16px;color:#4B5563;border-radius:12px 0 0 0;">Commande {{ $order->number }} · {{ $order->created_at->locale('fr')->translatedFormat('j M Y') }}</td>
            <td align="right" style="padding:12px 16px;font-family:Inter, Arial, sans-serif;font-weight:600;font-size:12px;line-height:16px;color:#4B5563;">Montant</td>
        </tr>
        @foreach ($order->items as $item)
            <tr>
                <td style="{{ $cell }}font-size:13px;line-height:20px;color:#111827;">{{ $item->title }}{{ $item->license->value === 'COMMERCIAL' ? ' — licence commerciale' : '' }}</td>
                <td align="right" style="{{ $cell }}font-weight:600;font-size:12px;color:#111827;white-space:nowrap;">{{ Money::format($item->list_price, true) }}</td>
            </tr>
        @endforeach
        @if ($order->discount > 0)
            <tr>
                <td style="{{ $cell }}font-size:13px;line-height:20px;color:#111827;">Réduction {{ $order->coupon?->code }}</td>
                <td align="right" style="{{ $cell }}font-weight:600;font-size:12px;color:#111827;white-space:nowrap;">- {{ Money::format($order->discount, true) }}</td>
            </tr>
        @endif
        <tr>
            <td style="{{ $cell }}font-size:13px;line-height:20px;color:#111827;">Total payé avec {{ $order->payment_method?->label() }}</td>
            <td align="right" style="{{ $cell }}font-weight:600;font-size:12px;color:#111827;white-space:nowrap;">{{ Money::format($order->total) }}</td>
        </tr>
    </table>

    <a href="{{ $invoiceUrl }}" style="font-family:Inter, Arial, sans-serif;font-weight:600;font-size:14px;line-height:20px;color:#635BFF;text-decoration:none;">&#128462;&nbsp; Télécharger la facture (PDF)</a>
@endcomponent
