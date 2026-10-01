import { Zap } from "lucide-react";
import Link from "next/link";

/** Bandeau d'annonce (40 px, brand/deep). */
export function AnnouncementBar({ text, href = "/packs" }: { text: string; href?: string }) {
  return (
    <div className="flex min-h-10 items-center justify-center gap-2.5 bg-brand-deep px-4 py-2 text-center text-label-sm text-white dark:bg-[#1E1B4B]">
      <Zap className="size-3.5 shrink-0 fill-accent-amber text-accent-amber" aria-hidden />
      <span>{text}</span>
      <Link href={href} className="whitespace-nowrap text-[#A5B4FC] hover:text-white">
        En profiter →
      </Link>
    </div>
  );
}
