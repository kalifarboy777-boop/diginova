import { ChevronRight, Clock, FileText, Mail, MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/help/contact-form";
import { HelpSearch } from "@/components/help/help-search";
import { TopicIcon } from "@/components/help/topic-icon";
import { serverApi } from "@/lib/server-api";

export const metadata: Metadata = { title: "Centre d’aide & contact", description: "Paiement, téléchargement, compte, remboursement : trouvez une réponse en quelques secondes ou contactez le support DigiNova." };

type Help = {
  topics: { slug: string; title: string; description: string; count: number }[];
  popular: { title: string; slug: string }[];
  results: { title: string; slug: string }[] | null;
  contact: { whatsapp: string; email: string; hours: string };
};

function ArticleLink({ a }: { a: { title: string; slug: string } }) {
  return (
    <Link href={`/aide/${a.slug}`} className="flex items-center gap-3.5 rounded-cover border border-border-default bg-bg-surface px-5 py-4 text-body-medium text-text-primary transition-shadow hover:shadow-soft">
      <FileText className="size-[18px] text-brand-primary" />
      <span className="flex-1">{a.title}</span>
      <ChevronRight className="size-4 text-text-tertiary" />
    </Link>
  );
}

/** Écran 06 — centre d'aide & contact. */
export default async function HelpPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const help = await serverApi<Help>("/help", { query: { q }, revalidate: q ? 0 : 300 });
  return (
    <>
      <section className="bg-brand-subtle">
        <div className="container-site flex flex-col items-center gap-5 py-16 text-center">
          <h1 className="text-h2 md:text-[44px] md:leading-[52px] md:font-extrabold md:tracking-[-0.015em]">Comment pouvons-nous vous aider ?</h1>
          <p className="text-body-lg text-text-secondary">Paiement, téléchargement, compte, remboursement : trouvez une réponse en quelques secondes.</p>
          <HelpSearch initial={q ?? ""} />
        </div>
      </section>

      {help.results && (
        <section id="resultats" className="container-site flex flex-col gap-4 pt-12">
          <h2 className="text-h3">
            {help.results.length} résultat{help.results.length > 1 ? "s" : ""} pour « {q} »
          </h2>
          {help.results.length === 0 ? <p className="text-body text-text-secondary">Aucun article ne correspond. Contactez-nous ci-dessous : nous répondons sous 24 h ouvrées.</p> : help.results.map((a) => <ArticleLink key={a.slug} a={a} />)}
        </section>
      )}

      <section className="container-site flex flex-col gap-8 py-16">
        <h2 className="text-h3 md:text-h2">Parcourir par thème</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {help.topics.map((t) => (
            <Link key={t.slug} href={`/aide/categorie/${t.slug}`} className="flex items-start gap-4 rounded-card border border-border-default bg-bg-surface p-6 transition-shadow hover:shadow-soft">
              <TopicIcon slug={t.slug} />
              <span className="flex flex-col gap-1">
                <span className="text-h4 text-text-primary">{t.title}</span>
                <span className="text-body-sm text-text-secondary">{t.description}</span>
                <span className="text-caption text-brand-primary">
                  {t.count} article{t.count > 1 ? "s" : ""}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-site grid gap-8 pb-16 lg:grid-cols-[1fr_626px]">
        <div className="flex flex-col gap-4">
          <h2 className="mb-1 text-h3">Articles populaires</h2>
          {help.popular.map((a) => (
            <ArticleLink key={a.slug} a={a} />
          ))}
        </div>
        <div id="contact" className="flex scroll-mt-28 flex-col gap-4">
          <div className="rounded-card border border-border-default bg-bg-surface p-8">
            <h2 className="text-h3">Contacter le support</h2>
            <p className="mt-2 mb-6 text-body text-text-secondary">Réponse sous 24 h ouvrées. Pour une commande, indiquez son numéro.</p>
            <ContactForm />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              [MessageSquare, "WhatsApp", help.contact.whatsapp, "text-success", `https://wa.me/${help.contact.whatsapp.replace(/\D/g, "")}`],
              [Mail, "Email", help.contact.email, "text-brand-primary", `mailto:${help.contact.email}`],
              [Clock, "Horaires", help.contact.hours, "text-warning", null],
            ].map(([Icon, title, value, color, href]) => {
              const I = Icon as typeof Mail;
              const body = (
                <>
                  <I className={`size-5 ${color}`} />
                  <span className="mt-3 text-label text-text-primary">{title as string}</span>
                  <span className="mt-1 text-body-sm text-text-secondary">{value as string}</span>
                </>
              );
              return href ? (
                <a key={title as string} href={href as string} className="flex flex-col rounded-lg border border-border-default bg-bg-surface p-5 hover:shadow-soft">
                  {body}
                </a>
              ) : (
                <div key={title as string} className="flex flex-col rounded-lg border border-border-default bg-bg-surface p-5">
                  {body}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
