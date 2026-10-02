import type { MetadataRoute } from "next";
import { serverApi } from "@/lib/server-api";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const revalidate = 3600;

/** Plan du site : pages statiques, catégories, produits publiés, packs, articles d'aide et de blog. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const statics = ["", "/boutique", "/categories", "/nouveautes", "/meilleures-ventes", "/packs", "/devenir-createur", "/aide", "/blog", "/a-propos", "/cgu", "/cgv", "/licences", "/confidentialite", "/mentions-legales"].map((p) => ({
    url: `${SITE}${p}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.7,
  }));
  try {
    const [cats, products, bundles, blog] = await Promise.all([
      serverApi<{ slug: string; children: { slug: string }[] }[]>("/categories", { revalidate: 3600 }),
      serverApi<{ data: { slug: string }[]; meta: { last_page: number } }>("/products", { query: { per_page: 48 }, revalidate: 3600 }),
      serverApi<{ data: { slug: string }[] }>("/bundles", { revalidate: 3600 }),
      serverApi<{ slug: string; published_at: string }[]>("/blog", { revalidate: 3600 }),
    ]);
    const more = await Promise.all(
      Array.from({ length: Math.min(products.meta.last_page, 20) - 1 }, (_, i) => serverApi<{ data: { slug: string }[] }>("/products", { query: { per_page: 48, page: i + 2 }, revalidate: 3600 })),
    );
    return [
      ...statics,
      ...cats.flatMap((c) => [c.slug, ...c.children.map((s) => s.slug)]).map((s) => ({ url: `${SITE}/categorie/${s}`, changeFrequency: "daily" as const, priority: 0.8 })),
      ...[products, ...more].flatMap((r) => r.data).map((p) => ({ url: `${SITE}/produit/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.9 })),
      ...bundles.data.map((b) => ({ url: `${SITE}/packs/${b.slug}`, priority: 0.8 })),
      ...blog.map((b) => ({ url: `${SITE}/blog/${b.slug}`, lastModified: new Date(b.published_at), priority: 0.5 })),
    ];
  } catch {
    return statics;
  }
}
