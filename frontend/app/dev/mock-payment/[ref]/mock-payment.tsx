"use client";

import { CheckCircle2, Clock, FlaskConical, ShieldAlert, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { PaymentLogo } from "@/components/ui/payment";
import { api, ApiError } from "@/lib/api";
import { fcfa } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

type State = { status: string; amount: number; reference: string; order_id: number; order_number: string; method: PaymentMethod; method_label: string; order_status: string; phone?: string };

export function MockPayment({ reference }: { reference: string }) {
  const router = useRouter();
  const back = useSearchParams().get("retour");
  const [s, setS] = React.useState<State | null>(null);
  const [result, setResult] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  React.useEffect(() => {
    api<State>(`/dev/mock-payments/${reference}`).then(setS).catch(() => setResult("Référence inconnue."));
  }, [reference]);

  async function act(action: string) {
    setBusy(action);
    try {
      const r = await api<{ webhook: { status: number; message: string } }>(`/dev/mock-payments/${reference}`, { method: "POST", body: { action } });
      setResult(`Webhook envoyé → HTTP ${r.webhook.status} · ${r.webhook.message}`);
      if (back) setTimeout(() => router.push(back), 900);
    } catch (e) {
      setResult(e instanceof ApiError ? e.message : "Erreur");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B0F1A] p-5">
      <div className="flex w-full max-w-md flex-col gap-5 rounded-[24px] bg-white p-7 text-[#111827]">
        <p className="inline-flex items-center gap-2 self-start rounded-full bg-[#FEF3C7] px-3 py-1 text-label-sm text-[#92400E]">
          <FlaskConical className="size-3.5" /> Prestataire simulé · développement
        </p>
        {s ? (
          <>
            <div className="flex items-center gap-3">
              <PaymentLogo method={s.method} />
              <div>
                <p className="text-label">{s.method_label}</p>
                <p className="text-caption text-[#4B5563]">Réf. {s.reference}</p>
              </div>
            </div>
            <div className="rounded-lg bg-[#F8F9FC] p-4">
              <p className="text-body-sm text-[#4B5563]">Paiement demandé par DigiNova · commande {s.order_number}</p>
              <p className="mt-1 text-price-lg">{fcfa(s.amount)}</p>
              <p className="mt-1 text-caption text-[#4B5563]">
                Statut opérateur : {s.status} · commande : {s.order_status}
              </p>
            </div>
            <Button size="lg" block loading={busy === "confirm"} onClick={() => act("confirm")} className="bg-[#16A34A] hover:bg-[#15803D]">
              <CheckCircle2 /> Confirmer avec le code secret
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" loading={busy === "refuse"} onClick={() => act("refuse")}>
                <XCircle /> Refuser
              </Button>
              <Button variant="secondary" loading={busy === "expire"} onClick={() => act("expire")}>
                <Clock /> Laisser expirer
              </Button>
            </div>
            <details className="text-body-sm text-[#4B5563]">
              <summary className="cursor-pointer text-label">Scénarios de sécurité</summary>
              <div className="mt-3 flex flex-col gap-2">
                <Button variant="danger-soft" size="sm" onClick={() => act("bad_signature")}>
                  <ShieldAlert /> Webhook avec signature invalide
                </Button>
                <Button variant="danger-soft" size="sm" onClick={() => act("wrong_amount")}>
                  <ShieldAlert /> Montant confirmé différent (-1 000 F)
                </Button>
              </div>
            </details>
          </>
        ) : (
          <p className="text-body">Chargement…</p>
        )}
        {result && (
          <p role="status" className="rounded-md bg-[#EEEDFF] px-4 py-3 text-body-sm text-[#635BFF]">
            {result}
          </p>
        )}
        {s && (
          <a href={back ?? `/checkout/${s.order_id}/attente`} className="text-center text-label text-[#635BFF] underline">
            Retour au site marchand
          </a>
        )}
      </div>
    </main>
  );
}
