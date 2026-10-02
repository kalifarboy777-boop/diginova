"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, CircleHelp, Download, FileText, MessageSquare, RefreshCw, Search, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge, Table, Td, Th } from "@/components/ui/data";
import { Textarea } from "@/components/ui/field";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { Drawer } from "@/components/ui/overlay";
import { methodColor } from "@/components/ui/payment";
import { api, ApiError, download } from "@/lib/api";
import { date, fcfa, fcfaShort, time } from "@/lib/format";
import type { Order, Paginated } from "@/lib/types";

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="relative inline-flex h-[38px] items-center rounded-btn border border-border-default bg-bg-surface pr-9 pl-3.5 text-label-sm">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="appearance-none bg-transparent outline-none [field-sizing:content]">
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {label} : {l}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 size-4 text-text-secondary" />
    </label>
  );
}

/** Écran 32 — commandes & factures (filtres, export CSV, détail en tiroir). */
export function OrdersView() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [period, setPeriod] = React.useState("365");
  const [method, setMethod] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [open, setOpen] = React.useState<Order | null>(null);
  const query = { q: q || undefined, status: status || undefined, period, method: method || undefined, page };
  const { data, refetch } = useQuery({ queryKey: ["orders", query], queryFn: () => api<Paginated<Order>>("/account/orders", { query }) });

  const action = (o: Order) => {
    if (o.status === "PAID" || o.status === "REFUNDED")
      return (
        <Button variant="secondary" size="sm" onClick={() => download(`/account/orders/${o.id}/invoice`, `facture-${o.number}.pdf`)}>
          <Download /> Facture
        </Button>
      );
    if (o.status === "FAILED" || o.status === "EXPIRED")
      return (
        <Button
          variant="soft"
          size="sm"
          onClick={async () => {
            try {
              await api(`/orders/${o.id}/retry`, { method: "POST" });
              router.push(`/checkout/${o.id}/attente`);
            } catch (e) {
              toast.error(e instanceof ApiError ? e.message : "Erreur");
            }
          }}
        >
          <RefreshCw /> Réessayer
        </Button>
      );
    return (
      <Button variant="soft" size="sm" onClick={() => router.push(`/checkout/${o.id}/attente`)}>
        Vérifier
      </Button>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={(e) => e.preventDefault()} className="flex h-[42px] w-full items-center gap-2.5 rounded-btn border border-border-default bg-bg-surface px-3.5 sm:w-[300px]">
          <Search className="size-4 text-text-tertiary" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="N° de commande ou produit" aria-label="Rechercher une commande" className="min-w-0 flex-1 bg-transparent text-body-sm outline-none" />
        </form>
        <FilterSelect label="Statut" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[["", "tous"], ["PAID", "payées"], ["PENDING", "en attente"], ["FAILED", "échouées"], ["REFUNDED", "remboursées"]]} />
        <FilterSelect label="Période" value={period} onChange={(v) => { setPeriod(v); setPage(1); }} options={[["30", "30 derniers jours"], ["90", "3 derniers mois"], ["365", "12 derniers mois"], ["all", "tout"]]} />
        <FilterSelect label="Paiement" value={method} onChange={(v) => { setMethod(v); setPage(1); }} options={[["", "tous"], ["WAVE", "Wave"], ["ORANGE_MONEY", "Orange Money"], ["MTN_MOMO", "MTN MoMo"], ["MOOV_MONEY", "Moov Money"], ["CARD", "Carte"]]} />
        <Button variant="secondary" size="sm" className="ml-auto h-[38px]" onClick={() => download(`/account/orders/export?period=${period}`, "commandes-diginova.csv")}>
          <Download /> Exporter (CSV)
        </Button>
      </div>

      <div className="overflow-hidden rounded-card border border-border-default bg-bg-surface">
        {!data ? (
          <div className="flex flex-col gap-3 p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : data.data.length === 0 ? (
          <EmptyState icon={<FileText />} title="Aucune commande" text="Aucune commande ne correspond à ces filtres." />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  {["Commande", "Date", "Produits", "Paiement", "Montant", "Statut", ""].map((h) => (
                    <Th key={h}>{h}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.data.map((o) => (
                  <tr key={o.id} className="hover:bg-bg-page">
                    <Td>
                      <button type="button" onClick={() => setOpen(o)} className="text-label text-brand-primary hover:underline">
                        {o.number}
                      </button>
                    </Td>
                    <Td className="whitespace-nowrap">{date(o.created_at)}</Td>
                    <Td className="max-w-[220px] truncate">{o.summary}</Td>
                    <Td className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ background: methodColor(o.payment_method) }} />
                        {o.payment_method === "CARD" ? "Carte" : o.payment_method_label}
                      </span>
                    </Td>
                    <Td className="text-label whitespace-nowrap">{fcfaShort(o.total)}</Td>
                    <Td>
                      <StatusBadge status={o.status} />
                    </Td>
                    <Td className="text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        {action(o)}
                        <button type="button" onClick={() => setOpen(o)} aria-label={`Détail de ${o.number}`} className="rounded p-1 text-text-tertiary hover:bg-bg-subtle">
                          <ChevronRight className="size-4" />
                        </button>
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <p className="text-body-sm text-text-secondary">
                Affichage de {data.meta.from} à {data.meta.to} sur {data.meta.total} commandes
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Précédent
                </Button>
                <Button variant="secondary" size="sm" disabled={page >= data.meta.last_page} onClick={() => setPage((p) => p + 1)}>
                  Suivant
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
      <p className="flex items-center gap-3 rounded-lg bg-brand-subtle px-5 py-4 text-body-sm text-brand-primary">
        <CircleHelp className="size-[18px] shrink-0" /> Un problème avec une commande ? Ouvrez un ticket depuis le détail de la commande : le numéro sera joint automatiquement.
      </p>
      {open && <OrderDrawer order={open} onClose={() => setOpen(null)} onChange={refetch} />}
    </div>
  );
}

function OrderDrawer({ order: o, onClose, onChange }: { order: Order; onClose: () => void; onChange: () => void }) {
  const [refund, setRefund] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const withinGuarantee = o.paid_at && Date.now() - new Date(o.paid_at).getTime() < 7 * 864e5;
  return (
    <Drawer
      open
      onOpenChange={(v) => !v && onClose()}
      title={`Commande ${o.number}`}
      subtitle={`${date(o.created_at)} · ${time(o.created_at)}`}
      footer={
        <div className="flex flex-wrap gap-2">
          {(o.status === "PAID" || o.status === "REFUNDED") && (
            <Button variant="secondary" onClick={() => download(`/account/orders/${o.id}/invoice`, `facture-${o.number}.pdf`)}>
              <Download /> Facture PDF
            </Button>
          )}
          <Button asChild variant="secondary">
            <Link href={`/compte/support?nouveau=1&commande=${o.number}`}>
              <MessageSquare /> Ouvrir un ticket
            </Link>
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <StatusBadge status={o.status} />
          <span className="text-body-sm text-text-secondary">{o.payment_method_label}</span>
        </div>
        <ul className="flex flex-col divide-y divide-border-default rounded-md border border-border-default">
          {o.items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-3 px-4 py-3 text-body-sm">
              <span className="flex flex-col">
                <span className="text-label-sm">{it.title}</span>
                <span className="text-caption text-text-tertiary">{it.bundle ? `Pack ${it.bundle}` : it.license === "COMMERCIAL" ? "Licence commerciale" : "Licence personnelle"}</span>
              </span>
              <span className="text-label-sm">{fcfaShort(it.list_price)}</span>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-2 text-body-sm">
          <div className="flex justify-between">
            <dt className="text-text-secondary">Sous-total</dt>
            <dd>{fcfa(o.subtotal)}</dd>
          </div>
          {o.discount > 0 && (
            <div className="flex justify-between text-success">
              <dt>Réduction {o.coupon}</dt>
              <dd>- {fcfa(o.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between text-label">
            <dt>Total</dt>
            <dd>{fcfa(o.total)}</dd>
          </div>
        </dl>
        {o.status === "PAID" && withinGuarantee && (
          <div className="flex flex-col gap-3 rounded-md border border-border-default p-4">
            {!refund ? (
              <button type="button" onClick={() => setRefund(true)} className="inline-flex items-center gap-2 text-label text-brand-primary">
                <Undo2 className="size-4" /> Demander un remboursement (garantie 7 jours)
              </button>
            ) : (
              <form
                className="flex flex-col gap-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const r = await api<{ message: string }>(`/account/orders/${o.id}/refund`, { method: "POST", body: { reason } });
                    toast.success(r.message);
                    onChange();
                    onClose();
                  } catch (err) {
                    toast.error(err instanceof ApiError ? (err.field("reason") ?? err.message) : "Erreur");
                  }
                }}
              >
                <label htmlFor="refund-reason" className="text-label">
                  Motif
                </label>
                <Textarea id="refund-reason" required minLength={10} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Fichier défectueux, non conforme à la description…" />
                <Button type="submit">Envoyer la demande</Button>
              </form>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}
