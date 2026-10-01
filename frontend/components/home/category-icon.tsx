import { BarChart3, Book, Briefcase, Check, Code2, Heart, Music, PenLine, Sparkles, Video } from "lucide-react";
import { cn } from "@/lib/cn";

/** Pastille icône de catégorie (couleurs du Figma, écran 01 « Explorez par univers »). */
const MAP: Record<string, { icon: typeof BarChart3; bg: string; fg: string }> = {
  business: { icon: BarChart3, bg: "#EEEDFF", fg: "#635BFF" },
  design: { icon: PenLine, bg: "#CCFBF1", fg: "#0D9488" },
  "reseaux-sociaux": { icon: Heart, bg: "#FCE7F3", fg: "#DB2777" },
  "e-books-formations": { icon: Book, bg: "#FEF3C7", fg: "#D97706" },
  productivite: { icon: Check, bg: "#F3F4F6", fg: "#374151" },
  "ia-prompts": { icon: Sparkles, bg: "#E0F2FE", fg: "#0284C7" },
  carriere: { icon: Briefcase, bg: "#E0E7FF", fg: "#4338CA" },
  "web-tech": { icon: Code2, bg: "#E0E7FF", fg: "#4338CA" },
  audio: { icon: Music, bg: "#FCE7F3", fg: "#DB2777" },
  video: { icon: Video, bg: "#CCFBF1", fg: "#0D9488" },
};

export function CategoryIcon({ slug, size = 48, className }: { slug: string; size?: number; className?: string }) {
  const m = MAP[slug] ?? MAP.business;
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-lg", className)} style={{ width: size, height: size, background: m.bg, color: m.fg }} aria-hidden>
      <Icon style={{ width: size * 0.42, height: size * 0.42 }} strokeWidth={1.8} />
    </span>
  );
}
