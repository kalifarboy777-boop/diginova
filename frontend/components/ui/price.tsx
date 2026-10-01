import { cn } from "@/lib/cn";
import { fcfa, num } from "@/lib/format";

/** Prix FCFA (Price/Default ou Price/Large) + ancien prix barré. */
export function PriceTag({
  price,
  compareAt,
  size = "md",
  className,
  compareFull,
  stacked,
}: {
  price: number;
  compareAt?: number | null;
  size?: "md" | "lg";
  className?: string;
  compareFull?: boolean;
  stacked?: boolean;
}) {
  const showCompare = compareAt && compareAt > price;
  return (
    <span className={cn("inline-flex", stacked ? "flex-col items-end gap-1" : "items-center gap-2", className)}>
      <span className={cn(size === "lg" ? "text-price-lg" : "text-price", "whitespace-nowrap text-text-primary")}>{fcfa(price)}</span>
      {showCompare && <s className="text-body-sm whitespace-nowrap text-text-tertiary">{compareFull ? fcfa(compareAt) : num(compareAt)}</s>}
    </span>
  );
}
