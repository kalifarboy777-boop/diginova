"use client";

import { AlertCircle, MessageSquare, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { PaymentChips } from "@/components/ui/payment";
import { api, ApiError } from "@/lib/api";
import type { OrderStatusPayload } from "@/lib/types";
import { ChangeMethodDialog } from "./change-method";

/** Écran 24 — paiement échoué : causes fréquentes, nouvel essai, autre moyen. */
export function Failure({ orderId }: { orderId: number }) {
  const router = useRouter();
  const [s, setS] = React.useState<OrderStatusPayload | null>(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    api<OrderStatusPayload>(`/orders/${orderId}/status`).then((r) => {
      setS(r);
      if (r.status === "PAID") router.replace(`/checkout/${orderId}/succes`);
    });
  }, [orderId, router]);

  if (!s) return <Skeleton className="mx-auto h-[600px] max-w-[640px] rounded-[24px]" />;
  const expired = s.status === "EXPIRED";

  return (
    <div className="mx-auto flex max-w-[640px] flex-col items-center gap-6 rounded-[24px] border border-border-default bg-bg-surface px-6 py-12 md:px-12">
      <span className="flex size-32 items-center justify-center rounded-full bg-danger-subtle text-danger">
        <X className="size-12" strokeWidth={2.5} />
      </span>
      <h1 className="text-center text-h3 md:text-h2" aria-live="assertive">
        {expired ? "Le délai de paiement est dépassé" : "Le paiement n’a pas abouti"}
      </h1>
      <p className="text-center text-body-lg text-text-secondary">Aucun montant n’a été débité. Votre panier est conservé.</p>
      <div className="w-full rounded-lg bg-bg-page p-5">
        <p className="mb-3 text-label text-text-primary">Causes fréquentes</p>
        <ul className="flex flex-col gap-2.5 text-body text-text-secondary">
          {["Solde Mobile Money insuffisant", "Demande non validée dans les 5 minutes", "Code secret incorrect ou opération annulée"].map((c) => (
            <li key={c} className="flex items-center gap-2.5">
              <AlertCircle className="size-4 text-warning" /> {c}
            </li>
          ))}
        </ul>
      </div>
      <Button
        size="lg"
        block
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await api<{ redirect_url: string | null }>(`/orders/${orderId}/retry`, { method: "POST" });
            if (s.method === "CARD" && r.redirect_url) window.location.href = `${r.redirect_url}?retour=/checkout/${orderId}/attente`;
            else router.push(`/checkout/${orderId}/attente`);
          } catch (e) {
            toast.error(e instanceof ApiError ? e.message : "Impossible de relancer.");
            setBusy(false);
          }
        }}
      >
        <RefreshCw /> Réessayer avec {s.method_label}
      </Button>
      <ChangeMethodDialog orderId={orderId} current={s.method} phone={s.payment_phone} trigger={<Button variant="secondary" size="lg" block>Choisir un autre moyen de paiement</Button>} />
      <PaymentChips className="justify-center" />
      <Link href="https://wa.me/2250700000000" className="inline-flex items-center gap-2 text-label text-brand-primary hover:underline">
        <MessageSquare className="size-4" /> Besoin d’aide ? Écrivez-nous sur WhatsApp
      </Link>
    </div>
  );
}
