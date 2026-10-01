"use client";

import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import * as React from "react";
import { Checkbox, Radio } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { num } from "@/lib/format";
import { useQueryState } from "./use-query-state";

export type Facets = {
  subcategories: { name: string; slug: string; count: number }[];
  formats: Record<string, number>;
  priceMax: number;
};

const FORMATS: [string, string][] = [
  ["XLSX", "Excel (XLSX)"],
  ["DOCX", "Word (DOCX)"],
  ["PDF", "PDF"],
  ["Canva", "Canva"],
];

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="flex flex-col gap-3.5 border-t border-border-default p-5">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center justify-between text-label text-text-primary">
        {title}
        <ChevronDown className={cn("size-4 text-text-secondary transition-transform", !open && "-rotate-90")} />
      </button>
      {open && children}
    </div>
  );
}

function Row({ children, count, checked }: { children: React.ReactNode; count?: number; checked?: boolean }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2.5 text-body", checked ? "text-text-primary" : "text-text-secondary")}>
      {children}
      {count !== undefined && <span className="ml-auto text-caption text-text-tertiary">{count}</span>}
    </label>
  );
}

/** Panneau de filtres (écran 02) : sous-catégorie, prix, note, format, licence. */
export function Filters({ facets, className, onClose }: { facets: Facets; className?: string; onClose?: () => void }) {
  const { params, set } = useQueryState();
  const subs = params.getAll("sub");
  const formats = params.getAll("format");
  const max = facets.priceMax || 25000;
  const [price, setPrice] = React.useState<[number, number]>([Number(params.get("min") ?? 0), Number(params.get("max") ?? max)]);
  React.useEffect(() => setPrice([Number(params.get("min") ?? 0), Number(params.get("max") ?? max)]), [params, max]);
  const commitPrice = (p: [number, number]) => set({ min: p[0] > 0 ? String(p[0]) : null, max: p[1] < max ? String(p[1]) : null });
  const toggle = (key: string, list: string[], v: string) => set({ [key]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] });

  return (
    <aside className={cn("rounded-lg border border-border-default bg-bg-surface", className)} aria-label="Filtres">
      <div className="flex items-center gap-2 px-5 py-[18px]">
        <SlidersHorizontal className="size-[18px]" />
        <h2 className="flex-1 text-h4 text-text-primary">Filtres</h2>
        <button type="button" onClick={() => set({ sub: null, min: null, max: null, rating: null, format: null, license: null })} className="text-label-sm text-brand-primary hover:underline">
          Réinitialiser
        </button>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Fermer les filtres" className="ml-2 lg:hidden">
            <X className="size-5" />
          </button>
        )}
      </div>

      {facets.subcategories.length > 0 && (
        <Section title="Sous-catégorie">
          {facets.subcategories.map((s) => (
            <Row key={s.slug} count={s.count} checked={subs.includes(s.slug)}>
              <Checkbox checked={subs.includes(s.slug)} onChange={() => toggle("sub", subs, s.slug)} />
              {s.name}
            </Row>
          ))}
        </Section>
      )}

      <Section title="Prix (FCFA)">
        <div className="relative h-5">
          <div className="absolute top-2 h-1 w-full rounded-full bg-border-default" />
          <div className="absolute top-2 h-1 rounded-full bg-brand-primary" style={{ left: `${(price[0] / max) * 100}%`, right: `${100 - (price[1] / max) * 100}%` }} />
          {[0, 1].map((i) => (
            <input
              key={i}
              type="range"
              min={0}
              max={max}
              step={500}
              value={price[i]}
              aria-label={i === 0 ? "Prix minimum" : "Prix maximum"}
              onChange={(e) => {
                const v = Number(e.target.value);
                setPrice((p) => (i === 0 ? [Math.min(v, p[1]), p[1]] : [p[0], Math.max(v, p[0])]));
              }}
              onPointerUp={() => commitPrice(price)}
              onKeyUp={() => commitPrice(price)}
              className="range-thumb pointer-events-none absolute inset-0 h-5 w-full appearance-none bg-transparent"
            />
          ))}
        </div>
        <div className="flex gap-2.5">
          {[0, 1].map((i) => (
            <label key={i} className="flex h-10 flex-1 items-center rounded-sm border border-border-strong px-3 text-body-sm focus-within:border-brand-primary">
              <input
                inputMode="numeric"
                aria-label={i === 0 ? "Prix minimum" : "Prix maximum"}
                value={num(price[i])}
                onChange={(e) => {
                  const v = Number(e.target.value.replace(/\D/g, "")) || 0;
                  setPrice((p) => (i === 0 ? [v, p[1]] : [p[0], v]));
                }}
                onBlur={() => commitPrice(price)}
                className="w-full min-w-0 bg-transparent outline-none"
              />
              <span className="text-text-secondary">F</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Note">
        {[
          ["4.5", "4,5 étoiles et plus"],
          ["4", "4 étoiles et plus"],
          ["", "Toutes les notes"],
        ].map(([v, l]) => (
          <Row key={l} checked={(params.get("rating") ?? "") === v}>
            <Radio name="rating" checked={(params.get("rating") ?? "") === v} onChange={() => set({ rating: v || null })} className="size-[18px] checked:border-[5px]" />
            {l}
          </Row>
        ))}
      </Section>

      <Section title="Format">
        {FORMATS.map(([v, l]) => (
          <Row key={v} count={facets.formats[v.toUpperCase()] ?? 0} checked={formats.includes(v)}>
            <Checkbox checked={formats.includes(v)} onChange={() => toggle("format", formats, v)} />
            {l}
          </Row>
        ))}
      </Section>

      <Section title="Licence">
        {[
          ["", "Personnelle"],
          ["commercial", "Commerciale incluse"],
        ].map(([v, l]) => (
          <Row key={l} checked={(params.get("license") ?? "") === v}>
            <Radio name="license" checked={(params.get("license") ?? "") === v} onChange={() => set({ license: v || null })} className="size-[18px] checked:border-[5px]" />
            {l}
          </Row>
        ))}
      </Section>
    </aside>
  );
}
