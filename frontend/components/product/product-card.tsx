import Link from "next/link";
import { ProductBadge } from "@/components/ui/badge";
import { PriceTag } from "@/components/ui/price";
import { RatingInline } from "@/components/ui/rating";
import { cn } from "@/lib/cn";
import type { ProductCard as Product } from "@/lib/types";
import { FavoriteButton } from "./favorite-button";
import { ProductCover } from "./product-cover";

/** Carte produit du Figma : visuel 4:3 (rayon 12), badge, favori, catégorie en surcapitales, titre 2 lignes, note, prix. */
export function ProductCard({ product, className, showFavorite = true, compareFull = false }: { product: Product; className?: string; showFavorite?: boolean; compareFull?: boolean }) {
  return (
    <article className={cn("group relative flex flex-col gap-3.5", className)}>
      <div className="relative aspect-[302/227] overflow-hidden rounded-md">
        {product.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.cover_url} alt="" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" />
        ) : (
          <ProductCover type={product.cover_type} className="transition-transform duration-300 group-hover:scale-[1.03]" />
        )}
        {product.badge && <ProductBadge label={product.badge} className="absolute top-3 left-3" />}
        {showFavorite && <FavoriteButton productId={product.id} initial={product.is_favorite} className="absolute top-3 right-3 z-10" />}
      </div>
      <div className="flex flex-col gap-1.5">
        {product.category && <span className="text-overline text-text-tertiary">{product.category.label}</span>}
        <h3 className="line-clamp-2 text-body-medium text-text-primary">
          <Link href={`/produit/${product.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-focus-within:underline">
            {product.title}
          </Link>
        </h3>
        <RatingInline value={product.rating} count={product.rating_count} />
        <PriceTag price={product.price} compareAt={product.compare_at_price} compareFull={compareFull} />
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3.5" aria-hidden>
      <div className="aspect-[302/227] animate-pulse rounded-md bg-bg-subtle" />
      <div className="h-3 w-20 animate-pulse rounded bg-bg-subtle" />
      <div className="h-4 w-4/5 animate-pulse rounded bg-bg-subtle" />
      <div className="h-4 w-1/3 animate-pulse rounded bg-bg-subtle" />
    </div>
  );
}

export function ProductGrid({ products, className, columns = 4 }: { products: Product[]; className?: string; columns?: 3 | 4 }) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-4 gap-y-8 md:gap-6", columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3", className)}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
