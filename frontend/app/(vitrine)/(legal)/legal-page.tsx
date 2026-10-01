import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui/misc";
import { LEGAL } from "@/lib/legal";

export function LegalPage({ doc }: { doc: string }) {
  const d = LEGAL[doc];
  if (!d) notFound();
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-12">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: d.title }]} />
      <h1 className="text-h2 md:text-h1">{d.title}</h1>
      <p className="text-body-sm text-text-tertiary">Dernière mise à jour : {d.updated}</p>
      {d.sections.map((s) => (
        <section key={s.h} className="flex flex-col gap-2">
          <h2 className="text-h4">{s.h}</h2>
          {s.p.map((p, i) => (
            <p key={i} className="text-body text-text-secondary">
              {p}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
