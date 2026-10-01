import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/cn";

const AVATAR_COLORS = ["#635BFF", "#F59E0B", "#16A34A", "#DB2777", "#0284C7", "#0D9488", "#D97706", "#4338CA"];

/** Pastille initiales (couleur stable dérivée du texte) ou photo. */
export function Avatar({ initials, src, size = 36, className, color }: { initials: string; src?: string | null; size?: number; className?: string; color?: string }) {
  const bg = color ?? AVATAR_COLORS[[...initials].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={cn("shrink-0 rounded-full object-cover", className)} style={{ width: size, height: size }} />
  ) : (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white", className)}
      style={{ width: size, height: size, background: bg, fontSize: Math.max(11, size * 0.33) }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-bg-subtle", className)} aria-hidden />;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card border border-border-default bg-bg-surface", className)} {...props} />;
}

/** État vide : icône dans une pastille, titre H4, texte, action. */
export function EmptyState({ icon, title, text, action, className }: { icon: React.ReactNode; title: string; text?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      <span className="mb-4 flex size-14 items-center justify-center rounded-lg bg-brand-subtle text-brand-primary [&_svg]:size-6">{icon}</span>
      <h3 className="text-h4 text-text-primary">{title}</h3>
      {text && <p className="mt-1.5 max-w-sm text-body-sm text-text-secondary">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Pastilles de filtre (« Tous (12) », « Business (5) »…) — sélectionnée = sombre. */
export function Pill({ active, className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-label whitespace-nowrap transition-colors",
        active ? "border-[#111827] bg-[#111827] text-white dark:border-white dark:bg-white dark:text-[#111827]" : "border-border-default bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function PillLink({ active, href, children, className }: { active?: boolean; href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      scroll={false}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-label whitespace-nowrap transition-colors",
        active ? "border-[#111827] bg-[#111827] text-white dark:border-white dark:bg-white dark:text-[#111827]" : "border-border-default bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary",
        className,
      )}
    >
      {children}
    </Link>
  );
}

/** Onglets soulignés (Description / Contenu / Fiche technique…). */
export function UnderlineTabs<T extends string>({ tabs, value, onChange, className }: { tabs: { value: T; label: React.ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cn("flex gap-7 overflow-x-auto border-b border-border-default", className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "-mb-px border-b-2 pb-3.5 text-body-medium whitespace-nowrap transition-colors",
            value === t.value ? "border-brand-primary text-text-primary" : "border-transparent text-text-secondary hover:text-text-primary",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Onglets segmentés (7 j / 30 j / 12 mois). */
export function Segmented<T extends string>({ options, value, onChange, className, dark }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; className?: string; dark?: boolean }) {
  return (
    <div role="tablist" className={cn("inline-flex rounded-btn p-1", dark ? "bg-white/5" : "bg-bg-subtle", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-8 rounded-sm px-3 text-label-sm transition-colors",
            value === o.value ? "bg-bg-surface text-text-primary shadow-soft" : "text-text-secondary hover:text-text-primary",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Breadcrumb({ items, className }: { items: { label: string; href?: string }[]; className?: string }) {
  return (
    <nav aria-label="Fil d’Ariane" className={cn("flex flex-wrap items-center gap-1.5 text-body-sm text-text-tertiary", className)}>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight className="size-3.5" aria-hidden />}
          {it.href ? (
            <Link href={it.href} className="hover:text-text-primary">
              {it.label}
            </Link>
          ) : (
            <span aria-current="page" className="text-text-primary">
              {it.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

/** Pagination « ‹ 1 2 3 … 13 › » (liens). */
export function Pagination({ page, last, href, className }: { page: number; last: number; href: (p: number) => string; className?: string }) {
  if (last <= 1) return null;
  const pages = new Set([1, 2, 3, page - 1, page, page + 1, last].filter((p) => p >= 1 && p <= last));
  const list = [...pages].sort((a, b) => a - b);
  const cell = "inline-flex size-10 items-center justify-center rounded-btn border text-label transition-colors";
  return (
    <nav aria-label="Pagination" className={cn("flex items-center justify-center gap-2", className)}>
      <Link aria-label="Page précédente" aria-disabled={page <= 1} href={href(Math.max(1, page - 1))} className={cn(cell, "border-border-default bg-bg-surface text-text-secondary", page <= 1 && "pointer-events-none opacity-40")}>
        <ChevronLeft className="size-4" />
      </Link>
      {list.map((p, i) => (
        <React.Fragment key={p}>
          {i > 0 && p - list[i - 1] > 1 && <span className="px-1 text-text-tertiary">…</span>}
          <Link
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(cell, p === page ? "border-brand-primary bg-brand-primary text-white" : "border-border-default bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary")}
          >
            {p}
          </Link>
        </React.Fragment>
      ))}
      <Link aria-label="Page suivante" aria-disabled={page >= last} href={href(Math.min(last, page + 1))} className={cn(cell, "border-border-default bg-bg-surface text-text-secondary", page >= last && "pointer-events-none opacity-40")}>
        <ChevronRight className="size-4" />
      </Link>
    </nav>
  );
}

/** Icône dans une pastille arrondie (réassurance, catégories, étapes). */
export function IconTile({ children, className, size = 44, tone = "brand" }: { children: React.ReactNode; className?: string; size?: number; tone?: "brand" | "success" | "warning" | "danger" | "neutral" | "solid" }) {
  const tones = {
    brand: "bg-brand-subtle text-brand-primary",
    success: "bg-success-subtle text-success",
    warning: "bg-warning-subtle text-warning",
    danger: "bg-danger-subtle text-danger",
    neutral: "bg-bg-subtle text-text-secondary",
    solid: "bg-brand-primary text-white",
  };
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-md", tones[tone], className)} style={{ width: size, height: size }}>
      {children}
    </span>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-border-default", className)} />;
}

/** Bandeau d'information (info, succès, alerte, danger). */
export function Notice({ tone = "info", icon, children, className, action }: { tone?: "info" | "success" | "warning" | "danger"; icon?: React.ReactNode; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  const tones = {
    info: "border-border-default bg-bg-surface text-text-secondary [&>svg]:text-brand-primary",
    success: "border-transparent bg-success-subtle text-success [&>svg]:text-success",
    warning: "border-transparent bg-warning-subtle text-[#92400E] dark:text-warning [&>svg]:text-warning",
    danger: "border-transparent bg-danger-subtle text-danger [&>svg]:text-danger",
  };
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-cover border px-5 py-4 text-body-sm [&>svg]:mt-0.5 [&>svg]:size-[18px] [&>svg]:shrink-0", tones[tone], className)}>
      {icon}
      <div className="flex-1">{children}</div>
      {action}
    </div>
  );
}
