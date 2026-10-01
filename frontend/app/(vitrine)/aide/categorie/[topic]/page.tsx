import { ChevronRight, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopicIcon } from "@/components/help/topic-icon";
import { Breadcrumb } from "@/components/ui/misc";
import { serverApi } from "@/lib/server-api";

type Help = { topics: { slug: string; title: string; description: string; count: number }[] };
type Props = { params: Promise<{ topic: string }> };

export const metadata: Metadata = { title: "Aide" };

export default async function HelpTopicPage({ params }: Props) {
  const { topic } = await params;
  const help = await serverApi<Help & { articles: { title: string; slug: string }[] | null }>("/help", { query: { topic }, revalidate: 300 });
  const t = help.topics.find((x) => x.slug === topic);
  if (!t) notFound();
  const list = help.articles ?? [];
  return (
    <div className="container-site flex flex-col gap-6 py-10">
      <Breadcrumb items={[{ label: "Aide", href: "/aide" }, { label: t.title }]} />
      <div className="flex items-center gap-4">
        <TopicIcon slug={topic} />
        <div>
          <h1 className="text-h2">{t.title}</h1>
          <p className="text-body text-text-secondary">{t.description}</p>
        </div>
      </div>
      <div className="flex max-w-3xl flex-col gap-3">
        {list.map((a) => (
          <Link key={a.slug} href={`/aide/${a.slug}`} className="flex items-center gap-3.5 rounded-cover border border-border-default bg-bg-surface px-5 py-4 text-body-medium hover:shadow-soft">
            <FileText className="size-[18px] text-brand-primary" />
            <span className="flex-1">{a.title}</span>
            <ChevronRight className="size-4 text-text-tertiary" />
          </Link>
        ))}
      </div>
    </div>
  );
}
