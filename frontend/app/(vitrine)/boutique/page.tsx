import type { Metadata } from "next";
import { CatalogView, fetchProducts, type SearchParams } from "@/components/catalog/catalog-view";
import { serverApi } from "@/lib/server-api";

export const metadata: Metadata = { title: "Boutique", description: "Tous les produits numériques DigiNova : business plans, templates, e-books, packs IA. Paiement Mobile Money." };

type Cat = { name: string; slug: string };

export default async function BoutiquePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const [data, cats] = await Promise.all([fetchProducts(sp), serverApi<Cat[]>("/categories", { revalidate: 300 })]);
  return (
    <CatalogView
      data={data}
      sp={sp}
      basePath="/boutique"
      title="Boutique"
      description="Business plans, templates, formations et outils IA prêts à l’emploi, pensés pour les entrepreneurs d’Afrique francophone."
      breadcrumb={[{ label: "Accueil", href: "/" }, { label: "Boutique" }]}
      pills={[{ key: "all", label: "Tout", href: "/boutique" }, ...cats.map((c) => ({ key: c.slug, label: c.name, href: `/categorie/${c.slug}` }))]}
      activePill="all"
    />
  );
}
