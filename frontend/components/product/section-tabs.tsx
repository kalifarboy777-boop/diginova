"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

/** Onglets d'ancrage collants de la fiche produit (Description / Contenu / Fiche technique / Avis / FAQ). */
export function SectionTabs({ tabs }: { tabs: { id: string; label: string }[] }) {
  const [active, setActive] = React.useState(tabs[0].id);
  React.useEffect(() => {
    const obs = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: "-140px 0px -60% 0px" });
    tabs.forEach((t) => {
      const el = document.getElementById(t.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [tabs]);
  return (
    <nav aria-label="Sections du produit" className="sticky top-16 z-30 border-y border-border-default bg-bg-surface md:top-[76px]">
      <div className="container-site flex gap-8 overflow-x-auto">
        {tabs.map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            aria-current={active === t.id ? "true" : undefined}
            className={cn("-mb-px border-b-2 py-5 text-body-medium whitespace-nowrap transition-colors", active === t.id ? "border-brand-primary text-brand-primary" : "border-transparent text-text-secondary hover:text-text-primary")}
          >
            {t.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
