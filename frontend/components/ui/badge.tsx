import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/** Badge du Figma : Marque / Succès / Alerte / Danger / Neutre / Promo — pastille 24 px, Label/Small. */
export const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-label-sm whitespace-nowrap [&_svg]:size-3", {
  variants: {
    tone: {
      brand: "bg-brand-subtle text-brand-primary",
      success: "bg-success-subtle text-success",
      warning: "bg-warning-subtle text-warning",
      danger: "bg-danger-subtle text-danger",
      neutral: "bg-bg-subtle text-text-secondary",
      promo: "bg-accent-amber text-white",
      solid: "bg-brand-primary text-white",
      dark: "bg-[#111827] text-white",
    },
    size: { md: "", sm: "px-2 py-0.5 text-[11px] leading-4" },
  },
  defaultVariants: { tone: "brand", size: "md" },
});

export function Badge({ className, tone, size, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}

/** Badge automatique à partir du libellé produit (« Best-seller », « Nouveau », « -33 % »). */
export function ProductBadge({ label, className }: { label: string; className?: string }) {
  const tone = label === "Best-seller" ? "promo" : label.startsWith("-") ? "danger" : label === "Nouveau" ? "brand" : "neutral";
  return (
    <Badge tone={tone} className={className}>
      {label}
    </Badge>
  );
}
