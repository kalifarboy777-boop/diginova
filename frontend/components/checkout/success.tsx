"use client";

import { Book, Check, Download, KeyRound, ShieldCheck } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";
import { ProductCover } from "@/components/product/product-cover";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { track } from "@/lib/analytics";
import { api, ApiError } from "@/lib/api";
import { downloadFile } from "@/lib/download";
import { fcfa, fileSize } from "@/lib/format";
import { useRefreshSession } from "@/lib/session";
import type { LibraryItem, Order } from "@/lib/types";

type Summary = { order: Order; library: LibraryItem[]; account: { email: string; first_name: string | null; needs_password: boolean; logged_in: boolean } };

/** Écran 23 (desktop) / 64 (mobile) — paiement confirmé, téléchargements. */
export function Success({ orderId }: { orderId: number }) {
  const [d, setD] = React.useState<Summary | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);
  const refresh = useRefreshSession();

  React.useEffect(() => {
    api<Summary>(`/orders/${orderId}/summary`)
      .then((r) => {
        setD(r);
        if (r.order.status === "PAID") track("purchase", { value: r.order.total, transaction_id: r.order.number });
        refresh();
      })
      .catch((e) => setError(e instanceof ApiError && e.status === 404 ? "Commande introuvable sur cet appareil. Retrouvez vos achats dans votre bibliothèque." : "Erreur de chargement."));
  }, [orderId, refresh]);

  if (error)
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
        <p className="text-body-lg text-text-secondary">{error}</p>
        <Button asChild>
          <Link href="/compte/bibliotheque">Ouvrir ma bibliothèque</Link>
        </Button>
      </div>
    );
  if (!d)
    return (
      <div className="mx-auto flex max-w-[960px] flex-col items-center gap-6">
        <Skeleton className="size-[120px] rounded-full" />
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-32 w-full rounded-card" />
      </div>
    );

  const o = d.order;
  const totalSize = d.library.reduce((a, li) => a + (li.files ?? []).reduce((b, f) => b + f.size, 0), 0);

  if (o.status !== "PAID")
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
        <h1 className="text-h2">Paiement non confirmé</h1>
        <p className="text-body-lg text-text-secondary">Cette commande n’est pas encore payée.</p>
        <Button asChild>
          <Link href={`/checkout/${orderId}/attente`}>Suivre le paiement</Link>
        </Button>
      </div>
    );

  return (
    <div className="mx-auto flex max-w-[960px] flex-col items-center gap-6">
      <span className="flex size-[120px] items-center justify-center rounded-full bg-success-subtle text-success">
        <Check className="size-12" strokeWidth={2.5} />
      </span>
      <h1 className="text-center text-h2 md:text-[40px] md:leading-[48px] md:font-extrabold md:tracking-[-0.015em]" aria-live="polite">
        Paiement confirmé{d.account.first_name ? `, merci ${d.account.first_name}` : ", merci"} !
      </h1>
      <p className="text-center text-body-lg text-text-secondary">
        Commande {o.number} · {fcfa(o.total)} payés avec {o.payment_method_label} · facture envoyée à {o.email}
      </p>
      <div className="mt-4 flex w-full flex-col gap-4">
        {d.library.map((li) => {
          const files = li.files ?? [];
          const formats = [...new Set(files.map((f) => f.format))].join(", ");
          return (
            <div key={li.id} className="flex flex-col gap-4 rounded-card border border-border-default bg-bg-surface p-5 sm:flex-row sm:items-center">
              <span className="h-[90px] w-[120px] shrink-0 overflow-hidden rounded-md">
                <ProductCover type={li.product.cover_type} rounded={false} />
              </span>
              <div className="flex flex-1 flex-col gap-2">
                <p className="text-h4 text-text-primary">{li.product.title}</p>
                <p className="flex flex-wrap items-center gap-2.5 text-body-sm text-text-secondary">
                  <span className="rounded-full bg-bg-subtle px-2.5 py-0.5 text-label-sm">
                    {files.length} fichier{files.length > 1 ? "s" : ""} · {formats}
                  </span>
                  {fileSize(files.reduce((a, f) => a + f.size, 0))} · Licence {li.license_label.toLowerCase()}
                </p>
              </div>
              <Button size="lg" onClick={() => downloadFile(li.id)}>
                <Download /> Télécharger
              </Button>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {d.library.length > 1 && (
          <Button variant="dark" onClick={async () => { for (const li of d.library) await downloadFile(li.id); }}>
            <Download /> Tout télécharger ({fileSize(totalSize)})
          </Button>
        )}
        <Button asChild variant="secondary">
          <Link href={d.account.logged_in ? "/compte/bibliotheque" : "/connexion?suite=/compte/bibliotheque"}>
            <Book /> Ouvrir ma bibliothèque
          </Link>
        </Button>
      </div>
      <p className="flex w-full items-center gap-3 rounded-md bg-brand-subtle px-5 py-3.5 text-body-sm text-brand-primary">
        <ShieldCheck className="size-[18px] shrink-0" /> Liens sécurisés valables 15 minutes, régénérables à tout moment depuis votre bibliothèque (10 téléchargements par achat).
      </p>
      {d.account.needs_password && (
        <div className="flex w-full flex-col gap-4 rounded-card border border-border-default bg-bg-surface p-6 sm:flex-row sm:items-center">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-warning-subtle text-warning">
            <KeyRound className="size-5" />
          </span>
          <div className="flex flex-1 flex-col">
            <p className="text-label text-text-primary">Votre compte a été créé</p>
            <p className="text-body-sm text-text-secondary">Choisissez un mot de passe pour accéder à vos achats depuis n’importe quel appareil.</p>
          </div>
          <Button
            variant="secondary"
            disabled={sent}
            onClick={async () => {
              const r = await api<{ message: string }>(`/orders/${orderId}/password-link`, { method: "POST" });
              setSent(true);
              toast.success(r.message);
            }}
          >
            {sent ? "Lien envoyé par email" : "Définir un mot de passe"}
          </Button>
        </div>
      )}
    </div>
  );
}
