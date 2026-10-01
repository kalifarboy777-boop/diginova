import type { Metadata } from "next";
import Link from "next/link";
import { ProductCover } from "@/components/product/product-cover";
import { Breadcrumb } from "@/components/ui/misc";
import { date } from "@/lib/format";
import { serverApi } from "@/lib/server-api";
import type { CoverType } from "@/lib/types";

export const metadata: Metadata = { title: "Blog", description: "Conseils pratiques pour entreprendre en Afrique francophone." };

type Post = { title: string; slug: string; excerpt: string; cover_type: CoverType; author: string; published_at: string };

export default async function BlogPage() {
  const posts = await serverApi<Post[]>("/blog", { revalidate: 300 });
  return (
    <div className="container-site flex flex-col gap-8 py-10">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Blog" }]} />
      <h1 className="text-h2 md:text-h1">Le blog DigiNova</h1>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <article key={p.slug} className="relative flex flex-col gap-4">
            <div className="aspect-[302/227] overflow-hidden rounded-md">
              <ProductCover type={p.cover_type} rounded={false} />
            </div>
            <p className="text-caption text-text-tertiary">{date(p.published_at)} · {p.author}</p>
            <h2 className="text-h4">
              <Link href={`/blog/${p.slug}`} className="after:absolute after:inset-0">
                {p.title}
              </Link>
            </h2>
            <p className="text-body-sm text-text-secondary">{p.excerpt}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
