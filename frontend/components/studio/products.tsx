"use client";

import { useQuery } from "@tanstack/react-query";
import { Box, Info, MoreHorizontal, Pencil, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { ProductCover } from "@/components/product/product-cover";
import { Button } from "@/components/ui/button";
import { StatusBadge, Table, Td, Th } from "@/components/ui/data";
import { EmptyState, Pill, Skeleton } from "@/components/ui/misc";
import { api } from "@/lib/api";
import { fcfaShort, rating } from "@/lib/format";
import type { CoverType } from "@/lib/types";

type Row = { id: number; slug: string; title: string; category: string; cover_type: CoverType; status: string; status_label: string; price: number; sales: number; revenue: number; rating: number | null; rejection_reason: string | null };
type Data = { counts: Record<string, number>; data: Row[] };

/** Écran 43 — mes produits. */
export function StudioProducts() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = React.useState(params.get("statut") ?? "");
  const [q, setQ] = React.useState("");
  const { data, refetch } = useQuery({ queryKey: ["studio", "products", status, q], queryFn: () => api<Data>("/studio/products", { query: { status: status || undefined, q: q || undefined } }), placeholderData: (p) => p });
  const [menu, setMenu] = React.useState<number | null>(null);

  if (!data) return <Skeleton className="h-[600px] rounded-card" />;
  const c = data.counts;
  const rejected = data.data.find((r) => r.status === "REJECTED" || r.status === "CHANGES_REQUESTED");
  const tabs: [string, string][] = [["", `Tous (${c.all})`], ["PUBLISHED", `Publiés (${c.PUBLISHED})`], ["PENDING_REVIEW", `En modération (${c.PENDING_REVIEW})`], ["DRAFT", `Brouillons (${c.DRAFT})`], ["REJECTED", `Refusés (${c.REJECTED})`]];

  return (
    <div className="flex flex-col gap-6">
      <p className="-mt-5 text-body-lg text-text-secondary">
        {c.all} produits · {c.PUBLISHED} publiés, {c.PENDING_REVIEW} en modération, {c.DRAFT} brouillon{c.DRAFT > 1 ? "s" : ""}, {c.REJECTED} refusé{c.REJECTED > 1 ? "s" : ""}.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="-mx-5 flex flex-1 gap-2 overflow-x-auto px-5 md:mx-0 md:px-0">
          {tabs.map(([v, l]) => (
            <Pill key={v} active={status === v} onClick={() => setStatus(v)} className="h-8 px-3.5 text-label-sm">
              {l}
            </Pill>
          ))}
        </div>
        <label className="flex h-10 w-full items-center gap-2.5 rounded-btn border border-border-default bg-bg-surface px-3.5 sm:w-64">
          <Search className="size-4 text-text-tertiary" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un produit" aria-label="Rechercher un produit" className="min-w-0 flex-1 bg-transparent text-body-sm outline-none" />
        </label>
      </div>
      <div className="overflow-visible rounded-card border border-border-default bg-bg-surface">
        {data.data.length === 0 ? (
          <EmptyState icon={<Box />} title="Aucun produit ici" text="Publiez votre premier produit : la modération répond sous 72 h." action={<Button asChild><Link href="/studio/produits/nouveau">Ajouter un produit</Link></Button>} />
        ) : (
          <Table className="overflow-visible">
            <thead>
              <tr>
                {["Produit", "Statut", "Prix", "Ventes", "Revenus", "Note", ""].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.data.map((r) => (
                <tr key={r.id} className="hover:bg-bg-page">
                  <Td>
                    <span className="flex items-center gap-4">
                      <span className="h-12 w-16 shrink-0 overflow-hidden rounded-sm">
                        <ProductCover type={r.cover_type} rounded={false} />
                      </span>
                      <span className="flex flex-col">
                        <span className="text-label">{r.title.split(" —")[0]}</span>
                        <span className="text-body-sm text-text-tertiary">{r.category.replace(" & formations", "")}</span>
                      </span>
                    </span>
                  </Td>
                  <Td>
                    <StatusBadge status={r.status} />
                  </Td>
                  <Td className="whitespace-nowrap">{fcfaShort(r.price)}</Td>
                  <Td>{r.status === "PUBLISHED" ? r.sales : "—"}</Td>
                  <Td className="whitespace-nowrap">{r.status === "PUBLISHED" ? fcfaShort(r.revenue) : "—"}</Td>
                  <Td className="whitespace-nowrap">{r.rating ? `${rating(r.rating)} ★` : "—"}</Td>
                  <Td className="relative text-right whitespace-nowrap">
                    <Link href={`/studio/produits/${r.id}/modifier`} aria-label={`Modifier ${r.title}`} className="inline-flex rounded p-1.5 text-text-secondary hover:bg-bg-subtle">
                      <Pencil className="size-4" />
                    </Link>
                    <button type="button" aria-label="Plus d’actions" onClick={() => setMenu(menu === r.id ? null : r.id)} className="inline-flex rounded p-1.5 text-text-secondary hover:bg-bg-subtle">
                      <MoreHorizontal className="size-4" />
                    </button>
                    {menu === r.id && (
                      <div className="absolute top-full right-4 z-20 w-48 rounded-md border border-border-default bg-bg-surface p-1 text-left shadow-float" onMouseLeave={() => setMenu(null)}>
                        {r.status === "PUBLISHED" && (
                          <Link href={`/produit/${r.slug}`} className="block rounded-sm px-3 py-2 text-body-sm hover:bg-bg-subtle">
                            Voir en boutique
                          </Link>
                        )}
                        <Link href={`/studio/produits/${r.id}/modifier`} className="block rounded-sm px-3 py-2 text-body-sm hover:bg-bg-subtle">
                          Modifier
                        </Link>
                        <button
                          type="button"
                          className="block w-full rounded-sm px-3 py-2 text-left text-body-sm text-danger hover:bg-danger-subtle"
                          onClick={async () => {
                            await api(`/studio/products/${r.id}`, { method: "DELETE" });
                            toast.success(r.sales ? "Produit archivé (les acheteurs gardent l’accès)." : "Produit supprimé.");
                            setMenu(null);
                            refetch();
                          }}
                        >
                          {r.sales ? "Archiver" : "Supprimer"}
                        </button>
                      </div>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
      {rejected && (
        <div className="flex flex-col gap-3 rounded-card bg-danger-subtle px-6 py-5 sm:flex-row sm:items-center" role="alert">
          <Info className="size-5 shrink-0 text-danger" />
          <div className="flex-1">
            <p className="text-label text-danger">« {rejected.title} » {rejected.status === "REJECTED" ? "a été refusé" : "nécessite des modifications"}</p>
            <p className="text-body-sm text-text-secondary">Motif : {rejected.rejection_reason}</p>
          </div>
          <Button variant="white" size="sm" className="border border-border-default" onClick={() => router.push(`/studio/produits/${rejected.id}/modifier`)}>
            Corriger
          </Button>
        </div>
      )}
    </div>
  );
}
