@php
    $font = "Inter, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    $display = "Manrope, Inter, -apple-system, 'Segoe UI', Arial, sans-serif";
@endphp
<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title ?? 'DigiNova' }}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F3F4F6;">
    <tr>
        <td align="center" style="padding:40px 16px;">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:20px;overflow:hidden;">
                <tr>
                    <td style="background:#1E1B4B;padding:24px 32px;">
                        <table role="presentation" cellspacing="0" cellpadding="0"><tr>
                            <td style="width:34px;height:34px;background:#635BFF;border-radius:9px;text-align:center;vertical-align:middle;color:#FFFFFF;font-size:16px;line-height:34px;">&#10022;</td>
                            <td style="padding-left:10px;font-family:{{ $display }};font-weight:700;font-size:22px;color:#FFFFFF;">DigiNova</td>
                        </tr></table>
                    </td>
                </tr>
                <tr>
                    <td style="padding:32px;font-family:{{ $font }};">
                        {{ $slot }}
                    </td>
                </tr>
                <tr>
                    <td style="background:#F8F9FC;padding:20px 32px;font-family:{{ $font }};font-weight:500;font-size:12px;line-height:16px;color:#9CA3AF;">
                        Une question ? Répondez à cet email ou écrivez-nous sur WhatsApp au +225 07 00 00 00 00.<br>
                        <span style="display:block;margin-top:6px;">DigiNova · Abidjan, Côte d’Ivoire</span>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
