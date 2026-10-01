<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WebhookController extends Controller
{
    public function __invoke(Request $request, string $provider, PaymentService $payments): JsonResponse
    {
        abort_unless(in_array($provider, ['mock', 'cinetpay'], true), 404);
        $headers = collect($request->headers->all())->map(fn ($v) => is_array($v) ? (string) ($v[0] ?? '') : (string) $v)->all();
        $result = $payments->handleWebhook($provider, $headers, $request->getContent());

        return response()->json(['message' => $result['message']], $result['status']);
    }
}
