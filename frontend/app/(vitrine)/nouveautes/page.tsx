import type { Metadata } from "next";
import { CatalogView, fetchProducts, type SearchParams } from "@/components/catalog/catalog-view";

export const metadata: Metadata = { title: "Nouveautés" };

export default async function NewPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const data = await fetchProducts(sp, { sort: "nouveautes" });
  return (
    <CatalogView data={data} sp={sp} basePath="/nouveautes" title="Nouveautés" description="Les dernières ressources publiées par DigiNova et ses créateurs." breadcrumb={[{ label: "Accueil", href: "/" }, { label: "Nouveautés" }]} lockSort />
  );
}
