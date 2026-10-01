import { SearchX } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { ProductCard as Card, ProductGrid } from "@/components/product/product-card";
import { ProductCover } from "@/components/product/product-cover";
import { FavoriteButton } from "@/components/product/favorite-button";
import { Button } from "@/components/ui/button";
import { Breadcrumb, EmptyState, Pagination, PillLink } from "@/components/ui/misc";
import { PriceTag } from "@/components/ui/price";
import { RatingInline } from "@/components/ui/rating";
import { qs } from "@/lib/api";
import { num } from "@/lib/format";
import { serverApi } from "@/lib/server-api";
import type { ProductCard } from "@/lib/types";
import { Filters } from "./filters";
import { Toolbar } from "./toolbar";

export type SearchParams = Record<string, string | string[] | undefined>;

export type ProductsResponse = {
  data: ProductCard[];
  meta: { total: number; page: number; last_page: number };
  category: {
    name: string;
    slug: string;
    description: string | null;
    parent: { name: string; slug: string } | null;
    count: number;
    children: { name: string; slug: string; count: number }[];
  } | null;
  facets: { formats: Record<string, number>; categories: { name: string; slug: string; count: number }[]; price_max: number };
  suggestion: { message: string; products: { slug: string; title: string }[]; bundle: { slug: string; title: string } | null } | null;
};

/** Convertit les paramètres d'URL en filtres de l'API (/api/products). */
export function toQuery(sp: SearchParams, extra: Record<string, unknown> = {}) {
  const arr = (v: string | string[] | undefined) => (v === undefined ? undefined : Array.isArray(v) ? v : [v]);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return {
    q: one(sp.q),
    sub: arr(sp.sub),
    min: one(sp.min),
    max: one(sp.max),
    rating: one(sp.rating),
    format: arr(sp.format),
    license: one(sp.license),
    sort: one(sp.sort),
    page: one(sp.page),
    per_page: 12,
    ...extra,
  };
}

export async function fetchProducts(sp: SearchParams, extra: Record<string, unknown> = {}) {
  return serverApi<ProductsResponse>("/products", { query: toQuery(sp, extra), revalidate: 30 });
}

/** Ligne de la vue « liste ». */
function ListRow({ p }: { p: ProductCard }) {
  return (
    <article className="relative flex gap-5 rounded-card border border-border-default bg-bg-surface p-4">
      <div className="h-[120px] w-40 shrink-0 overflow-hidden rounded-cover">
        <ProductCover type={p.cover_type} rounded={false} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {p.category && <span className="text-overline text-text-tertiary">{p.category.label}</span>}
        <h3 className="text-h4 text-text-primary">
          <Link href={`/produit/${p.slug}`} className="after:absolute after:inset-0">
            {p.title}
          </Link>
        </h3>
        {p.seller && <span className="text-body-sm text-text-secondary">par {p.seller.name}</span>}
        <RatingInline value={p.rating} count={p.rating_count} />
      </div>
      <div className="flex flex-col items-end justify-between">
        <FavoriteButton productId={p.id} initial={p.is_favorite} className="relative z-10" />
        <PriceTag price={p.price} compareAt={p.compare_at_price} stacked />
      </div>
    </article>
  );
}

/**
 * Écran 02 (et variantes) : en-tête de catégorie, sous-catégories, filtres, grille 3 colonnes, pagination.
 */
export function CatalogView({
  data,
  sp,
  basePath,
  title,
  description,
  breadcrumb,
  pills,
  activePill,
  lockSort,
  emptyText,
}: {
  data: ProductsResponse;
  sp: SearchParams;
  basePath: string;
  title: string;
  description?: string | null;
  breadcrumb: { label: string; href?: string }[];
  pills?: { label: string; href: string; key: string }[];
  activePill?: string;
  lockSort?: boolean;
  emptyText?: string;
}) {
  const subcats = data.category?.children ?? [];
  const labels = Object.fromEntries(subcats.map((s) => [s.slug, s.name]));
  const facets = { subcategories: subcats, formats: data.facets.formats, priceMax: data.facets.price_max };
  const query = (page: number) => `${basePath}${qs({ ...Object.fromEntries(Object.entries(sp).filter(([k]) => k !== "page")), page: page > 1 ? page : undefined })}`;
  const list = sp.vue === "liste";

  return (
    <>
      <section className="bg-bg-surface">
        <div className="container-site flex flex-col gap-4 py-8">
          <Breadcrumb items={breadcrumb} />
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="flex max-w-[640px] flex-col gap-2">
              <h1 className="text-h2 text-text-primary md:text-h1">{title}</h1>
              {description && <p className="text-body-lg text-text-secondary">{description}</p>}
            </div>
            <p className="text-label whitespace-nowrap text-text-secondary">{num(data.category?.count ?? data.meta.total)} produits</p>
          </div>
          {pills && pills.length > 0 && (
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pt-2 md:mx-0 md:flex-wrap md:px-0">
              {pills.map((p) => (
                <PillLink key={p.key} href={p.href} active={activePill === p.key}>
                  {p.label}
                </PillLink>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="container-site grid gap-8 pt-8 pb-16 lg:grid-cols-[280px_1fr] lg:pb-[72px]">
        <React.Suspense>
          <Filters facets={facets} className="hidden self-start lg:block" />
        </React.Suspense>
        <div className="flex min-w-0 flex-col gap-8">
          <React.Suspense>
            <Toolbar total={data.meta.total} facets={facets} labels={labels} lockSort={lockSort} />
          </React.Suspense>
          {data.data.length === 0 ? (
            <EmptyState
              icon={<SearchX />}
              title="Aucun produit ne correspond"
              text={emptyText ?? "Essayez d’élargir vos filtres ou explorez une autre catégorie."}
              action={
                <Button asChild variant="secondary">
                  <Link href={basePath}>Réinitialiser les filtres</Link>
                </Button>
              }
            />
          ) : list ? (
            <div className="flex flex-col gap-4">
              {data.data.map((p) => (
                <ListRow key={p.id} p={p} />
              ))}
            </div>
          ) : (
            <ProductGrid products={data.data} columns={3} />
          )}
          <Pagination page={data.meta.page} last={data.meta.last_page} href={query} />
        </div>
      </section>
    </>
  );
}

export { Card };
