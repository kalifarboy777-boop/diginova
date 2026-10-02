"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronRight, FileText, MoreHorizontal, Star, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { ProductCover } from "@/components/product/product-cover";
import { Button } from "@/components/ui/button";
import { SparkleIcon } from "@/components/ui/icons";
import { EmptyState, Pill, Skeleton } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { StarPicker } from "@/components/ui/rating";
import { Textarea } from "@/components/ui/field";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { date, dayMonth, fileSize } from "@/lib/format";
import type { LibraryItem } from "@/lib/types";
import { DownloadButton } from "./download-button";

type Library = { data: LibraryItem[]; total: number; categories: { slug: string; name: string; count: number }[] };

/** Écran 31 (desktop, grille + panneau de détail) et 65 (mobile, liste). */
export function LibraryView() {
  const params = useSearchParams();
  const router = useRouter();
  const [category, setCategory] = React.useState<string | null>(null);
  const [sort, setSort] = React.useState("recent");
  const [selected, setSelected] = React.useState<number | null>(null);
  const q = params.get("q") ?? "";
  const { data } = useQuery({ queryKey: ["library", category, sort, q], queryFn: () => api<Library>("/account/library", { query: { category, sort, q } }) });

  React.useEffect(() => {
    if (data?.data.length && selected === null && window.matchMedia("(min-width: 1280px)").matches) setSelected(data.data[0].id);
  }, [data, selected]);

  if (!data)
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-80 rounded-card" />
        ))}
      </div>
    );

  if (data.total === 0)
    return (
      <div className="rounded-card border border-border-default bg-bg-surface">
        <EmptyState
          icon={<BookOpen />}
          title="Votre bibliothèque est vide"
          text="Vos achats apparaîtront ici, accessibles à vie avec les mises à jour incluses."
          action={
            <Button asChild>
              <Link href="/boutique">Explorer la boutique</Link>
            </Button>
          }
        />
      </div>
    );

  const update = data.data.find((li) => li.has_update);
  const current = data.data.find((li) => li.id === selected);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="-mx-5 flex flex-1 gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0">
          <Pill active={!category} onClick={() => setCategory(null)} className="h-8 px-3.5 text-label-sm">
            Tous ({data.total})
          </Pill>
          {data.categories.map((c) => (
            <Pill key={c.slug} active={category === c.slug} onClick={() => setCategory(c.slug)} className="h-8 px-3.5 text-label-sm">
              {c.name.replace(" & formations", "")} ({c.count})
            </Pill>
          ))}
        </div>
        <label className="relative">
          <span className="sr-only">Trier</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 appearance-none rounded-btn border border-border-default bg-bg-surface pr-9 pl-3.5 text-label-sm">
            <option value="recent">Plus récents</option>
            <option value="ancien">Plus anciens</option>
            <option value="titre">Titre (A → Z)</option>
          </select>
          <ChevronRight className="pointer-events-none absolute top-2.5 right-3 size-4 rotate-90 text-text-secondary" />
        </label>
      </div>
      {q && (
        <p className="flex items-center gap-2 text-body-sm text-text-secondary">
          Résultats pour « {q} »
          <button type="button" onClick={() => router.push("/compte/bibliotheque")} aria-label="Effacer la recherche" className="rounded p-0.5 hover:bg-bg-subtle">
            <X className="size-4" />
          </button>
        </p>
      )}

      {update && (
        <button type="button" onClick={() => setSelected(update.id)} className="flex items-center gap-4 rounded-card bg-brand-deep px-5 py-4 text-left text-white md:hidden dark:bg-[#1E1B4B]">
          <SparkleIcon className="size-6 text-accent-amber" />
          <span className="flex flex-1 flex-col">
            <span className="text-label">Mise à jour disponible</span>
            <span className="text-body-sm text-[#C7D2FE]">
              {update.product.title.split(" —")[0]} v{update.product.version}
            </span>
          </span>
          <ChevronRight className="size-5" />
        </button>
      )}

      <div className={cn("grid gap-6", current ? "xl:grid-cols-[1fr_360px]" : "")}>
        {/* Mobile : liste compacte (écran 65) */}
        <ul className="flex flex-col gap-3 md:hidden">
          {data.data.map((li) => (
            <li key={li.id} className="flex items-center gap-4 rounded-card border border-border-default bg-bg-surface p-3">
              <button type="button" onClick={() => setSelected(li.id)} className="flex flex-1 items-center gap-3.5 text-left">
                <span className="h-[54px] w-[72px] shrink-0 overflow-hidden rounded-md">
                  <ProductCover type={li.product.cover_type} rounded={false} />
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-label text-text-primary">{li.product.title.split(" —")[0]}</span>
                  <span className="flex items-center gap-2 text-body-sm text-text-tertiary">
                    <span className={cn("rounded-full px-2 py-0.5 text-label-sm", li.has_update ? "bg-success-subtle text-success" : "bg-bg-subtle text-text-secondary")}>v{li.product.version}</span>
                    Acheté le {dayMonth(li.granted_at)}
                  </span>
                </span>
              </button>
              <DownloadButton itemId={li.id} size="icon" aria-label={`Télécharger ${li.product.title}`}>
                {""}
              </DownloadButton>
            </li>
          ))}
        </ul>

        {/* Desktop : grille de cartes (écran 31) */}
        <div className={cn("hidden grid-cols-2 gap-6 md:grid", current ? "xl:grid-cols-2" : "xl:grid-cols-3")}>
          {data.data.map((li) => (
            <article
              key={li.id}
              className={cn("flex flex-col gap-3 rounded-card border bg-bg-surface p-4 transition-colors", selected === li.id ? "border-2 border-brand-primary" : "border-border-default hover:border-border-strong")}
            >
              <button type="button" onClick={() => setSelected(li.id)} className="aspect-[316/178] overflow-hidden rounded-md" aria-label={`Voir le détail de ${li.product.title}`}>
                <ProductCover type={li.product.cover_type} rounded={false} />
              </button>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-label text-text-primary">{li.product.title}</h3>
                <button type="button" onClick={() => setSelected(li.id)} aria-label="Plus d’options" className="rounded p-0.5 text-text-tertiary hover:bg-bg-subtle">
                  <MoreHorizontal className="size-5" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-body-sm text-text-tertiary">
                <span className={cn("rounded-full px-2 py-0.5 text-label-sm", li.has_update ? "bg-success-subtle text-success" : "bg-bg-subtle text-text-secondary")}>v{li.product.version}</span>
                {li.has_update && <span className="rounded-full bg-success-subtle px-2 py-0.5 text-label-sm text-success">Mise à jour</span>}
                Acheté le {date(li.granted_at)}
              </div>
              <div className="mt-auto flex gap-2.5">
                <DownloadButton itemId={li.id} variant="primary" size="md" className="h-9 flex-1" />
                {li.order_id && (
                  <Button asChild variant="secondary" className="h-9">
                    <a href={`/api/account/orders/${li.order_id}/invoice`}>
                      <FileText /> Facture
                    </a>
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>

        {current && <Detail id={current.id} onClose={() => setSelected(null)} />}
      </div>
      <p className="text-caption text-text-tertiary">Chaque clic génère un lien sécurisé valable 15 min.</p>
    </div>
  );
}

function Detail({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: li } = useQuery({ queryKey: ["library", "item", id], queryFn: () => api<{ data: LibraryItem }>(`/account/library/${id}`).then((r) => r.data) });
  const [rating, setRating] = React.useState(false);
  const content = !li ? (
    <Skeleton className="h-[600px] rounded-card" />
  ) : (
    <aside className="flex flex-col gap-5 rounded-card border border-border-default bg-bg-surface p-6 xl:sticky xl:top-6 xl:self-start">
      <div className="flex items-center justify-between">
        <h2 className="text-h4">{li.product.title.split(" —")[0]}</h2>
        <button type="button" onClick={onClose} aria-label="Fermer" className="rounded p-1 text-text-tertiary hover:bg-bg-subtle">
          <X className="size-5" />
        </button>
      </div>
      <div className="aspect-[310/180] overflow-hidden rounded-md">
        <ProductCover type={li.product.cover_type} rounded={false} />
      </div>
      <dl className="flex flex-col gap-3 text-body-sm">
        {[
          ["Version", `${li.product.version}${li.product.version_updated_at ? ` (${date(li.product.version_updated_at)})` : ""}`],
          ["Licence", li.license_label],
          ["Téléchargements", `${li.download_count} sur ${li.download_limit} utilisés`],
          ["Commande", li.order_number ?? "—"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-text-secondary">{k}</dt>
            <dd className="text-right text-label-sm text-text-primary">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-2.5">
        <h3 className="text-label">Fichiers ({li.files?.length ?? 0})</h3>
        {(li.files ?? []).map((f) => (
          <div key={f.id} className="flex items-center gap-3 rounded-md bg-bg-page px-4 py-3">
            <FileText className="size-[18px] text-brand-primary" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-label-sm text-text-primary">{f.name}</span>
              <span className="text-caption text-text-tertiary">{fileSize(f.size)}</span>
            </span>
            <DownloadButton itemId={li.id} fileId={f.id} variant="ghost" size="icon-sm" aria-label={`Télécharger ${f.name}`}>
              {""}
            </DownloadButton>
          </div>
        ))}
      </div>
      <div className="flex gap-2.5">
        <DownloadButton itemId={li.id} variant="primary" size="md" className="flex-1">
          Tout télécharger
        </DownloadButton>
        <Button variant="secondary" disabled={li.reviewed} onClick={() => setRating(true)}>
          <Star /> {li.reviewed ? "Noté" : "Noter"}
        </Button>
      </div>
      <p className="text-caption text-text-tertiary">Chaque clic génère un lien sécurisé valable 15 min.</p>
      <ReviewDialog open={rating} onOpenChange={setRating} slug={li.product.slug} />
    </aside>
  );
  return (
    <>
      <div className="hidden xl:block">{content}</div>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4 xl:hidden" role="dialog" aria-modal onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="mx-auto max-w-md">{content}</div>
      </div>
    </>
  );
}

function ReviewDialog({ open, onOpenChange, slug }: { open: boolean; onOpenChange: (o: boolean) => void; slug: string }) {
  const [note, setNote] = React.useState(5);
  const [comment, setComment] = React.useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Noter ce produit" description="Votre avis sera publié avec le badge « Achat vérifié ».">
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api(`/products/${slug}/reviews`, { method: "POST", body: { rating: note, comment } });
              toast.success("Merci pour votre avis !");
              onOpenChange(false);
            } catch (err) {
              toast.error(err instanceof ApiError ? err.message : "Erreur");
            }
          }}
        >
          <StarPicker value={note} onChange={setNote} />
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Qu’avez-vous pensé de ce produit ?" />
          <Button type="submit" block>
            Publier
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

