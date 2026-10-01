import { StarIcon } from "./icons";
import { cn } from "@/lib/cn";
import { rating as fmt } from "@/lib/format";

/** « ★ 4,9 (127) » — étoile 14 px ambre, note Label/Small, nombre Caption tertiaire. */
export function RatingInline({ value, count, className, size = 14 }: { value: number; count?: number; className?: string; size?: number }) {
  if (!count && !value) return null;
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-label={`Note ${fmt(value)} sur 5${count ? `, ${count} avis` : ""}`}>
      <StarIcon className="text-accent-amber" style={{ width: size, height: size }} />
      <span className="text-label-sm text-text-primary">{fmt(value)}</span>
      {count !== undefined && <span className="text-caption text-text-tertiary">({count})</span>}
    </span>
  );
}

/** Rangée d'étoiles (avis, distribution). */
export function Stars({ value, size = 16, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5", className)} aria-label={`${value} étoiles sur 5`} role="img">
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} className={i <= Math.round(value) ? "text-accent-amber" : "text-border-strong"} style={{ width: size, height: size }} />
      ))}
    </span>
  );
}

/** Sélecteur d'étoiles pour écrire un avis. */
export function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Votre note">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} étoile${i > 1 ? "s" : ""}`} onClick={() => onChange(i)} className="rounded p-0.5">
          <StarIcon className={cn("size-7 transition-colors", i <= value ? "text-accent-amber" : "text-border-strong hover:text-accent-amber/60")} />
        </button>
      ))}
    </div>
  );
}

/** Barres « 5 ★ — 88 % » de la fiche produit. */
export function RatingDistribution({ distribution }: { distribution: number[] }) {
  return (
    <div className="flex flex-col gap-2">
      {[5, 4, 3, 2, 1].map((s) => {
        const pct = distribution[5 - s] ?? 0;
        return (
          <div key={s} className="flex items-center gap-3 text-body-sm">
            <span className="w-7 text-text-secondary">{s} ★</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-bg-subtle">
              <span className="block h-full rounded-full bg-accent-amber" style={{ width: `${pct}%` }} />
            </span>
            <span className="w-9 text-right text-text-secondary tabular-nums">{pct} %</span>
          </div>
        );
      })}
    </div>
  );
}
