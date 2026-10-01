<?php

namespace App\Http\Controllers\Api;

use App\Enums\ApplicationStatus;
use App\Http\Controllers\Controller;
use App\Models\CreatorApplication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** Écran 40 — candidature créateur en 4 étapes (Profil → Activité → Paiement → Vérification). */
class ApplicationController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $u = $request->user();
        $app = $u->creatorApplication;

        return response()->json([
            'application' => $app ? $this->present($app) : null,
            'defaults' => ['name' => $u->name, 'email' => $u->email, 'phone' => $u->phone, 'country' => $u->country, 'city' => $u->city],
            'is_creator' => $u->isCreator(),
            'categories' => ['Business', 'Design', 'Réseaux sociaux', 'E-books & formations', 'Productivité', 'IA', 'Web & Tech', 'Audio', 'Vidéo'],
        ]);
    }

    public function save(Request $request): JsonResponse
    {
        $u = $request->user();
        abort_if($u->isCreator(), 409, 'Votre studio est déjà actif.');
        $step = (int) $request->validate(['step' => 'required|integer|between:1,4'])['step'];
        $rules = match ($step) {
            1 => ['studio_name' => 'required|string|min:2|max:60', 'country' => 'required|string|size:2', 'city' => 'required|string|max:80', 'phone' => ['required', 'regex:/^\+?[0-9 ]{8,20}$/']],
            2 => ['studio_name' => 'required|string|min:2|max:60', 'bio' => 'required|string|min:30|max:300', 'categories' => 'required|array|min:1|max:5',
                'categories.*' => 'string|max:40', 'portfolio_url' => 'nullable|string|max:190'],
            3 => ['payout_method' => 'required|in:WAVE,ORANGE_MONEY,MTN_MOMO,MOOV_MONEY,BANK', 'payout_account' => 'required|string|min:6|max:60'],
            4 => [],
        };
        $data = $request->validate($rules, ['bio.min' => 'Présentez-vous en au moins 30 caractères.']);
        $app = $u->creatorApplication;
        abort_if($app && in_array($app->status, [ApplicationStatus::APPROVED], true), 409);
        if (! $app || $app->status === ApplicationStatus::REJECTED) {
            $app = $u->creatorApplication()->create(['status' => ApplicationStatus::SUBMITTED, 'step' => 1, 'country' => $u->country]);
        }
        $app->fill($data);
        $app->step = max($app->step, min(4, $step + 1));
        $app->save();

        return response()->json(['application' => $this->present($app)]);
    }

    public function upload(Request $request): JsonResponse
    {
        $data = $request->validate([
            'kind' => 'required|in:sample,id',
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);
        $app = $request->user()->creatorApplication ?? abort(404);
        $key = $request->file('file')->store("applications/{$app->id}", 'local');
        if ($data['kind'] === 'id') {
            $app->update(['id_document_key' => $key, 'id_status' => 'PENDING']);
        } else {
            $samples = $app->sample_files ?? [];
            abort_if(count($samples) >= 5, 422, '5 fichiers maximum.');
            $samples[] = ['name' => $request->file('file')->getClientOriginalName(), 'key' => $key, 'size' => $request->file('file')->getSize()];
            $app->update(['sample_files' => $samples]);
        }

        return response()->json(['application' => $this->present($app->fresh())]);
    }

    public function removeSample(Request $request, int $index): JsonResponse
    {
        $app = $request->user()->creatorApplication ?? abort(404);
        $samples = $app->sample_files ?? [];
        array_splice($samples, $index, 1);
        $app->update(['sample_files' => $samples]);

        return response()->json(['application' => $this->present($app)]);
    }

    public function submit(Request $request): JsonResponse
    {
        $app = $request->user()->creatorApplication ?? abort(404);
        $missing = collect([
            'studio_name' => $app->studio_name, 'bio' => $app->bio, 'categories' => $app->categories,
            'payout_method' => $app->payout_method, 'id_document_key' => $app->id_document_key,
        ])->filter(fn ($v) => empty($v))->keys();
        if ($missing->isNotEmpty() || count($app->sample_files ?? []) < 2) {
            throw ValidationException::withMessages(['application' => 'Complétez toutes les étapes : profil, activité, 2 exemples minimum, compte de paiement et pièce d’identité.']);
        }
        $app->update(['status' => ApplicationStatus::SUBMITTED, 'submitted_at' => now(), 'step' => 4]);

        return response()->json(['application' => $this->present($app)]);
    }

    /** @return array<string, mixed> */
    private function present(CreatorApplication $a): array
    {
        return $a->only(['id', 'step', 'studio_name', 'country', 'city', 'phone', 'bio', 'categories', 'portfolio_url', 'payout_method', 'id_status', 'review_note']) + [
            'status' => $a->status->value, 'status_label' => $a->status->label(), 'submitted' => $a->submitted_at !== null,
            'submitted_at' => $a->submitted_at?->toIso8601String(), 'has_id_document' => $a->id_document_key !== null,
            'payout_account_masked' => $a->payout_account ? substr($a->payout_account, 0, 4).' •• '.substr($a->payout_account, -2) : null,
            'samples' => collect($a->sample_files ?? [])->map(fn ($s) => ['name' => $s['name'], 'size' => $s['size'] ?? null])->values(),
        ];
    }
}
