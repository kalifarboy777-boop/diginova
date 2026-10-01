import type { Metadata } from "next";
import Link from "next/link";
import { CategoryIcon } from "@/components/home/category-icon";
import { Breadcrumb } from "@/components/ui/misc";
import { serverApi } from "@/lib/server-api";

export const metadata: Metadata = { title: "Catégories" };

type Cat = { name: string; slug: string; description: string; count: number; children: { name: string; slug: string }[] };

export default async function CategoriesPage() {
  const cats = await serverApi<Cat[]>("/categories", { revalidate: 300 });
  return (
    <>
      <section className="bg-bg-surface">
        <div className="container-site flex flex-col gap-4 py-8">
          <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Catégories" }]} />
          <h1 className="text-h2 md:text-h1">Toutes les catégories</h1>
          <p className="max-w-[640px] text-body-lg text-text-secondary">Des ressources pensées pour le contexte africain : FCFA, OHADA, réalités des PME.</p>
        </div>
      </section>
      <section className="container-site grid gap-5 py-10 sm:grid-cols-2 lg:grid-cols-3">
        {cats.map((c) => (
          <div key={c.slug} className="flex flex-col gap-4 rounded-card border border-border-default bg-bg-surface p-6">
            <Link href={`/categorie/${c.slug}`} className="flex items-center gap-4">
              <CategoryIcon slug={c.slug} />
              <span className="flex flex-col">
                <span className="text-h4 text-text-primary">{c.name}</span>
                <span className="text-body-sm text-text-secondary">{c.count} produits</span>
              </span>
            </Link>
            <p className="text-body-sm text-text-secondary">{c.description}</p>
            <div className="flex flex-wrap gap-2">
              {c.children.map((s) => (
                <Link key={s.slug} href={`/categorie/${s.slug}`} className="rounded-full bg-bg-subtle px-3 py-1 text-label-sm text-text-secondary hover:text-text-primary">
                  {s.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
