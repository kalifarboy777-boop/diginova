import { CreditCard } from "lucide-react";
import { cn } from "@/lib/cn";
import type { PaymentMethod } from "@/lib/types";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; color: string; short: string; textDark?: boolean; description: string; badge?: string }[] = [
  { value: "WAVE", label: "Wave", color: "#1DC8F2", short: "W", description: "Sans frais · validation dans l’app Wave", badge: "Recommandé" },
  { value: "ORANGE_MONEY", label: "Orange Money", color: "#FF7900", short: "OM", description: "Validation par code USSD #144#" },
  { value: "MTN_MOMO", label: "MTN MoMo", color: "#FFCC00", short: "MM", textDark: true, description: "Validation par notification MoMo" },
  { value: "MOOV_MONEY", label: "Moov Money", color: "#0066B3", short: "MM", description: "Validation par code USSD" },
  { value: "CARD", label: "Carte bancaire", color: "#635BFF", short: "CB", description: "Visa, Mastercard · 3-D Secure" },
];

export const methodLabel = (m: PaymentMethod | null | undefined) => PAYMENT_METHODS.find((p) => p.value === m)?.label ?? "—";
export const methodColor = (m: PaymentMethod | null | undefined) => PAYMENT_METHODS.find((p) => p.value === m)?.color ?? "#9CA3AF";

/** Pastille colorée + nom (tant que les logos officiels ne sont pas fournis — voir public/payment-logos/). */
export function PaymentChip({ method, dark, className }: { method: PaymentMethod; dark?: boolean; className?: string }) {
  const m = PAYMENT_METHODS.find((p) => p.value === method)!;
  return (
    <span
      className={cn(
        "inline-flex h-[30px] items-center gap-1.5 rounded-sm border px-2.5 text-caption whitespace-nowrap",
        dark ? "border-white/10 bg-white/5 text-white" : "border-border-default bg-bg-surface text-text-secondary",
        className,
      )}
    >
      <span className="size-2.5 rounded-full" style={{ background: m.color }} aria-hidden />
      {m.label}
    </span>
  );
}

export function PaymentChips({ dark, className }: { dark?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {PAYMENT_METHODS.map((m) => (
        <PaymentChip key={m.value} method={m.value} dark={dark} />
      ))}
    </div>
  );
}

/** Logo carré de l'opérateur (44×32, rayon 8). */
export function PaymentLogo({ method, className }: { method: PaymentMethod; className?: string }) {
  const m = PAYMENT_METHODS.find((p) => p.value === method)!;
  if (method === "CARD")
    return (
      <span className={cn("inline-flex h-8 w-11 shrink-0 items-center justify-center rounded-sm bg-brand-primary text-white", className)} aria-hidden>
        <CreditCard className="size-[18px]" />
      </span>
    );
  return (
    <span className={cn("inline-flex h-8 w-11 shrink-0 items-center justify-center rounded-sm text-label-sm", m.textDark ? "text-[#111827]" : "text-white", className)} style={{ background: m.color }} aria-hidden>
      {m.short}
    </span>
  );
}

/** Option de paiement (radio + logo + libellé + description + badge) ; le contenu s'affiche quand elle est sélectionnée. */
export function PaymentOption({ method, checked, onSelect, name = "method", children }: { method: PaymentMethod; checked: boolean; onSelect: () => void; name?: string; children?: React.ReactNode }) {
  const m = PAYMENT_METHODS.find((p) => p.value === method)!;
  return (
    <div className={cn("rounded-cover transition-colors", checked ? "border-2 border-brand-primary bg-brand-subtle" : "border border-border-default bg-bg-surface hover:border-border-strong")}>
      <label className="flex cursor-pointer items-center gap-3.5 p-4">
        <input type="radio" name={name} value={method} checked={checked} onChange={onSelect} className="sr-only" />
        <span className={cn("size-5 shrink-0 rounded-full border bg-white transition-all", checked ? "border-[6px] border-brand-primary" : "border-[1.5px] border-border-strong")} aria-hidden />
        <PaymentLogo method={method} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-label text-text-primary">{m.label}</span>
          <span className="text-caption text-text-secondary">{m.description}</span>
        </span>
        {m.badge && <span className="rounded-full bg-success-subtle px-2.5 py-1 text-label-sm text-success">{m.badge}</span>}
      </label>
      {checked && children && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
