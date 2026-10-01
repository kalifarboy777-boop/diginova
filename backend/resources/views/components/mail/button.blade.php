@props(['href'])
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;"><tr>
    <td align="center" style="background:#635BFF;border-radius:10px;">
        <a href="{{ $href }}" style="display:block;padding:16px 26px;font-family:Inter, Arial, sans-serif;font-weight:600;font-size:14px;line-height:20px;color:#FFFFFF;text-decoration:none;">{{ $slot }}</a>
    </td>
</tr></table>
