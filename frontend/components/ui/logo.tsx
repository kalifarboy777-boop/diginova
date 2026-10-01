import Link from "next/link";
import { cn } from "@/lib/cn";
import { SparkleIcon } from "./icons";

/** Logo DigiNova : pastille violette 34 px (rayon 10) + « DigiNova » Manrope 700 24 px. */
export function Logo({ className, inverse, href = "/", size = 34 }: { className?: string; inverse?: boolean; href?: string | null; size?: number }) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span
        className={cn("font-display font-bold tracking-[-0.005em]", inverse ? "text-white" : "text-text-primary")}
        style={{ fontSize: Math.round(size * 0.7), lineHeight: 1.33 }}
      >
        DigiNova
      </span>
    </span>
  );
  return href ? (
    <Link href={href} aria-label="DigiNova — accueil" className="rounded-btn">
      {content}
    </Link>
  ) : (
    content
  );
}

export function LogoMark({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center bg-brand-primary text-white", className)} style={{ width: size, height: size, borderRadius: size * 0.29 }} aria-hidden>
      <SparkleIcon style={{ width: size * 0.53, height: size * 0.53 }} />
    </span>
  );
}
