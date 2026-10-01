import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCover } from "@/components/product/product-cover";
import { Breadcrumb } from "@/components/ui/misc";
import { date } from "@/lib/format";
import { serverApiOrNull } from "@/lib/server-api";
import type { CoverType } from "@/lib/types";

type Post = { title: string; slug: string; excerpt: string; body: string; cover_type: CoverType; author: string; published_at: string };
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await serverApiOrNull<Post>(`/blog/${(await params).slug}`, { revalidate: 300 });
  return p ? { title: p.title, description: p.excerpt } : { title: "Blog" };
}

export default async function BlogPostPage({ params }: Props) {
  const p = await serverApiOrNull<Post>(`/blog/${(await params).slug}`, { revalidate: 300 });
  if (!p) notFound();
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-10">
      <Breadcrumb items={[{ label: "Blog", href: "/blog" }, { label: p.title }]} />
      <h1 className="text-h2 md:text-h1">{p.title}</h1>
      <p className="text-body-sm text-text-tertiary">
        {date(p.published_at)} · {p.author}
      </p>
      <div className="aspect-[16/8] overflow-hidden rounded-[20px]">
        <ProductCover type={p.cover_type} rounded={false} />
      </div>
      {p.body.split("\n\n").map((b, i) =>
        b.startsWith("## ") ? (
          <h2 key={i} className="mt-2 text-h3">
            {b.slice(3)}
          </h2>
        ) : (
          <p key={i} className="text-body-lg text-text-secondary">
            {b}
          </p>
        ),
      )}
    </article>
  );
}
