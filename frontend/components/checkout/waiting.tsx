"use client";

import { AlertTriangle, Info, RefreshCw, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { api, ApiError } from "@/lib/api";
import { fcfa } from "@/lib/format";
import type { OrderStatusPayload, PaymentMethod } from "@/lib/types";
import { ChangeMethodDialog } from "./change-method";

const STEPS: Record<PaymentMethod, [string, string][]> = {
  WAVE: [["Ouvrez l’application Wave", "Une notification « Paiement DigiNova » vous attend"]],
  ORANGE_MONEY: [["Composez #144# ou ouvrez Orange Money", "Une demande « Paiement DigiNova » vous attend"]],
  MTN_MOMO: [["Ouvrez la notification MoMo", "Ou composez *133# puis « Mes approbations »"]],
  MOOV_MONEY: [["Composez le code USSD Moov Money", "Une demande « Paiement DigiNova » vous attend"]],
  CARD: [["Finalisez la vérification 3-D Secure", "Sur la page de votre banque"]],
};

function maskPhone(p: string | null) {
  if (!p) return "";
  const d = p.replace(/\D/g, "").slice(-10);
  return `${d.slice(0, 2)} •• •• ${d.slice(6, 8)} ${d.slice(8, 10)}`;
}

/** Écran 22 (desktop) / 63 (mobile) — suivi en temps réel du paiement (polling 3 s, compte à rebours 5 min). */
export function Waiting({ orderId }: { orderId: number }) {
  const router = useRouter();
  const [s, setS] = React.useState<OrderStatusPayload | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [offset, setOffset] = React.useState(0);
  const [now, setNow] = React.useState(() => Date.now());
  const [resending, setResending] = React.useState(false);

  const poll = React.useCallback(async () => {
    try {
      const r = await api<OrderStatusPayload>(`/orders/${orderId}/status`);
      setOffset(new Date(r.server_time).getTime() - Date.now());
      setS(r);
      if (r.status === "PAID") router.replace(`/checkout/${orderId}/succes`);
      if (r.status === "FAILED" || r.status === "EXPIRED") router.replace(`/checkout/${orderId}/echec`);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? "Commande introuvable sur cet appareil." : null);
    }
  }, [orderId, router]);

  React.useEffect(() => {
    poll();
    const p = setInterval(poll, 3000);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(p);
      clearInterval(t);
    };
  }, [poll]);

  if (error)
    return (
      <Card>
        <p className="text-body text-text-secondary">{error}</p>
        <Button asChild>
          <Link href="/compte/commandes">Voir mes commandes</Link>
        </Button>
      </Card>
    );
  if (!s)
    return (
      <Card>
        <Skeleton className="size-32 rounded-full" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-40 w-full" />
      </Card>
    );

  const total = 5 * 60 * 1000;
  const left = Math.max(0, new Date(s.expires_at ?? 0).getTime() - (now + offset));
  const mm = String(Math.floor(left / 60000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
  const method = (s.method ?? "WAVE") as PaymentMethod;
  const steps: [string, string][] = [
    ...STEPS[method],
    ["Vérifiez le montant", `${fcfa(s.total)} · bénéficiaire DigiNova`],
    ["Confirmez avec votre code secret", "La page se mettra à jour automatiquement"],
  ];

  if (s.status === "NEEDS_REVIEW")
    return (
      <Card>
        <span className="flex size-32 items-center justify-center rounded-full bg-warning-subtle text-warning">
          <AlertTriangle className="size-10" />
        </span>
        <h1 className="text-h3 text-center md:text-h2">Paiement en cours de vérification</h1>
        <p className="text-center text-body-lg text-text-secondary">
          Nous vérifions votre paiement auprès de {s.method_label}. Vous recevrez un email dès la confirmation (en général sous 30 minutes). Aucun nouveau paiement n’est nécessaire.
        </p>
        <Button asChild variant="secondary">
          <Link href="/aide#contact">Contacter le support</Link>
        </Button>
      </Card>
    );

  return (
    <Card>
      <span className="flex size-32 items-center justify-center rounded-full bg-brand-subtle text-brand-primary">
        <Smartphone className="size-10" />
      </span>
      <span className="rounded-full bg-warning-subtle px-2.5 py-1 text-label-sm text-warning" aria-live="polite">
        En attente de confirmation · {mm}:{ss}
      </span>
      <h1 className="text-center text-h3 md:text-h2">{method === "CARD" ? "Validez le paiement auprès de votre banque" : "Validez le paiement sur votre téléphone"}</h1>
      <p className="text-center text-body-lg text-text-secondary">
        {method === "CARD" ? (
          <>Montant : {fcfa(s.total)} par carte bancaire.</>
        ) : (
          <>
            Une demande de {fcfa(s.total)} a été envoyée au {maskPhone(s.payment_phone)} via {s.method_label}.
          </>
        )}
      </p>
      <ol className="w-full overflow-hidden rounded-lg border border-border-default">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex items-center gap-4 border-b border-border-default px-5 py-4 last:border-0">
            <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-brand-subtle text-label text-brand-primary">{i + 1}</span>
            <span className="flex flex-col">
              <span className="text-label text-text-primary">{t}</span>
              <span className="text-body-sm text-text-secondary">{d}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="flex w-full flex-col gap-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-bg-subtle" role="progressbar" aria-label="Temps restant" aria-valuemin={0} aria-valuemax={300} aria-valuenow={Math.round(left / 1000)}>
          <div className="h-full rounded-full bg-brand-primary transition-[width] duration-1000" style={{ width: `${100 - (left / total) * 100}%` }} />
        </div>
        <p className="text-caption text-text-tertiary" aria-live="polite">
          Nous vérifions la confirmation auprès de {s.method_label}…
        </p>
      </div>
      <div className="grid w-full gap-3 sm:grid-cols-2">
        <Button
          variant="secondary"
          size="lg"
          loading={resending}
          onClick={async () => {
            setResending(true);
            try {
              await api(`/orders/${orderId}/retry`, { method: "POST" });
              toast.success("Nouvelle demande envoyée.");
              poll();
            } catch (e) {
              toast.error(e instanceof ApiError ? e.message : "Échec de l’envoi.");
            } finally {
              setResending(false);
            }
          }}
        >
          <RefreshCw /> Renvoyer la demande
        </Button>
        <ChangeMethodDialog orderId={orderId} current={s.method} phone={s.payment_phone} trigger={<Button variant="secondary" size="lg">Changer de moyen de paiement</Button>} />
      </div>
      <p className="flex w-full items-center gap-3 rounded-lg bg-bg-subtle px-4 py-3.5 text-body-sm text-text-secondary">
        <Info className="size-[18px] shrink-0" /> Ne fermez pas cette page. Vous recevrez aussi un email dès que le paiement sera confirmé.
      </p>
      {process.env.NODE_ENV !== "production" && s.redirect_url && (
        <a href={s.redirect_url} target="_blank" rel="noreferrer" className="text-caption text-brand-primary underline">
          Mode développement : simuler la réponse de l’opérateur ({s.reference})
        </a>
      )}
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex max-w-[640px] flex-col items-center gap-6 rounded-[24px] border border-border-default bg-bg-surface px-6 py-12 md:px-12">{children}</div>;
}
