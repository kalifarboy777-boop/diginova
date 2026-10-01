@php use App\Support\Money; $fmt = fn ($n) => number_format($n, 0, ',', ' ').' FCFA'; @endphp
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>
    body { font-family: DejaVu Sans, sans-serif; color: #111827; font-size: 12px; margin: 0; }
    .head { background: #1E1B4B; color: #fff; padding: 24px 32px; }
    .brand { font-size: 22px; font-weight: bold; }
    .wrap { padding: 32px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    .muted { color: #6B7280; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th { text-align: left; background: #F8F9FC; color: #4B5563; font-size: 11px; padding: 10px 12px; border-bottom: 1px solid #E5E7EB; }
    td { padding: 10px 12px; border-bottom: 1px solid #E5E7EB; }
    .r { text-align: right; }
    .total td { font-weight: bold; font-size: 14px; border-bottom: none; }
    .cols td { border: none; padding: 0; vertical-align: top; }
</style>
</head>
<body>
<div class="head"><span class="brand">&#10022; DigiNova</span></div>
<div class="wrap">
    <table class="cols"><tr>
        <td>
            <h1>Facture {{ $invoice->number }}</h1>
            <div class="muted">Commande {{ $order->number }} · {{ $order->paid_at?->locale('fr')->translatedFormat('j F Y') ?? $order->created_at->locale('fr')->translatedFormat('j F Y') }}</div>
        </td>
        <td class="r">
            <b>DigiNova SAS</b><br><span class="muted">Abidjan, Côte d’Ivoire<br>support@diginova.ci</span>
        </td>
    </tr></table>

    <p style="margin-top:24px"><b>Client</b><br>{{ $order->user?->name }}<br><span class="muted">{{ $order->email }}{{ $order->phone ? ' · '.$order->phone : '' }}</span></p>

    <table>
        <thead><tr><th>Produit</th><th>Licence</th><th class="r">Montant</th></tr></thead>
        <tbody>
        @foreach ($order->items as $item)
            <tr><td>{{ $item->title }}</td><td>{{ $item->license->value === 'COMMERCIAL' ? 'Commerciale' : 'Personnelle' }}</td><td class="r">{{ $fmt($item->list_price) }}</td></tr>
        @endforeach
        @if ($order->discount > 0)
            <tr><td colspan="2">Réduction {{ $order->coupon?->code }}</td><td class="r">- {{ $fmt($order->discount) }}</td></tr>
        @endif
        <tr class="total"><td colspan="2">Total payé ({{ $order->payment_method?->label() }})</td><td class="r">{{ $fmt($order->total) }}</td></tr>
        </tbody>
    </table>
    <p class="muted" style="margin-top:32px;font-size:10px">Produits numériques livrés immédiatement. TVA non applicable (régime à préciser par l’expert-comptable). Montants en francs CFA (XOF).</p>
</div>
</body>
</html>
