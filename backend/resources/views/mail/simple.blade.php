@component('mail.layout', ['title' => $subjectLine])
    <x-mail.title>{{ $heading }}</x-mail.title>
    <x-mail.text>{{ $body }}</x-mail.text>
    @if ($code)
        <div style="margin:0 0 20px;padding:18px;background:#EEEDFF;border-radius:12px;text-align:center;font-family:Inter, Arial, sans-serif;font-weight:700;font-size:32px;letter-spacing:10px;color:#1E1B4B;">{{ $code }}</div>
    @endif
    @if ($buttonUrl)
        <x-mail.button :href="$buttonUrl">{{ $buttonLabel }}</x-mail.button>
    @endif
    @if ($footnote)
        <p style="margin:0;font-family:Inter, Arial, sans-serif;font-size:13px;line-height:20px;color:#9CA3AF;">{{ $footnote }}</p>
    @endif
@endcomponent
