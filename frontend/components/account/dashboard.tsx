"use client";

import { useQuery } from "@tanstack/react-query";
import { Book, ChevronRight, Download, RefreshCw, Tag, Wallet } from "lucide-react";
import Link from "next/link";
import { ProductCover } from "@/components/product/product-cover";
import { Button } from "@/components/ui/button";
import { StatCard, StatusBadge, Table, Td, Th } from "@/components/ui/data";
import { Skeleton } from "@/components/ui/misc";
import { api } from "@/lib/api";
import { date, dayMonth, fcfaShort } from "@/lib/format";
import type { LibraryItem, Order, ProductCard } from "@/lib/types";
import { DownloadButton } from "./download-button";

type Dashboard = {
  stats: { products: number; products_month: number; downloads: number; downloads_week: number; savings: number; coupons: number; coupons_expiring: number; coupons_expiring_days: number | null };
  recent: LibraryItem[];
  orders: Order[];
  update: { library_item_id: number; title: string; version: string; message: string } | null;
  coupons: { code: string; label: string; expires_at: string | null }[];
  recommended: ProductCard[];
};

const tile = (Icon: typeof Book) => (
  <span className="flex size-9 items-center justify-center rounded-sm bg-brand-subtle text-brand-primary">
    <Icon className="size-[18px]" />
  </span>
);

/** Écran 30 — tableau de bord client. */
export function AccountDashboard() {
  const { data: d } = useQuery({ queryKey: ["account", "dashboard"], queryFn: () => api<Dashboard>("/account/dashboard") });
  if (!d)
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-card" />
      </div>
    );
  const s = d.stats;
  const days = s.coupons_expiring_days;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Produits achetés" value={s.products} icon={tile(Book)} delta={s.products_month ? `+${s.products_month} ce mois-ci` : undefined} className="min-h-40 justify-between p-5" />
        <StatCard label="Téléchargements" value={s.downloads} icon={tile(Download)} hint={`${s.downloads_week} cette semaine`} className="min-h-40 justify-between p-5" />
        <StatCard label="Économies réalisées" value={fcfaShort(s.savings)} icon={tile(Wallet)} delta="grâce aux packs et coupons" className="min-h-40 justify-between p-5" />
        <StatCard
          label="Coupons disponibles"
          value={s.coupons}
          icon={tile(Tag)}
          hint={days !== null && s.coupons ? <span className="text-warning">{s.coupons_expiring} expire dans {days} jour{days > 1 ? "s" : ""}</span> : undefined}
          className="min-h-40 justify-between p-5"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="rounded-card border border-border-default bg-bg-surface p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-h4">Derniers achats</h2>
              <Link href="/compte/bibliotheque" className="text-label-sm text-brand-primary hover:underline">
                Voir ma bibliothèque
              </Link>
            </div>
            {d.recent.length === 0 ? (
              <p className="py-6 text-body text-text-secondary">
                Aucun achat pour le moment.{" "}
                <Link href="/boutique" className="text-brand-primary underline">
                  Explorer la boutique
                </Link>
              </p>
            ) : (
              <ul>
                {d.recent.map((li, i) => (
                  <li key={li.id} className="flex items-center gap-4 border-b border-border-default py-4 last:border-0">
                    <span className="h-[54px] w-[72px] shrink-0 overflow-hidden rounded-sm">
                      <ProductCover type={li.product.cover_type} rounded={false} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2 text-label text-text-primary">
                        <span className="truncate">{li.product.title}</span>
                        {li.has_update ? <span className="rounded-full bg-success-subtle px-2 py-0.5 text-label-sm text-success">Mise à jour v{li.product.version}</span> : i === 0 && Date.now() - new Date(li.granted_at).getTime() < 7 * 864e5 ? <span className="rounded-full bg-brand-subtle px-2 py-0.5 text-label-sm text-brand-primary">Nouveau</span> : null}
                      </span>
                      <span className="text-body-sm text-text-tertiary">Acheté le {date(li.granted_at)}</span>
                    </span>
                    <DownloadButton itemId={li.id} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-card border border-border-default bg-bg-surface p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-h4">Commandes récentes</h2>
              <Link href="/compte/commandes" className="text-label-sm text-brand-primary hover:underline">
                Tout voir
              </Link>
            </div>
            <Table>
              <thead>
                <tr>
                  {["Commande", "Date", "Articles", "Montant", "Statut", ""].map((h) => (
                    <Th key={h} className="bg-transparent px-0 text-caption font-medium tracking-normal normal-case first:pl-0">
                      {h}
                    </Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.orders.map((o) => (
                  <tr key={o.id}>
                    <Td className="pl-0 text-label first:pl-0">{o.number}</Td>
                    <Td>{date(o.created_at)}</Td>
                    <Td>{o.items_count}</Td>
                    <Td>{fcfaShort(o.total)}</Td>
                    <Td>
                      <StatusBadge status={o.status} />
                    </Td>
                    <Td className="pr-0 text-right last:pr-0">
                      {o.status === "PAID" && (
                        <a href={`/api/account/orders/${o.id}/invoice`} aria-label={`Facture ${o.number}`} className="inline-flex text-brand-primary">
                          <Download className="size-[18px]" />
                        </a>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          {d.update && (
            <section className="flex flex-col items-start gap-3 rounded-card bg-brand-deep p-6 text-white dark:bg-[#1E1B4B]">
              <RefreshCw className="size-5 text-[#A5B4FC]" />
              <h2 className="text-h4 text-white">Mise à jour disponible</h2>
              <p className="text-body-sm text-[#C7D2FE]">{d.update.message}</p>
              <DownloadButton itemId={d.update.library_item_id} variant="white">
                Télécharger la v{d.update.version}
              </DownloadButton>
            </section>
          )}
          <section className="rounded-card border border-border-default bg-bg-surface p-6">
            <h2 className="mb-4 text-h4">Mes coupons</h2>
            {d.coupons.length === 0 ? (
              <p className="text-body-sm text-text-secondary">Aucun coupon pour le moment.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {d.coupons.map((c) => {
                  const soon = c.expires_at && new Date(c.expires_at).getTime() - Date.now() < 7 * 864e5;
                  return (
                    <li key={c.code} className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border-strong px-4 py-3">
                      <span className="flex flex-col">
                        <span className="text-label text-brand-primary">{c.code}</span>
                        <span className="text-caption text-text-secondary">{c.label}</span>
                      </span>
                      {c.expires_at && <span className={soon ? "rounded-full bg-warning-subtle px-2.5 py-1 text-label-sm text-warning" : "rounded-full bg-bg-subtle px-2.5 py-1 text-label-sm text-text-secondary"}>Expire le {dayMonth(c.expires_at)}</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <section className="rounded-card border border-border-default bg-bg-surface p-6">
            <h2 className="mb-3 text-h4">Recommandé pour vous</h2>
            <ul>
              {d.recommended.map((p) => (
                <li key={p.id}>
                  <Link href={`/produit/${p.slug}`} className="flex items-center gap-3 rounded-md py-2 hover:bg-bg-subtle">
                    <span className="h-[42px] w-14 shrink-0 overflow-hidden rounded-sm">
                      <ProductCover type={p.cover_type} rounded={false} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-label-sm text-text-primary">{p.title}</span>
                      <span className="text-caption text-text-secondary">{fcfaShort(p.price)}</span>
                    </span>
                    <ChevronRight className="size-4 text-text-tertiary" />
                  </Link>
                </li>
              ))}
            </ul>
            <Button asChild variant="ghost" size="sm" className="mt-2">
              <Link href="/boutique">Explorer la boutique</Link>
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
