"use client";

import { ArrowRight, Check, Flag, PenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Avatar } from "@/components/ui/misc";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { RatingDistribution, StarPicker, Stars } from "@/components/ui/rating";
import { api, ApiError } from "@/lib/api";
import { ago, rating } from "@/lib/format";
import { useMe } from "@/lib/session";
import type { Paginated, Review } from "@/lib/types";

function ReviewItem({ r }: { r: Review }) {
  return (
    <article className="flex flex-col gap-3 border-b border-border-default py-6 first:pt-0">
      <div className="flex items-start gap-3">
        <Avatar initials={r.initials} size={40} />
        <div className="flex flex-1 flex-col">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-label text-text-primary">{r.author}</span>
            {r.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-subtle px-2.5 py-1 text-label-sm text-success">
                <Check className="size-3" strokeWidth={3} /> Achat vérifié
              </span>
            )}
          </span>
          <span className="text-caption text-text-tertiary">{ago(r.created_at)}</span>
        </div>
        <Stars value={r.rating} size={14} />
      </div>
      {r.comment && <p className="text-body text-text-primary">{r.comment}</p>}
      {r.seller_reply && (
        <div className="ml-12 rounded-md bg-bg-subtle px-4 py-3 text-body-sm text-text-secondary">
          <span className="text-label-sm text-text-primary">Réponse du créateur · </span>
          {r.seller_reply}
        </div>
      )}
    </article>
  );
}

/** Section « Avis des acheteurs » : note globale, distribution, avis vérifiés, écrire un avis. */
export function Reviews({ slug, avg, count, distribution, initial, canReview }: { slug: string; avg: number; count: number; distribution: number[]; initial: Review[]; canReview: boolean }) {
  const [all, setAll] = React.useState<Review[] | null>(null);
  const [page, setPage] = React.useState(1);
  const [last, setLast] = React.useState(1);
  const { user } = useMe();
  const router = useRouter();

  async function loadMore(p = page) {
    const r = await api<Paginated<Review> & { meta: { last_page: number } }>(`/products/${slug}/reviews`, { query: { page: p } });
    setAll((a) => [...(p === 1 ? [] : (a ?? [])), ...r.data]);
    setLast(r.meta.last_page);
    setPage(p + 1);
  }

  return (
    <section id="avis" className="scroll-mt-32 bg-bg-surface">
      <div className="container-site flex flex-col gap-8 py-14">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-2">
            <h2 className="text-h3 md:text-h2">Avis des acheteurs</h2>
            <p className="text-body text-text-secondary">Seuls les clients ayant acheté ce produit peuvent laisser un avis.</p>
          </div>
          {canReview ? (
            <WriteReview slug={slug} onDone={() => router.refresh()} />
          ) : (
            <Button
              variant="secondary"
              onClick={() =>
                toast(user ? "Seuls les acheteurs de ce produit peuvent laisser un avis." : "Connectez-vous avec le compte utilisé pour l’achat.", {
                  action: user ? undefined : { label: "Connexion", onClick: () => router.push(`/connexion?suite=/produit/${slug}`) },
                })
              }
            >
              <PenLine /> Écrire un avis
            </Button>
          )}
        </div>
        <div className="grid gap-10 lg:grid-cols-[360px_1fr]">
          <div className="flex flex-col gap-5 self-start rounded-card bg-bg-page p-7">
            <div className="flex items-center gap-4">
              <span className="font-display text-[56px] leading-none font-extrabold text-text-primary">{rating(avg)}</span>
              <span className="flex flex-col gap-1">
                <Stars value={avg} size={16} />
                <span className="text-body-sm text-text-secondary">{count} avis vérifiés</span>
              </span>
            </div>
            <RatingDistribution distribution={distribution} />
          </div>
          <div className="flex flex-col">
            {(all ?? initial).length === 0 && <p className="text-body text-text-secondary">Aucun avis pour le moment. Soyez le premier à partager votre expérience après l’achat.</p>}
            {(all ?? initial).map((r) => (
              <ReviewItem key={r.id} r={r} />
            ))}
            {count > (all ?? initial).length && (all === null || page <= last) && (
              <button type="button" onClick={() => loadMore(all === null ? 1 : page)} className="mt-5 inline-flex items-center gap-1.5 self-start px-5 text-label text-brand-primary hover:underline">
                {all === null ? `Voir les ${count} avis` : "Voir plus d’avis"} <ArrowRight className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function WriteReview({ slug, onDone }: { slug: string; onDone: () => void }) {
  const [note, setNote] = React.useState(5);
  const [comment, setComment] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <PenLine /> Écrire un avis
        </Button>
      </DialogTrigger>
      <DialogContent title="Votre avis" description="Votre avis sera publié avec le badge « Achat vérifié ».">
        <form
          className="flex flex-col gap-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api(`/products/${slug}/reviews`, { method: "POST", body: { rating: note, comment } });
              toast.success("Merci pour votre avis !");
              setOpen(false);
              onDone();
            } catch (err) {
              toast.error(err instanceof ApiError ? err.message : "Impossible de publier l’avis.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <StarPicker value={note} onChange={setNote} />
          <Field label="Commentaire (facultatif)" htmlFor="rv">
            <Textarea id="rv" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} placeholder="Qu’avez-vous pensé de ce produit ?" />
          </Field>
          <Button type="submit" loading={busy} block>
            Publier mon avis
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** « Signaler ce produit ». */
export function ReportProduct({ slug }: { slug: string }) {
  const [reason, setReason] = React.useState("Contenu copié ou piraté");
  const [details, setDetails] = React.useState("");
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-2 text-body-sm text-text-tertiary hover:text-text-secondary">
        <Flag className="size-4" /> Signaler ce produit
      </DialogTrigger>
      <DialogContent title="Signaler ce produit" description="Notre équipe de modération examine chaque signalement sous 72 h.">
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await api(`/products/${slug}/report`, { method: "POST", body: { reason, details } });
            toast.success("Merci, le signalement a été transmis.");
            setOpen(false);
          }}
        >
          {["Contenu copié ou piraté", "Description trompeuse", "Fichier défectueux", "Contenu inapproprié"].map((r) => (
            <label key={r} className="flex items-center gap-2.5 text-body">
              <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="accent-[var(--brand-primary)]" /> {r}
            </label>
          ))}
          <Field label="Précisions (facultatif)">
            <Input value={details} onChange={(e) => setDetails(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-3">
            <DialogClose asChild>
              <Button variant="secondary" type="button">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit">Envoyer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
