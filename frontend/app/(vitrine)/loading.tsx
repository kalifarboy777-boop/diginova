import { ProductCardSkeleton } from "@/components/product/product-card";
import { Skeleton } from "@/components/ui/misc";

/** Squelette générique des pages vitrine. */
export default function Loading() {
  return (
    <div className="container-site flex flex-col gap-8 py-10" aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-12 w-80" />
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
