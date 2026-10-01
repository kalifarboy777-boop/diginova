"use client";

import { Clock, Search, Tag, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { ProductCover } from "@/components/product/product-cover";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { fcfa } from "@/lib/format";
import type { ProductCard } from "@/lib/types";

const KEY = "dn_recent_searches";

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function rememberSearch(q: string) {
  const list = [q, ...readRecent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 5);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
}

type Suggest = { suggestions: string[]; category: { name: string; slug: string; count: number } | null; products: ProductCard[] };

/** Recherche du header + menu de suggestions (écran 03) : recherches récentes, suggestions, catégorie, 2 produits. */
export function SearchBox({ className, placeholder = "Rechercher un produit…", autoFocus }: { className?: string; placeholder?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = React.useState(params.get("q") ?? "");
  const [open, setOpen] = React.useState(false);
  const [recent, setRecent] = React.useState<string[]>([]);
  const [data, setData] = React.useState<Suggest | null>(null);
  const [active, setActive] = React.useState(-1);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();

  React.useEffect(() => setRecent(readRecent()), [open]);
  React.useEffect(() => {
    if (q.trim().length < 2) {
      setData(null);
      return;
    }
    const t = setTimeout(() => {
      api<Suggest>("/search/suggest", { query: { q: q.trim() } }).then(setData).catch(() => setData(null));
    }, 180);
    return () => clearTimeout(t);
  }, [q]);
  React.useEffect(() => {
    const close = (e: MouseEvent) => !boxRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const go = (term: string) => {
    const t = term.trim();
    if (!t) return;
    rememberSearch(t);
    setOpen(false);
    setQ(t);
    router.push(`/recherche?q=${encodeURIComponent(t)}`);
  };

  const options: { kind: "recent" | "suggest"; text: string }[] = [
    ...(q.trim().length < 2 ? recent.map((t) => ({ kind: "recent" as const, text: t })) : recent.filter((r) => r.toLowerCase().includes(q.toLowerCase())).slice(0, 2).map((t) => ({ kind: "recent" as const, text: t }))),
    ...(data?.suggestions ?? []).filter((s) => s !== q.toLowerCase()).slice(0, 2).map((t) => ({ kind: "suggest" as const, text: t })),
  ];
  const showMenu = open && (options.length > 0 || (data?.products.length ?? 0) > 0);

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(active >= 0 && options[active] ? options[active].text : q);
        }}
        className={cn(
          "flex h-11 items-center gap-2.5 rounded-btn border border-transparent bg-bg-subtle px-3.5 transition-colors",
          open && "border-brand-primary bg-bg-surface ring-1 ring-brand-primary",
        )}
      >
        <Search className="size-[18px] shrink-0 text-text-tertiary" aria-hidden />
        <input
          type="search"
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, options.length - 1));
            if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, -1));
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={placeholder}
          aria-label="Rechercher un produit"
          role="combobox"
          aria-expanded={showMenu}
          aria-controls={listId}
          aria-autocomplete="list"
          className="h-full min-w-0 flex-1 bg-transparent text-body text-text-primary outline-none placeholder:text-text-tertiary [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label="Effacer" className="text-text-tertiary hover:text-text-primary">
            <X className="size-4" />
          </button>
        )}
      </form>

      {showMenu && (
        <div id={listId} role="listbox" className="absolute top-[calc(100%+12px)] right-0 z-50 w-[440px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border-default bg-bg-surface py-2 shadow-float">
          {options.some((o) => o.kind === "recent") && <p className="px-4 pt-2 pb-1 text-overline font-semibold tracking-[0.04em] text-text-tertiary normal-case">Recherches récentes</p>}
          {options.map((o, i) => (
            <React.Fragment key={`${o.kind}${o.text}`}>
              {o.kind === "suggest" && options[i - 1]?.kind !== "suggest" && <p className="px-4 pt-3 pb-1 text-overline font-semibold tracking-[0.04em] text-text-tertiary normal-case">Suggestions</p>}
              <button
                type="button"
                role="option"
                aria-selected={active === i}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(o.text)}
                className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-left text-body text-text-primary", active === i && "bg-bg-subtle")}
              >
                {o.kind === "recent" ? <Clock className="size-4 text-text-tertiary" /> : <Search className="size-4 text-text-tertiary" />}
                {o.text}
              </button>
            </React.Fragment>
          ))}
          {data?.category && (
            <Link href={`/categorie/${data.category.slug}`} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-body text-text-primary hover:bg-bg-subtle">
              <Tag className="size-4 text-text-tertiary" />
              <span className="flex-1">Catégorie : {data.category.name}</span>
              <span className="text-caption text-text-tertiary">{data.category.count}</span>
            </Link>
          )}
          {data && data.products.length > 0 && (
            <>
              <p className="px-4 pt-3 pb-1 text-overline font-semibold tracking-[0.04em] text-text-tertiary normal-case">Produits</p>
              {data.products.map((p) => (
                <Link key={p.id} href={`/produit/${p.slug}`} onClick={() => { rememberSearch(q); setOpen(false); }} className="flex items-center gap-3 px-4 py-2 hover:bg-bg-subtle">
                  <span className="h-[42px] w-14 shrink-0 overflow-hidden rounded-sm">
                    <ProductCover type={p.cover_type} rounded={false} />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-label text-text-primary">{p.title}</span>
                    <span className="text-body-sm text-text-secondary">{fcfa(p.price)}</span>
                  </span>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
