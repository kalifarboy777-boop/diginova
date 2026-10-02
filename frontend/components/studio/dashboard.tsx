"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ChevronRight, Clock, Eye, MessageSquare, ShoppingBag, Star, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { RevenueBars } from "@/components/dashboard/charts";
import { ProductCover } from "@/components/product/product-cover";
import { Button } from "@/components/ui/button";
import { StatCard, Table, Td, Th } from "@/components/ui/data";
import { Avatar, Segmented, Skeleton } from "@/components/ui/misc";
import { api } from "@/lib/api";
import { ago, fcfa, fcfaShort, num, rating } from "@/lib/format";
import type { CoverType } from "@/lib/types";

type D = {
  month: string;
  kpis: { net: number; net_change: number | null; sales: number; sales_change: number; conversion: number; rating: number; rating_count: number };
  chart: { points: { label: string; value: number }[]; total: number; change: number | null };
  top: { id: number; title: string; slug: string; cover_type: CoverType; sales: number; revenue: number; conversion: number; rating: number }[];
  balance: { available: number; pending: number };
  todo: { pending: string[]; unanswered_reviews: number; rejected: { id: number; title: string; rejection_reason: string | null }[] };
  recent: { customer: string; initials: string; product: string; amount: number; paid_at: string }[];
};

const icon = (I: typeof Wallet) => (
  <span className="flex size-9 items-center justify-center rounded-sm bg-brand-subtle text-brand-primary">
    <I className="size-[18px]" />
  </span>
);

/** Écran 41 (desktop) / 67 (mobile) — tableau de bord du studio. */
export function StudioDashboard() {
  const [range, setRange] = React.useState<"7" | "30" | "365">("30");
  const { data: d } = useQuery({ queryKey: ["studio", "dashboard", range], queryFn: () => api<D>("/studio/dashboard", { query: { range } }), placeholderData: (p) => p });
  if (!d)
    return (
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    );
  const k = d.kpis;
  return (
    <div className="flex flex-col gap-6">
      <p className="-mt-5 mb-1 text-body-lg text-text-secondary">Voici les performances de votre boutique en {d.month}.</p>
      <section className="flex flex-col gap-3 rounded-card bg-brand-deep p-5 text-white xl:hidden dark:bg-[#1E1B4B]">
        <p className="text-body-sm text-[#C7D2FE]">Solde disponible</p>
        <p className="font-display text-[32px] leading-10 font-extrabold">{fcfa(d.balance.available)}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="white" size="sm" className="h-10">
            <Link href="/studio/revenus#retrait">
              <Wallet /> Retirer
            </Link>
          </Button>
          <span className="text-body-sm text-[#C7D2FE]">+{fcfaShort(d.balance.pending)} en garantie</span>
        </div>
      </section>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard className="min-h-40 justify-between" label="Revenus nets (30 j)" value={fcfaShort(k.net)} icon={icon(Wallet)} delta={k.net_change !== null ? <span className="inline-flex items-center gap-1"><TrendingUp className="size-3.5" />{k.net_change > 0 ? "+" : ""}{k.net_change} % vs mois préc.</span> : undefined} deltaTone={(k.net_change ?? 0) >= 0 ? "success" : "danger"} />
        <StatCard className="min-h-40 justify-between" label="Ventes (30 j)" value={k.sales} icon={icon(ShoppingBag)} delta={<span className="inline-flex items-center gap-1"><TrendingUp className="size-3.5" />{k.sales_change >= 0 ? "+" : ""}{k.sales_change} ventes</span>} deltaTone={k.sales_change >= 0 ? "success" : "danger"} />
        <StatCard className="min-h-40 justify-between" label="Taux de conversion" value={`${rating(k.conversion)} %`} icon={icon(Eye)} hint="ventes / vues produit" />
        <StatCard className="min-h-40 justify-between" label="Note moyenne" value={`${rating(k.rating)} / 5`} icon={icon(Star)} hint={`sur ${num(k.rating_count)} avis`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="rounded-card border border-border-default bg-bg-surface p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-h4">Revenus nets</h2>
              <Segmented value={range} onChange={setRange} options={[{ value: "7", label: "7 j" }, { value: "30", label: "30 j" }, { value: "365", label: "12 mois" }]} />
            </div>
            <p className="mt-4 mb-5 flex items-center gap-3">
              <span className="text-price-lg md:text-[32px] md:leading-10">{fcfa(d.chart.total)}</span>
              {d.chart.change !== null && <span className={d.chart.change >= 0 ? "rounded-full bg-success-subtle px-2.5 py-1 text-label-sm text-success" : "rounded-full bg-danger-subtle px-2.5 py-1 text-label-sm text-danger"}>{d.chart.change >= 0 ? "+" : ""}{d.chart.change} %</span>}
            </p>
            <RevenueBars data={d.chart.points} />
          </section>

          <section className="rounded-card border border-border-default bg-bg-surface p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-h4">Meilleurs produits</h2>
              <Link href="/studio/statistiques" className="text-label-sm text-brand-primary hover:underline">
                Voir tout
              </Link>
            </div>
            <Table>
              <thead>
                <tr>
                  {["Produit", "Ventes", "Revenus", "Conversion", "Note"].map((h) => (
                    <Th key={h} className="bg-transparent px-0 text-caption font-medium tracking-normal normal-case first:pl-0">
                      {h}
                    </Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.top.map((p) => (
                  <tr key={p.id}>
                    <Td className="pl-0 first:pl-0">
                      <Link href={`/produit/${p.slug}`} className="flex items-center gap-3 text-label hover:underline">
                        <span className="h-9 w-12 shrink-0 overflow-hidden rounded-sm">
                          <ProductCover type={p.cover_type} rounded={false} />
                        </span>
                        {p.title}
                      </Link>
                    </Td>
                    <Td>{p.sales}</Td>
                    <Td className="whitespace-nowrap">{fcfaShort(p.revenue)}</Td>
                    <Td>{rating(p.conversion)} %</Td>
                    <Td className="whitespace-nowrap">{rating(p.rating)} ★</Td>
                  </tr>
                ))}
                {d.top.length === 0 && (
                  <tr>
                    <Td colSpan={5} className="py-8 text-center text-text-secondary">
                      Aucune vente sur la période.
                    </Td>
                  </tr>
                )}
              </tbody>
            </Table>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="hidden flex-col gap-4 rounded-card bg-brand-deep p-6 text-white xl:flex dark:bg-[#1E1B4B]">
            <p className="text-body-sm text-[#C7D2FE]">Solde disponible</p>
            <p className="font-display text-[36px] leading-[44px] font-extrabold tracking-[-0.015em]">{fcfa(d.balance.available)}</p>
            <p className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-caption text-[#E0E7FF]">
              <Clock className="size-4" /> {fcfaShort(d.balance.pending)} en période de garantie (7 jours)
            </p>
            <Button asChild variant="white" block>
              <Link href="/studio/revenus#retrait">
                <Wallet /> Demander un retrait
              </Link>
            </Button>
          </section>

          <section className="rounded-card border border-border-default bg-bg-surface p-6">
            <h2 className="mb-4 text-h4">À faire</h2>
            <ul className="flex flex-col gap-3">
              {d.todo.pending.length > 0 && (
                <Todo href="/studio/produits?statut=PENDING_REVIEW" tone="warning" icon={Clock} title={`${d.todo.pending.length} produit${d.todo.pending.length > 1 ? "s" : ""} en modération`} text={`« ${d.todo.pending[0]} » · réponse sous 72 h`} />
              )}
              {d.todo.unanswered_reviews > 0 && <Todo href="/studio/statistiques#avis" tone="brand" icon={MessageSquare} title={`${d.todo.unanswered_reviews} avis sans réponse`} text="Répondre améliore la confiance" />}
              {d.todo.rejected.map((r) => (
                <Todo key={r.id} href={`/studio/produits/${r.id}/modifier`} tone="danger" icon={AlertCircle} title="1 produit refusé" text={`${r.title} · à corriger`} />
              ))}
              {!d.todo.pending.length && !d.todo.unanswered_reviews && !d.todo.rejected.length && <li className="text-body-sm text-text-secondary">Tout est à jour 🎉</li>}
            </ul>
          </section>

          <section className="rounded-card border border-border-default bg-bg-surface p-6">
            <h2 className="mb-4 text-h4">Ventes récentes</h2>
            <ul className="flex flex-col gap-4">
              {d.recent.map((s, i) => (
                <li key={i} className="flex items-center gap-3">
                  <Avatar initials={s.initials} size={36} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-label-sm text-text-primary">{s.product}</span>
                    <span className="text-caption text-text-tertiary">
                      {s.customer} · {ago(s.paid_at)}
                    </span>
                  </span>
                  <span className="text-label-sm whitespace-nowrap text-success">+{fcfaShort(s.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function Todo({ href, tone, icon: Icon, title, text }: { href: string; tone: "warning" | "brand" | "danger"; icon: typeof Clock; title: string; text: string }) {
  const tones = { warning: "bg-warning-subtle text-warning", brand: "bg-brand-subtle text-brand-primary", danger: "bg-danger-subtle text-danger" };
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 rounded-md bg-bg-page px-4 py-3 hover:bg-bg-subtle">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-sm ${tones[tone]}`}>
          <Icon className="size-[18px]" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-label-sm text-text-primary">{title}</span>
          <span className="line-clamp-2 text-caption text-text-tertiary">{text}</span>
        </span>
        <ChevronRight className="size-4 text-text-tertiary" />
      </Link>
    </li>
  );
}
