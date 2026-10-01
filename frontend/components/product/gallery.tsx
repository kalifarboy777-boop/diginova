"use client";

import { Eye, Play } from "lucide-react";
import * as React from "react";
import { ProductBadge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { cn } from "@/lib/cn";
import type { CoverType } from "@/lib/types";
import { ProductCover } from "./product-cover";

const VARIANTS: CoverType[] = ["doc", "sheet", "book", "chat", "notion", "grid", "brand", "chart"];

/** Galerie de la fiche produit : visuel principal, « Feuilleter N pages », vidéo, miniatures. */
export function Gallery({ cover, images, badge, title, pages, video, duration }: { cover: CoverType; images: string[]; badge: string | null; title: string; pages: number; video: string | null; duration: string | null }) {
  const slides: ({ kind: "cover"; type: CoverType } | { kind: "image"; src: string })[] = images.length
    ? images.map((src) => ({ kind: "image" as const, src }))
    : [cover, ...VARIANTS.filter((v) => v !== cover).slice(0, 4)].map((type) => ({ kind: "cover" as const, type }));
  const [i, setI] = React.useState(0);
  const current = slides[i];
  const embed = video ? toEmbed(video) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[680/510] overflow-hidden rounded-[24px]">
        {current.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.src} alt={`${title} — aperçu ${i + 1}`} className="size-full object-cover" />
        ) : (
          <ProductCover type={current.type} rounded={false} title={`${title} — aperçu ${i + 1}`} />
        )}
        {badge && <ProductBadge label={badge} className="absolute top-5 left-5" />}
        <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-3">
          {pages > 0 && (
            <Dialog>
              <DialogTrigger className="inline-flex h-9 items-center gap-2 rounded-md bg-white px-3.5 text-label-sm text-[#111827] shadow-soft">
                <Eye className="size-4" /> Feuilleter {pages} pages
              </DialogTrigger>
              <DialogContent title={`Aperçu · ${title}`} description="Pages d’exemple. Le fichier complet est livré après paiement." wide>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {Array.from({ length: pages }).map((_, n) => (
                    <div key={n} className="aspect-[3/4] overflow-hidden rounded-md border border-border-default">
                      <ProductCover type={n === 0 ? cover : VARIANTS[n % VARIANTS.length]} rounded={false} />
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}
          {embed && (
            <Dialog>
              <DialogTrigger className="ml-auto inline-flex h-9 items-center gap-2 rounded-md bg-[#111827] px-3.5 text-label-sm text-white shadow-soft">
                <Play className="size-3.5 fill-white" /> Vidéo de démonstration{duration ? ` · ${duration}` : ""}
              </DialogTrigger>
              <DialogContent title="Vidéo de démonstration" wide>
                <div className="aspect-video overflow-hidden rounded-md bg-black">
                  <iframe src={embed} title="Vidéo de démonstration" className="size-full" allow="encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      <div className="grid grid-cols-5 gap-3" role="tablist" aria-label="Aperçus">
        {slides.slice(0, 5).map((s, n) => (
          <button
            key={n}
            type="button"
            role="tab"
            aria-selected={i === n}
            aria-label={`Aperçu ${n + 1}`}
            onClick={() => setI(n)}
            className={cn("aspect-[126/94] overflow-hidden rounded-md transition-shadow", i === n ? "ring-2 ring-brand-primary" : "opacity-90 hover:opacity-100")}
          >
            {s.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.src} alt="" className="size-full object-cover" />
            ) : (
              <ProductCover type={s.type} rounded={false} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function toEmbed(url: string): string | null {
  const yt = url.match(/(?:youtu\.be\/|v=)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}
