"use client";

import { LayoutGrid, List, SlidersHorizontal, X } from "lucide-react";
import * as React from "react";
import { Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { num } from "@/lib/format";
import { Filters, type Facets } from "./filters";
import { useQueryState } from "./use-query-state";

const SORTS: [string, string][] = [
  ["popularite", "Popularité"],
  ["nouveautes", "Nouveautés"],
  ["prix-asc", "Prix croissant"],
  ["prix-desc", "Prix décroissant"],
  ["note", "Note"],
];

/** Barre au-dessus de la grille : nombre de résultats, filtres actifs (pastilles), tri, vue grille/liste. */
export function Toolbar({ total, facets, labels, search, lockSort }: { total: number; facets: Facets; labels: Record<string, string>; search?: boolean; lockSort?: boolean }) {
  const { params, set, pending } = useQueryState();
  const [mobileFilters, setMobileFilters] = React.useState(false);
  const view = params.get("vue") === "liste" ? "liste" : "grille";
  const sorts = search ? [["pertinence", "Pertinence"] as [string, string], ...SORTS] : SORTS;
  const sort = params.get("sort") ?? (search ? "pertinence" : "popularite");

  const chips: { label: string; remove: () => void }[] = [
    ...params.getAll("sub").map((s) => ({ label: labels[s] ?? s, remove: () => set({ sub: params.getAll("sub").filter((x) => x !== s) }) })),
    ...params.getAll("format").map((f) => ({ label: f, remove: () => set({ format: params.getAll("format").filter((x) => x !== f) }) })),
    ...(params.get("rating") ? [{ label: `${params.get("rating")!.replace(".", ",")} ★ et +`, remove: () => set({ rating: null }) }] : []),
    ...(params.get("license") ? [{ label: "Licence commerciale", remove: () => set({ license: null }) }] : []),
    ...(params.get("min") || params.get("max") ? [{ label: `${num(Number(params.get("min") ?? 0))} – ${num(Number(params.get("max") ?? facets.priceMax))} F`, remove: () => set({ min: null, max: null }) }] : []),
  ];

  return (
    <>
      <div className={cn("flex flex-wrap items-center gap-3 transition-opacity", pending && "opacity-60")}>
        <button type="button" onClick={() => setMobileFilters(true)} className="inline-flex h-10 items-center gap-2 rounded-btn border border-border-strong bg-bg-surface px-3.5 text-label lg:hidden">
          <SlidersHorizontal className="size-4" /> Filtres
        </button>
        <p className="text-label text-text-primary" aria-live="polite">
          {num(total)} résultat{total > 1 ? "s" : ""}
        </p>
        {chips.map((c) => (
          <button key={c.label} type="button" onClick={c.remove} className="inline-flex h-7 items-center gap-1.5 rounded-full bg-brand-subtle px-3 text-label-sm text-brand-primary" aria-label={`Retirer le filtre ${c.label}`}>
            {c.label} <X className="size-3.5" />
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3">
          {!lockSort && (
            <Select aria-label="Trier" value={sort} onChange={(e) => set({ sort: e.target.value })} shellClassName="h-[42px] w-auto bg-bg-surface" className="text-label">
              {sorts.map(([v, l]) => (
                <option key={v} value={v}>
                  Trier : {l}
                </option>
              ))}
            </Select>
          )}
          <div className="hidden overflow-hidden rounded-btn border border-border-default sm:flex" role="group" aria-label="Affichage">
            {[
              ["grille", LayoutGrid, "Vue grille"],
              ["liste", List, "Vue liste"],
            ].map(([v, Icon, l]) => {
              const I = Icon as typeof LayoutGrid;
              return (
                <button key={v as string} type="button" aria-label={l as string} aria-pressed={view === v} onClick={() => set({ vue: v === "grille" ? null : (v as string) })} className={cn("flex size-[42px] items-center justify-center", view === v ? "bg-brand-subtle text-brand-primary" : "bg-bg-surface text-text-secondary")}>
                  <I className="size-[18px]" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {mobileFilters && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-bg-page p-4 lg:hidden" role="dialog" aria-modal aria-label="Filtres">
          <Filters facets={facets} onClose={() => setMobileFilters(false)} />
          <button type="button" onClick={() => setMobileFilters(false)} className="mt-4 h-12 w-full rounded-btn bg-brand-primary text-label text-white">
            Voir les {num(total)} résultats
          </button>
        </div>
      )}
    </>
  );
}
