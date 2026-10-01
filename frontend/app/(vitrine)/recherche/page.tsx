import { ArrowRight, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import * as React from "react";
import { fetchProducts, type SearchParams } from "@/components/catalog/catalog-view";
import { SortSelect } from "@/components/catalog/sort-select";
import { SearchBox } from "@/components/layout/search-box";
import { ProductGrid } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { SparkleIcon } from "@/components/ui/icons";
import { EmptyState, Pagination, PillLink } from "@/components/ui/misc";
import { qs } from "@/lib/api";
import { num } from "@/lib/format";

type Props = { searchParams: Promise<SearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = (await searchParams).q;
  return { title: q ? `Recherche « ${q} »` : "Recherche", robots: { index: false } };
}

/** Écran 03 — résultats de recherche + suggestion IA (bêta). */
export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() ?? "";
  const category = Array.isArray(sp.categorie) ? sp.categorie[0] : sp.categorie;

  if (!q) {
    return (
      <div className="container-site flex flex-col gap-6 py-10">
        <h1 className="text-h2">Rechercher</h1>
        <React.Suspense>
          <SearchBox autoFocus placeholder="Business plan, CV, templates…" className="max-w-xl" />
        </React.Suspense>
      </div>
    );
  }

  const [data, all] = await Promise.all([fetchProducts(sp, { category, per_page: 12 }), category ? fetchProducts({ q }, { per_page: 1 }) : null]);
  const facets = (all ?? data).facets.categories;
  const total = (all ?? data).meta.total;
  const s = data.suggestion;
  const link = (extra: Record<string, unknown>) => `/recherche${qs({ q, sort: sp.sort, ...extra })}`;

  return (
    <div className="container-site flex flex-col gap-8 pt-10 pb-16">
      <h1 className="text-h3 text-text-primary md:text-h2">
        {num(total)} résultat{total > 1 ? "s" : ""} pour « {q} »
      </h1>

      {s && (
        <section className="flex gap-4 rounded-card border border-brand-primary/20 bg-brand-subtle p-6" aria-label="Suggestion DigiNova IA">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-brand-primary text-white">
            <SparkleIcon className="size-5" />
          </span>
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-3 text-label text-brand-primary">
              Suggestion DigiNova IA <span className="text-label-sm text-brand-primary/70">Bêta</span>
            </p>
            <p className="text-body text-text-primary">{s.message}</p>
            <div className="flex flex-wrap gap-3">
              {s.bundle ? (
                <Button asChild size="sm">
                  <Link href={`/packs/${s.bundle.slug}`}>
                    Voir le {s.bundle.title} <ArrowRight />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="sm">
                  <Link href={`/produit/${s.products[0].slug}`}>
                    Voir le produit <ArrowRight />
                  </Link>
                </Button>
              )}
              <Button asChild size="sm" variant="secondary">
                <Link href={`/produit/${s.products[0].slug}`}>{s.products[0].title.split(" —")[0]}</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="-mx-5 flex flex-1 gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0">
          <PillLink href={link({})} active={!category}>
            Tous ({total})
          </PillLink>
          {facets.map((c) => (
            <PillLink key={c.slug} href={link({ categorie: c.slug })} active={category === c.slug}>
              {c.name.replace(" & formations", "").replace(" & prompts", "")} ({c.count})
            </PillLink>
          ))}
        </div>
        <React.Suspense>
          <SortSelect search />
        </React.Suspense>
      </div>

      {data.data.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title={`Aucun résultat pour « ${q} »`}
          text="Vérifiez l’orthographe ou essayez un terme plus général : « business plan », « CV », « Instagram »…"
          action={
            <Button asChild variant="secondary">
              <Link href="/boutique">Parcourir la boutique</Link>
            </Button>
          }
        />
      ) : (
        <ProductGrid products={data.data} />
      )}
      <Pagination page={data.meta.page} last={data.meta.last_page} href={(p) => link({ categorie: category, page: p > 1 ? p : undefined })} />
    </div>
  );
}
