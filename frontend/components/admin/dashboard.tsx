"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Box, ChevronRight, CreditCard, Star, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { DualRevenue, Legend } from "@/components/dashboard/charts";
import { StatusBadge, Table, Td, Th } from "@/components/ui/data";
import { Segmented, Skeleton } from "@/components/ui/misc";
import { methodColor } from "@/components/ui/payment";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { date, fcfaShort, num, rating } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

export type OrderRow = { id: number; number: string; customer: string; email: string; total: number; method: PaymentMethod | null; method_label: string | null; provider_ref: string | null; webhook: string; attempts: number; status: string; status_label: string; created_at: string };

type D = {
  today: string;
  kpis: Record<string, number | null>;
  chart: { label: string; diginova: number; creators: number }[];
  latest: OrderRow[];
  alerts: { id: number | null; title: string; detail: string | null; level: string; href: string | null }[];
  methods: { method: PaymentMethod; label: string; percent: number }[];
  categories: { name: string; total: number; percent: number }[];
};

export function WebhookBadge({ value, attempts }: { value: string; attempts?: number }) {
  const ok = ["Vérifié", "Signature OK", "Validé manuellement"].includes(value);
  const bad = value.includes("Échec") || value.includes("Montant") || value === "Refusé";
  const wait = value === "En attente";
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-label-sm whitespace-nowrap", ok ? "bg-success-subtle text-success" : bad ? "bg-danger-subtle text-danger" : wait ? "bg-warning-subtle text-warning" : "bg-bg-subtle text-text-secondary")}>
      {value}
      {bad && attempts && attempts > 1 ? ` · ${attempts} essais` : ""}
    </span>
  );
}

function Kpi({ label, value, change, unit = "%", invert }: { label: string; value: string; change: number | null; unit?: string; invert?: boolean }) {
  const up = (change ?? 0) >= 0;
  const good = invert ? !up : up;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border-default bg-bg-surface p-[18px]">
      <span className="text-body-sm text-text-secondary">{label}</span>
      <span className="font-display text-[26px] leading-8 font-bold text-text-primary">{value}</span>
      {change !== null && (
        <span className={cn("inline-flex items-center gap-1 text-caption", good ? "text-success" : "text-danger")}>
          {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
          {up ? "+" : ""}
          {String(change).replace(".", ",")} {unit}
        </span>
      )}
    </div>
  );
}

/** Écran 50 — pilotage. */
export function AdminDashboard() {
  const [range, setRange] = React.useState<"1" | "7" | "30" | "365">("30");
  const { data: d } = useQuery({ queryKey: ["admin", "dashboard", range], queryFn: () => api<D>("/admin/dashboard", { query: { range } }), placeholderData: (p) => p, refetchInterval: 60_000 });
  const period = { "1": "24 dernières heures", "7": "7 derniers jours", "30": "30 derniers jours", "365": "12 derniers mois" }[range];

  return (
    <div className="flex flex-col gap-6">
      <div className="-mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-lg text-text-secondary">
          Aujourd’hui {date(new Date())} · données des {period}
        </p>
        <Segmented value={range} onChange={setRange} options={[{ value: "1", label: "24 h" }, { value: "7", label: "7 j" }, { value: "30", label: "30 j" }, { value: "365", label: "12 mois" }]} />
      </div>
      {!d ? (
        <Skeleton className="h-[700px] rounded-card" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label="Chiffre d’affaires" value={fcfaShort(d.kpis.revenue ?? 0)} change={d.kpis.revenue_change} unit="% vs mois préc." />
            <Kpi label="Commandes" value={num(d.kpis.orders ?? 0)} change={d.kpis.orders_change} />
            <Kpi label="Réussite paiement" value={`${rating(d.kpis.success_rate ?? 0)} %`} change={d.kpis.success_rate_change} unit="pt" />
            <Kpi label="Paiement → fichier" value={`${d.kpis.delivery_seconds ?? 0} s`} change={d.kpis.delivery_change} unit="s" invert />
            <Kpi label="Nouveaux clients" value={num(d.kpis.new_clients ?? 0)} change={d.kpis.new_clients_change} />
            <Kpi label="Remboursements" value={`${rating(d.kpis.refund_rate ?? 0)} %`} change={d.kpis.refund_rate_change} unit="pt" invert />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <div className="flex min-w-0 flex-col gap-6">
              <section className="rounded-card border border-border-default bg-bg-surface p-6">
                <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2">
                  <h2 className="text-h4">Chiffre d’affaires journalier (FCFA)</h2>
                  <Legend items={[{ label: "Ventes DigiNova", color: "#635BFF" }, { label: "Ventes créateurs", color: "#16A34A" }]} />
                </div>
                <DualRevenue data={d.chart} />
              </section>
              <section className="rounded-card border border-border-default bg-bg-surface p-6">
                <div className="mb-3 flex items-center gap-4">
                  <h2 className="text-h4">Dernières commandes</h2>
                  <Link href="/admin/paiements" className="text-label-sm text-brand-primary hover:underline">
                    Voir toutes
                  </Link>
                </div>
                <Table>
                  <thead>
                    <tr>
                      {["Commande", "Client", "Montant", "Moyen", "Webhook", "Statut"].map((h) => (
                        <Th key={h} className="bg-transparent px-0 pr-3 text-caption font-medium tracking-normal normal-case first:pl-0">
                          {h}
                        </Th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {d.latest.map((o) => (
                      <tr key={o.id}>
                        <Td className="pl-0 first:pl-0">
                          <Link href={`/admin/paiements?commande=${o.id}`} className="text-label-sm text-brand-primary hover:underline">
                            {o.number}
                          </Link>
                        </Td>
                        <Td className="px-0 pr-3">{o.customer}</Td>
                        <Td className="px-0 pr-3 whitespace-nowrap">{fcfaShort(o.total)}</Td>
                        <Td className="px-0 pr-3 whitespace-nowrap">{o.method === "CARD" ? "Carte" : o.method_label}</Td>
                        <Td className="px-0 pr-3">
                          <WebhookBadge value={o.webhook} attempts={o.attempts} />
                        </Td>
                        <Td className="px-0">
                          <StatusBadge status={o.status} />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </section>
            </div>

            <div className="flex flex-col gap-6">
              <section className="rounded-card border border-border-default bg-bg-surface p-6">
                <h2 className="mb-4 flex items-center gap-2 text-h4">
                  Alertes <span className="rounded-full bg-danger px-2 py-0.5 text-label-sm text-white">{d.alerts.length}</span>
                </h2>
                <ul className="flex flex-col gap-3">
                  {d.alerts.map((a, i) => {
                    const Icon = a.href?.includes("produits") ? Box : a.href?.includes("createurs") ? Star : a.title.toLowerCase().includes("orange") ? CreditCard : AlertTriangle;
                    const tone = a.level === "danger" ? "bg-danger-subtle text-danger" : a.level === "info" ? "bg-brand-subtle text-brand-primary" : "bg-warning-subtle text-warning";
                    const content = (
                      <>
                        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-sm", tone)}>
                          <Icon className="size-[18px]" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="text-label-sm text-text-primary">{a.title}</span>
                          {a.detail && <span className="text-caption text-text-tertiary">{a.detail}</span>}
                        </span>
                        <ChevronRight className="size-4 text-text-tertiary" />
                      </>
                    );
                    return (
                      <li key={i}>
                        <Link href={a.href ?? "/admin/paiements?statut=NEEDS_REVIEW"} className="flex items-center gap-3 rounded-md bg-bg-page px-4 py-3 hover:bg-bg-subtle">
                          {content}
                        </Link>
                      </li>
                    );
                  })}
                  {d.alerts.length === 0 && <li className="text-body-sm text-text-secondary">Aucune alerte.</li>}
                </ul>
              </section>
              <section className="rounded-card border border-border-default bg-bg-surface p-6">
                <h2 className="mb-5 text-h4">Répartition des paiements</h2>
                <ul className="flex flex-col gap-4">
                  {d.methods.map((m) => (
                    <li key={m.method} className="flex flex-col gap-1.5">
                      <span className="flex justify-between text-body-sm text-text-primary">
                        {m.label} <span className="text-label-sm">{m.percent} %</span>
                      </span>
                      <span className="h-2 overflow-hidden rounded-full bg-bg-subtle">
                        <span className="block h-full rounded-full" style={{ width: `${m.percent}%`, background: methodColor(m.method) }} />
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="rounded-card border border-border-default bg-bg-surface p-6">
                <h2 className="mb-4 text-h4">Top catégories</h2>
                <ul className="flex flex-col gap-3">
                  {d.categories.map((c) => (
                    <li key={c.name} className="flex items-center justify-between text-body-sm">
                      <span>{c.name}</span>
                      <span className="text-label-sm">
                        {fcfaShort(c.total)} <span className="text-text-tertiary">· {c.percent} %</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
