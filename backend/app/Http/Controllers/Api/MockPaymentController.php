<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Payments\MockProvider;
use App\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Page de développement /dev/mock-payment/{ref} : simule la validation côté opérateur
 * puis envoie un webhook signé HMAC-SHA256, traité par le même code que la production.
 */
class MockPaymentController extends Controller
{
    public function __construct(private MockProvider $mock)
    {
        abort_unless(config('payments.provider') === 'mock' && ! app()->isProduction(), 404);
    }

    public function show(string $ref): JsonResponse
    {
        $state = $this->mock->state($ref) ?? abort(404);
        $payment = Payment::where('provider_ref', $ref)->with('order')->firstOrFail();

        return response()->json($state + ['reference' => $ref, 'order_id' => $payment->order_id, 'order_number' => $payment->order->number,
            'method_label' => $payment->method->label(), 'order_status' => $payment->order->status->value]);
    }

    public function act(Request $request, string $ref, PaymentService $payments): JsonResponse
    {
        $action = $request->validate(['action' => 'required|in:confirm,refuse,expire,bad_signature,wrong_amount'])['action'];
        $state = $this->mock->state($ref) ?? abort(404);

        [$status, $tamper] = match ($action) {
            'confirm', 'wrong_amount' => ['SUCCEEDED', false],
            'refuse' => ['FAILED', false],
            'expire' => ['EXPIRED', false],
            'bad_signature' => ['SUCCEEDED', true],
        };
        $this->mock->store($ref, ['status' => $status, 'amount' => $action === 'wrong_amount' ? (int) $state['amount'] - 1000 : $state['amount']] + $state);
        $hook = $this->mock->buildWebhook($ref, $status, $tamper);
        $result = $payments->handleWebhook('mock', $hook['headers'], $hook['body']);

        return response()->json(['webhook' => $result]);
    }
}
