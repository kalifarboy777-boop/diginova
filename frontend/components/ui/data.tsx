import { Check } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/cn";

/** Indicateur clé : libellé, valeur, variation (vert / rouge). */
export function StatCard({ label, value, delta, deltaTone = "success", hint, icon, className, dark }: { label: string; value: React.ReactNode; delta?: React.ReactNode; deltaTone?: "success" | "danger" | "neutral"; hint?: React.ReactNode; icon?: React.ReactNode; className?: string; dark?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-2 rounded-lg border p-5", dark ? "border-white/10 bg-[#111827]" : "border-border-default bg-bg-surface", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-body-sm text-text-secondary">{label}</span>
        {icon}
      </div>
      <span className="font-display text-[26px] leading-8 font-bold tracking-[-0.01em] text-text-primary tabular-nums">{value}</span>
      {(delta || hint) && (
        <span className="flex flex-wrap items-center gap-1.5 text-caption">
          {delta && <span className={cn(deltaTone === "success" ? "text-success" : deltaTone === "danger" ? "text-danger" : "text-text-secondary")}>{delta}</span>}
          {hint && <span className="text-text-tertiary">{hint}</span>}
        </span>
      )}
    </div>
  );
}

/** Étapes horizontales (Panier → Paiement → Téléchargement ; candidature ; ajout produit). */
export function Stepper({ steps, current, className }: { steps: string[]; current: number; className?: string }) {
  return (
    <ol className={cn("flex items-center gap-3", className)}>
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex items-center gap-3" aria-current={active ? "step" : undefined}>
            {i > 0 && <span className={cn("h-px w-8 sm:w-12", done || active ? "bg-brand-primary" : "bg-border-strong")} aria-hidden />}
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-label-sm",
                  done ? "bg-brand-primary text-white" : active ? "bg-brand-primary text-white" : "border border-border-strong text-text-tertiary",
                )}
              >
                {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn("text-label whitespace-nowrap", active ? "text-text-primary" : done ? "text-text-primary" : "text-text-tertiary", "max-sm:hidden")}>{s}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Chronologie verticale (commande / paiement). */
export function Timeline({ items }: { items: { label: React.ReactNode; detail?: React.ReactNode; level?: string }[] }) {
  const dot = (l?: string) => (l === "danger" ? "bg-danger" : l === "warning" ? "bg-warning" : l === "success" ? "bg-success" : "bg-brand-primary");
  return (
    <ol className="flex flex-col">
      {items.map((it, i) => (
        <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
          {i < items.length - 1 && <span className="absolute top-3 left-[5px] h-full w-px bg-border-default" aria-hidden />}
          <span className={cn("relative mt-1.5 size-[11px] shrink-0 rounded-full ring-4 ring-bg-surface", dot(it.level))} aria-hidden />
          <div className="flex flex-col">
            <span className="text-label text-text-primary">{it.label}</span>
            {it.detail && <span className={cn("text-caption", it.level === "danger" ? "text-danger" : "text-text-tertiary")}>{it.detail}</span>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Tableau de données (en-têtes en surcapitales, lignes séparées). */
export function Table({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-left">{children}</table>
    </div>
  );
}
export function Th({ className, children, ...p }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn("border-b border-border-default bg-bg-page px-4 py-3 text-overline font-bold whitespace-nowrap text-text-tertiary first:pl-5 last:pr-5", className)} {...p}>
      {children}
    </th>
  );
}
export function Td({ className, children, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("border-b border-border-default px-4 py-3.5 text-body-sm text-text-primary first:pl-5 last:pr-5", className)} {...p}>
      {children}
    </td>
  );
}

/** Pastille de statut de commande. */
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const map: Record<string, [string, string]> = {
    PAID: ["bg-success-subtle text-success", "Payée"],
    REFUNDED: ["bg-bg-subtle text-text-secondary", "Remboursée"],
    FAILED: ["bg-danger-subtle text-danger", "Échouée"],
    EXPIRED: ["bg-bg-subtle text-text-secondary", "Expirée"],
    PENDING: ["bg-warning-subtle text-warning", "En attente"],
    AWAITING_CONFIRMATION: ["bg-warning-subtle text-warning", "En attente"],
    NEEDS_REVIEW: ["bg-danger-subtle text-danger", "À vérifier"],
    PUBLISHED: ["bg-success-subtle text-success", "Publié"],
    PENDING_REVIEW: ["bg-warning-subtle text-warning", "En modération"],
    DRAFT: ["bg-bg-subtle text-text-secondary", "Brouillon"],
    REJECTED: ["bg-danger-subtle text-danger", "Refusé"],
    CHANGES_REQUESTED: ["bg-warning-subtle text-warning", "Modifications demandées"],
    ARCHIVED: ["bg-bg-subtle text-text-secondary", "Archivé"],
    OPEN: ["bg-brand-subtle text-brand-primary", "Ouvert"],
    IN_PROGRESS: ["bg-warning-subtle text-warning", "En cours"],
    RESOLVED: ["bg-success-subtle text-success", "Résolu"],
    REQUESTED: ["bg-warning-subtle text-warning", "Demandé"],
    PROCESSING: ["bg-warning-subtle text-warning", "En cours"],
    APPROVED: ["bg-success-subtle text-success", "Accepté"],
  };
  const [cls, def] = map[status] ?? ["bg-bg-subtle text-text-secondary", status];
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-label-sm whitespace-nowrap", cls)}>{label ?? def}</span>;
}
