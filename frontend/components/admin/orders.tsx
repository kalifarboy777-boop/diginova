"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCircle2, ChevronRight, Clock, RefreshCw, ShieldCheck, Undo2, X, XCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge, Table, Td, Th } from "@/components/ui/data";
import { Textarea } from "@/components/ui/field";
import { EmptyState, Pill, Skeleton } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { date, fcfa, fcfaShort, time } from "@/lib/format";
import { useMe } from "@/lib/session";
import type { Order } from "@/lib/types";
import { type OrderRow, WebhookBadge } from "./dashboard";

type Detail = {
  order: Order;
  row: OrderRow;
  customer: { name: string | null; email: string; phone: string | null };
  payment: { provider: string; reference: string; status: string; webhook: string | null; attempts: number; verified_at: string | null; method_label: string } | null;
  timeline: { label: string; detail: string | null; level: string; at: string }[];
  download_link: string;
  refund_requests: { id: number; reason: string; status: string }[];
  audit: { action: string; actor: string | null; at: string }[];
};

const TABS: [string, string][] = [
  ["", "Toutes"],
  ["PAID", "Payées"],
  ["PENDING", "En attente"],
  ["FAILED", "Échouées"],
  ["NEEDS_REVIEW", "À vérifier"],
  ["REFUNDED", "Remboursées"],
];

/** Écran 52 — commandes & paiements (liste filtrable + détail avec chronologie et actions journalisées). */
export function AdminOrders() {
  const params = useSearchParams();
  const [status, setStatus] = React.useState(params.get("statut") ?? "");
  const [q, setQ] = React.useState(params.get("q") ?? "");
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<number | null>(params.get("commande") ? Number(params.get("commande")) : null);
  const { data } = useQuery({
    queryKey: ["admin", "orders", status, q, page],
    queryFn: () => api<{ counts: Record<string, number>; data: OrderRow[]; meta: { total: number; page: number; last_page: number } }>("/admin/orders", { query: { status: status || undefined, q: q || undefined, page } }),
    placeholderData: (p) => p,
  });
  React.useEffect(() => {
    if (selected === null && data?.data[0] && window.matchMedia("(min-width: 1280px)").matches) setSelected(data.data[0].id);
  }, [data, selected]);

  if (!data) return <Skeleton className="h-[600px] rounded-card" />;
  const n = (k: string) => (k ? data.counts[k] : data.counts.all) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="-mx-5 flex flex-1 gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0">
          {TABS.map(([v, l]) => (
            <Pill
              key={v}
              active={status === v}
              onClick={() => {
                setStatus(v);
                setPage(1);
              }}
              className={cn("h-8 px-3 text-label-sm", v === "NEEDS_REVIEW" && n(v) > 0 && status !== v && "border-danger bg-danger text-white hover:text-white")}
            >
              {l} ({n(v).toLocaleString("fr-FR").replace(/ /g, " ")})
            </Pill>
          ))}
        </div>
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Commande, client, produit…" aria-label="Rechercher une commande" className="h-10 w-full rounded-btn border border-border-default bg-bg-surface px-3.5 text-body-sm outline-none focus:border-brand-primary sm:w-64" />
      </div>
      <div className={cn("grid gap-6", selected && "xl:grid-cols-[1fr_400px]")}>
        <div className="min-w-0 overflow-hidden rounded-card border border-border-default bg-bg-surface">
          {data.data.length === 0 ? (
            <EmptyState icon={<Clock />} title="Aucune commande" />
          ) : (
            <>
              <Table>
                <thead>
                  <tr>
                    {["Commande", "Client", "Montant", "Moyen", "Réf. prestataire", "Webhook", ...(selected ? [] : ["Statut"]), ""].map((h) => (
                      <Th key={h}>{h}</Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((o) => (
                    <tr key={o.id} onClick={() => setSelected(o.id)} className={cn("cursor-pointer", selected === o.id ? "bg-brand-subtle" : "hover:bg-bg-page")}>
                      <Td className="text-label-sm whitespace-nowrap text-brand-primary">{o.number}</Td>
                      <Td className="whitespace-nowrap">{o.customer}</Td>
                      <Td className="whitespace-nowrap">{fcfaShort(o.total)}</Td>
                      <Td className="whitespace-nowrap">{o.method === "CARD" ? "Carte" : o.method_label}</Td>
                      <Td className="font-mono text-caption text-text-tertiary">{o.provider_ref ?? "—"}</Td>
                      <Td>
                        <WebhookBadge value={o.webhook} attempts={o.attempts} />
                      </Td>
                      {!selected && (
                        <Td>
                          <StatusBadge status={o.status} />
                        </Td>
                      )}
                      <Td>
                        <ChevronRight className="size-4 text-text-tertiary" />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <div className="flex items-center justify-between px-5 py-4 text-body-sm text-text-secondary">
                Page {data.meta.page} / {data.meta.last_page} · {data.meta.total} commandes
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
        {selected && <OrderPanel id={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}

function OrderPanel({ id, onClose }: { id: number; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useMe();
  const isAdmin = user?.role === "ADMIN";
  const { data: d } = useQuery({ queryKey: ["admin", "order", id], queryFn: () => api<Detail>(`/admin/orders/${id}`) });
  const [busy, setBusy] = React.useState<string | null>(null);
  const [markOpen, setMarkOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");

  const act = async (path: string, label: string, body?: object) => {
    setBusy(path);
    try {
      const r = await api<Detail & { result?: string }>(`/admin/orders/${id}/${path}`, { method: "POST", body });
      qc.setQueryData(["admin", "order", id], r);
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      qc.invalidateQueries({ queryKey: ["nav", "admin"] });
      toast.success(r.result ? `${label} : ${r.result}` : label);
      setMarkOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? (Object.values(e.errors)[0]?.[0] ?? e.message) : "Action impossible");
    } finally {
      setBusy(null);
    }
  };

  if (!d) return <Skeleton className="h-[640px] rounded-card" />;
  const o = d.order;
  const closed = ["PAID", "REFUNDED"].includes(o.status);
  const icon = (level: string) =>
    level === "danger" ? <XCircle className="size-5 text-danger" /> : level === "warning" ? <RefreshCw className="size-5 text-warning" /> : <CheckCircle2 className="size-5 text-success" />;

  return (
    <aside className="flex flex-col gap-5 self-start rounded-card border border-border-default bg-bg-surface p-6 xl:sticky xl:top-6">
      <div className="flex items-start justify-between">
        <h2 className="text-h4">{o.number}</h2>
        <button type="button" onClick={onClose} aria-label="Fermer" className="rounded p-1 text-text-tertiary hover:bg-bg-subtle">
          <X className="size-5" />
        </button>
      </div>
      <span className="self-start">
        <StatusBadge status={o.status} label={o.status === "NEEDS_REVIEW" ? `À vérifier · ${d.payment?.webhook?.toLowerCase() ?? ""}` : undefined} />
      </span>
      <dl className="flex flex-col gap-3 text-body-sm">
        {[
          ["Client", `${d.customer.name ?? ""} · ${d.customer.email}`],
          ["Produit", o.items.map((i) => i.title.split(" —")[0]).join(", ")],
          ["Montant", `${fcfa(o.total)} · ${o.payment_method_label ?? ""}`],
          ["Créée le", `${date(o.created_at)} · ${time(o.created_at, true)}`],
          ...(d.payment ? [["Réf. prestataire", `${d.payment.provider} · ${d.payment.reference}`]] : []),
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt className="shrink-0 text-text-secondary">{k}</dt>
            <dd className="text-right text-label-sm break-all text-text-primary">{v}</dd>
          </div>
        ))}
      </dl>
      <div>
        <h3 className="mb-3 text-label">Chronologie</h3>
        <ol className="flex flex-col">
          {d.timeline.map((e, i) => (
            <li key={i} className="relative flex gap-3 pb-4">
              {i < d.timeline.length && <span className="absolute top-6 left-[9.5px] h-[calc(100%-16px)] w-px bg-border-default" aria-hidden />}
              <span className="relative bg-bg-surface">{icon(e.level)}</span>
              <span className="flex flex-col">
                <span className="text-label-sm text-text-primary">{e.label}</span>
                <span className={cn("text-caption", e.level === "danger" ? "text-danger" : "text-text-tertiary")}>{e.detail && e.label !== "Commande créée" ? e.detail : time(e.at, true)}</span>
              </span>
            </li>
          ))}
          <li className="flex gap-3">
            <span>{d.download_link === "Généré" ? <CheckCircle2 className="size-5 text-success" /> : <RefreshCw className="size-5 text-text-tertiary" />}</span>
            <span className="flex flex-col">
              <span className={cn("text-label-sm", d.download_link === "Généré" ? "text-text-primary" : "text-text-tertiary")}>Lien de téléchargement</span>
              <span className="text-caption text-text-tertiary">{d.download_link}</span>
            </span>
          </li>
        </ol>
      </div>
      {d.refund_requests.some((r) => r.status === "REQUESTED") && <p className="rounded-md bg-warning-subtle px-4 py-3 text-body-sm text-warning">Demande de remboursement : « {d.refund_requests[0].reason} »</p>}
      {isAdmin ? (
        <div className="flex flex-col gap-3">
          {!closed && (
            <Button block loading={busy === "counter-verify"} onClick={() => act("counter-verify", "Contre-vérification")}>
              <ShieldCheck /> Contre-vérifier auprès du prestataire
            </Button>
          )}
          <div className="grid grid-cols-2 gap-3">
            {!closed && (
              <Button variant="secondary" onClick={() => setMarkOpen(true)}>
                <Check /> Marquer payée
              </Button>
            )}
            {!closed && (
              <Button variant="danger-soft" loading={busy === "cancel"} onClick={() => act("cancel", "Commande annulée")}>
                <X /> Annuler
              </Button>
            )}
            {o.status === "PAID" && (
              <Button variant="danger-soft" className="col-span-2" loading={busy === "refund"} onClick={() => act("refund", "Commande remboursée")}>
                <Undo2 /> Rembourser et révoquer l’accès
              </Button>
            )}
          </div>
          <p className="flex items-center gap-2 rounded-md bg-bg-page px-4 py-3 text-caption text-text-secondary">
            <ShieldCheck className="size-4 shrink-0" /> Toute action manuelle est journalisée avec votre identifiant.
          </p>
          {d.audit.length > 0 && (
            <ul className="flex flex-col gap-1 text-caption text-text-tertiary">
              {d.audit.map((a, i) => (
                <li key={i}>
                  {date(a.at)} {time(a.at)} · {a.actor} · {a.action}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="rounded-md bg-bg-page px-4 py-3 text-caption text-text-secondary">Les actions sur les paiements sont réservées aux administrateurs.</p>
      )}
      <Dialog open={markOpen} onOpenChange={setMarkOpen}>
        <DialogContent title="Marquer la commande payée" description="À n’utiliser qu’après avoir vérifié l’encaissement dans l’interface du prestataire. Les fichiers seront livrés immédiatement.">
          <div className="flex flex-col gap-4">
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Justification (référence vérifiée chez le prestataire, échange avec le client…)" />
            <Button block disabled={reason.trim().length < 5} loading={busy === "mark-paid"} onClick={() => act("mark-paid", "Commande marquée payée", { reason })}>
              Confirmer et livrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
