import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView, fetchProducts, type SearchParams } from "@/components/catalog/catalog-view";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchProducts({}, { category: slug, per_page: 1 }).catch(() => null);
  return data?.category ? { title: data.category.name, description: data.category.description ?? undefined } : { title: "Catégorie" };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const data = await fetchProducts(sp, { category: slug });
  if (!data.category) notFound();
  const c = data.category;
  const root = c.parent ?? c;
  return (
    <CatalogView
      data={data}
      sp={sp}
      basePath={`/categorie/${slug}`}
      title={c.name}
      description={c.description}
      breadcrumb={[{ label: "Accueil", href: "/" }, { label: "Boutique", href: "/boutique" }, ...(c.parent ? [{ label: c.parent.name, href: `/categorie/${c.parent.slug}` }] : []), { label: c.name }]}
      pills={[{ key: root.slug, label: "Tout", href: `/categorie/${root.slug}` }, ...c.children.map((s) => ({ key: s.slug, label: s.name, href: `/categorie/${s.slug}` }))]}
      activePill={slug}
    />
  );
}
