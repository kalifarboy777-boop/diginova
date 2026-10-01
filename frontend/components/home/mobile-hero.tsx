import Link from "next/link";
import * as React from "react";
import { SearchBox } from "@/components/layout/search-box";
import { ProductCard } from "@/components/product/product-card";
import { ProductCover } from "@/components/product/product-cover";
import { Badge } from "@/components/ui/badge";
import type { ProductCard as Product } from "@/lib/types";
import { CategoryIcon } from "./category-icon";

/** Écran 60 — accueil mobile : recherche, carte hero sombre, univers en icônes, tendances en carrousel. */
export function MobileHome({ categories, trending }: { categories: { name: string; slug: string }[]; trending: Product[] }) {
  const short: Record<string, string> = { "reseaux-sociaux": "Réseaux", "e-books-formations": "E-books", "ia-prompts": "IA", productivite: "Productivité" };
  return (
    <div className="flex flex-col gap-6 pt-5 pb-8 md:hidden">
      <div className="px-5">
        <React.Suspense>
          <SearchBox placeholder="Business plan, CV, templates…" />
        </React.Suspense>
      </div>
      <div className="mx-5 flex items-center overflow-hidden rounded-[20px] bg-brand-deep p-5 text-white">
        <div className="flex flex-1 flex-col items-start gap-3">
          <Badge tone="promo">-20 % sur les packs</Badge>
          <h1 className="font-display text-[30px] leading-[36px] font-extrabold tracking-[-0.02em]">Transformez vos idées en résultats.</h1>
          <p className="text-body-sm text-[#C7D2FE]">Payez en Mobile Money, téléchargez en 2 minutes.</p>
          <Link href="/boutique" className="mt-1 inline-flex h-10 items-center rounded-btn bg-brand-primary px-4 text-label">
            Explorer
          </Link>
        </div>
        <div className="-mr-8 h-[90px] w-[118px] shrink-0 rotate-[-8deg] overflow-hidden rounded-md shadow-float" aria-hidden>
          <ProductCover type="chart" rounded={false} />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 px-5">
        {categories.slice(0, 4).map((c) => (
          <Link key={c.slug} href={`/categorie/${c.slug}`} className="flex flex-col items-center gap-2 text-caption text-text-secondary">
            <CategoryIcon slug={c.slug} size={60} className="rounded-[18px]" />
            {short[c.slug] ?? c.name}
          </Link>
        ))}
      </div>
      <div className="flex items-center justify-between px-5">
        <h2 className="text-h4">Tendances</h2>
        <Link href="/boutique" className="text-label text-brand-primary">
          Tout voir
        </Link>
      </div>
      <div className="flex snap-x gap-4 overflow-x-auto px-5 pb-2">
        {trending.slice(0, 6).map((p) => (
          <ProductCard key={p.id} product={p} className="w-[160px] shrink-0 snap-start" />
        ))}
      </div>
    </div>
  );
}
