import { ArrowLeft, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/misc";
import { serverApiOrNull } from "@/lib/server-api";

type Article = { title: string; slug: string; body: string; category: string; topic: { title: string } | null; related: { title: string; slug: string }[] };
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await serverApiOrNull<Article>(`/help/${(await params).slug}`, { revalidate: 300 });
  return { title: a ? `${a.title} · Aide` : "Aide" };
}

export default async function HelpArticlePage({ params }: Props) {
  const a = await serverApiOrNull<Article>(`/help/${(await params).slug}`, { revalidate: 300 });
  if (!a) notFound();
  return (
    <div className="container-site grid gap-12 py-10 lg:grid-cols-[1fr_340px]">
      <article className="flex flex-col gap-6">
        <Breadcrumb items={[{ label: "Aide", href: "/aide" }, ...(a.topic ? [{ label: a.topic.title, href: `/aide/categorie/${a.category}` }] : []), { label: a.title }]} />
        <h1 className="text-h2">{a.title}</h1>
        <div className="flex flex-col gap-4 text-body-lg text-text-secondary">
          {a.body.split("\n\n").map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-card border border-border-default bg-bg-surface p-6">
          <p className="flex-1 text-body text-text-primary">Cet article n’a pas résolu votre problème ?</p>
          <Button asChild>
            <Link href="/aide#contact">Contacter le support</Link>
          </Button>
        </div>
        <Link href="/aide" className="inline-flex items-center gap-2 text-label text-brand-primary">
          <ArrowLeft className="size-4" /> Retour au centre d’aide
        </Link>
      </article>
      <aside className="flex flex-col gap-3">
        <h2 className="text-h4">Dans le même thème</h2>
        {a.related.map((r) => (
          <Link key={r.slug} href={`/aide/${r.slug}`} className="flex items-center gap-3 rounded-md border border-border-default bg-bg-surface px-4 py-3 text-body-sm text-text-primary hover:shadow-soft">
            <FileText className="size-4 text-brand-primary" /> {r.title}
          </Link>
        ))}
      </aside>
    </div>
  );
}
