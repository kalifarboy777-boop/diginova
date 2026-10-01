"use client";

import * as React from "react";
import { ProductGrid } from "@/components/product/product-card";
import { Pill } from "@/components/ui/misc";
import type { ProductCard } from "@/lib/types";

const TABS = [
  ["tendances", "Tendances"],
  ["nouveautes", "Nouveautés"],
  ["meilleures-ventes", "Meilleures ventes"],
  ["petits-prix", "Petits prix"],
] as const;

/** « Les ressources du moment » : onglets en pastilles + grille 4 colonnes. */
export function ProductTabs({ tabs, packs }: { tabs: Record<string, ProductCard[]>; packs: React.ReactNode }) {
  const [tab, setTab] = React.useState<string>("tendances");
  return (
    <>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0" role="tablist" aria-label="Sélection de produits">
        {TABS.map(([v, l]) => (
          <Pill key={v} role="tab" aria-selected={tab === v} active={tab === v} onClick={() => setTab(v)}>
            {l}
          </Pill>
        ))}
        <Pill role="tab" aria-selected={tab === "packs"} active={tab === "packs"} onClick={() => setTab("packs")}>
          Packs
        </Pill>
      </div>
      <div role="tabpanel">{tab === "packs" ? packs : <ProductGrid products={tabs[tab] ?? []} />}</div>
    </>
  );
}
