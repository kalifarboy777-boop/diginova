import type { Metadata } from "next";
import { CatalogView, fetchProducts, type SearchParams } from "@/components/catalog/catalog-view";

export const metadata: Metadata = { title: "Meilleures ventes" };

export default async function BestPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const data = await fetchProducts(sp, { sort: "popularite" });
  return (
    <CatalogView data={data} sp={sp} basePath="/meilleures-ventes" title="Meilleures ventes" description="Les produits les plus achetés par la communauté DigiNova." breadcrumb={[{ label: "Accueil", href: "/" }, { label: "Meilleures ventes" }]} lockSort />
  );
}
