"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Check, Download, FileText, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";
import { ProductCover } from "@/components/product/product-cover";
import { Button } from "@/components/ui/button";
import { Checkbox, Textarea } from "@/components/ui/field";
import { Avatar, EmptyState, Pill, Skeleton } from "@/components/ui/misc";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { fcfaShort, fileSize, num, rating } from "@/lib/format";
import type { CoverType } from "@/lib/types";

type Item = { id: number; title: string; seller: string; cover_type: CoverType; submitted_at: string | null; hours_waiting: number | null; hours_left: number | null; scan_ok: boolean };
type Detail = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  cover_type: CoverType;
  status: string;
  category: string;
  subcategory: string | null;
  price: number;
  compare_at_price: number | null;
  commercial: boolean;
  rights: boolean;
  rejection_reason: string | null;
  images: string[];
  files: { id: number; name: string; size: number; scan_status: string }[];
  total_size: number;
  seller: { name: string; initials: string; verified: boolean; products: number; rating: number };
};

const CHECKS = ["Aperçus fidèles au contenu", "Pas de contenu protégé", "Description exacte", "Prix cohérent", "Qualité professionnelle", "Fichiers ouverts et testés"];

/** Écran 51 — modération des produits. */
export function Moderation() {
  const qc = useQueryClient();
  const [status, setStatus] = React.useState("PENDING_REVIEW");
  const [selected, setSelected] = React.useState<number | null>(null);
  const { data } = useQuery({ queryKey: ["admin", "moderation", status], queryFn: () => api<{ counts: Record<string, number>; target_hours: number; data: Item[] }>("/admin/moderation", { query: { status } }) });
  React.useEffect(() => {
    if (data && !data.data.find((i) => i.id === selected)) setSelected(data.data[0]?.id ?? null);
  }, [data, selected]);

  if (!data) return <Skeleton className="h-[700px] rounded-card" />;
  const c = data.counts;
  return (
    <div className="flex flex-col gap-6">
      <p className="-mt-5 text-body-lg text-text-secondary">
        {c.PENDING_REVIEW ?? 0} produits en attente · délai cible {data.target_hours} h
      </p>
      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            {[
              ["PENDING_REVIEW", `En attente (${c.PENDING_REVIEW ?? 0})`],
              ["CHANGES_REQUESTED", `Modifications (${c.CHANGES_REQUESTED ?? 0})`],
              ["REJECTED", `Refusés (${c.REJECTED ?? 0})`],
            ].map(([v, l]) => (
              <Pill key={v} active={status === v} onClick={() => setStatus(v)} className="h-8 px-3 text-label-sm">
                {l}
              </Pill>
            ))}
          </div>
          {data.data.length === 0 && (
            <div className="rounded-card border border-border-default bg-bg-surface">
              <EmptyState icon={<Box />} title="File vide" text="Aucun produit dans cette catégorie." />
            </div>
          )}
          {data.data.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => setSelected(i.id)}
              aria-current={selected === i.id}
              className={cn("flex items-center gap-4 rounded-lg border bg-bg-surface p-3.5 text-left", selected === i.id ? "border-2 border-brand-primary bg-brand-subtle" : "border-border-default hover:border-border-strong")}
            >
              <span className="h-[54px] w-[72px] shrink-0 overflow-hidden rounded-sm">
                <ProductCover type={i.cover_type} rounded={false} />
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-label text-text-primary">{i.title.split(" —")[0]}</span>
                <span className="truncate text-caption text-text-tertiary">
                  par {i.seller} · Soumis il y a {i.hours_waiting} h
                </span>
                <span className="flex gap-2">
                  {i.hours_left !== null && status === "PENDING_REVIEW" && (
                    <span className={cn("rounded-full px-2 py-0.5 text-label-sm", i.hours_left < 36 ? "bg-warning-subtle text-warning" : "bg-bg-subtle text-text-secondary")}>Reste {i.hours_left} h</span>
                  )}
                  <span className={cn("rounded-full px-2 py-0.5 text-label-sm", i.scan_ok ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning")}>{i.scan_ok ? "Antivirus OK" : "Analyse en cours"}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
        {selected && <ModerationDetail key={selected} id={selected} onDone={() => qc.invalidateQueries({ queryKey: ["admin"] })} />}
      </div>
    </div>
  );
}

function ModerationDetail({ id, onDone }: { id: number; onDone: () => void }) {
  const { data: p } = useQuery({ queryKey: ["admin", "moderation", "item", id], queryFn: () => api<Detail>(`/admin/moderation/${id}`) });
  const [checks, setChecks] = React.useState<string[]>([]);
  const [message, setMessage] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  if (!p) return <Skeleton className="h-[700px] rounded-card" />;
  const pending = p.status === "PENDING_REVIEW" || p.status === "CHANGES_REQUESTED";

  const decide = async (decision: "approve" | "reject" | "changes") => {
    setBusy(decision);
    setError(null);
    try {
      await api(`/admin/moderation/${id}/decision`, { method: "POST", body: { decision, message: message || null, checklist: checks } });
      toast.success(decision === "approve" ? "Produit publié" : decision === "reject" ? "Produit refusé" : "Modifications demandées");
      setMessage("");
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? (e.field("message") ?? e.message) : "Erreur");
    } finally {
      setBusy(null);
    }
  };
  const fileUrl = async (fid: number) => {
    const r = await api<{ url: string }>(`/admin/moderation/${id}/files/${fid}`);
    window.open(r.url, "_blank");
  };

  return (
    <section className="flex flex-col gap-6 rounded-card border border-border-default bg-bg-surface p-6 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h2 className="text-h3">{p.title}</h2>
          <p className="flex items-center gap-2 text-body-sm text-text-secondary">
            <Avatar initials={p.seller.initials} size={24} color="#16A34A" />
            {p.seller.name} · {p.seller.verified ? "Créateur vérifié · " : ""}
            {p.seller.products} produits · note {rating(p.seller.rating)}
          </p>
        </div>
        <span className="rounded-full bg-bg-subtle px-2.5 py-1 text-label-sm text-text-secondary">
          {p.category}
          {p.subcategory ? ` · ${p.subcategory}` : ""}
        </span>
      </div>
      <div className="grid grid-cols-[2fr_1fr] gap-3">
        <div className="row-span-2 aspect-[360/240] overflow-hidden rounded-lg bg-bg-subtle">
          {p.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.images[0]} alt="Aperçu principal" className="size-full object-cover" />
          ) : (
            <ProductCover type={p.cover_type} rounded={false} />
          )}
        </div>
        {[1, 2].map((n) => (
          <div key={n} className="aspect-[170/114] overflow-hidden rounded-lg">
            {p.images[n] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.images[n]} alt={`Aperçu ${n + 1}`} className="size-full object-cover" />
            ) : (
              <ProductCover type={n === 1 ? "doc" : "grid"} rounded={false} />
            )}
          </div>
        ))}
      </div>
      {p.images.length < 3 && <p className="rounded-md bg-warning-subtle px-4 py-2.5 text-body-sm text-warning">{p.images.length} aperçu(s) fourni(s) sur 3 minimum.</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Prix", `${fcfaShort(p.price)}${p.compare_at_price ? ` (barré ${num(p.compare_at_price)})` : ""}`],
          ["Licences", p.commercial ? "Personnelle + commerciale" : "Personnelle"],
          ["Fichiers", `${p.files.length} · ${fileSize(p.total_size)}`],
          ["Droits", p.rights ? "Déclarés par le créateur" : "Non déclarés"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-md bg-bg-page px-4 py-3">
            <p className="text-caption text-text-tertiary">{k}</p>
            <p className="text-label-sm text-text-primary">{v}</p>
          </div>
        ))}
      </div>
      {p.description && <p className="text-body-sm whitespace-pre-line text-text-secondary">{p.description}</p>}
      <div className="flex flex-col gap-2.5">
        <h3 className="text-label">Fichiers livrés</h3>
        {p.files.map((f) => (
          <div key={f.id} className="flex items-center gap-3 rounded-md border border-border-default px-4 py-3">
            <FileText className="size-[18px] text-brand-primary" />
            <span className="flex-1 text-label-sm">
              {f.name} · {fileSize(f.size)}
            </span>
            <span className={cn("rounded-full px-2.5 py-1 text-label-sm", f.scan_status === "CLEAN" ? "bg-success-subtle text-success" : f.scan_status === "INFECTED" ? "bg-danger-subtle text-danger" : "bg-warning-subtle text-warning")}>
              {f.scan_status === "CLEAN" ? "Sain · 0 menace" : f.scan_status === "INFECTED" ? "Menace détectée" : "Analyse en cours"}
            </span>
            <button type="button" onClick={() => fileUrl(f.id)} aria-label={`Télécharger ${f.name}`} disabled={f.scan_status === "INFECTED"} className="rounded p-1 text-text-secondary hover:bg-bg-subtle disabled:opacity-40">
              <Download className="size-4" />
            </button>
          </div>
        ))}
      </div>
      {pending ? (
        <>
          <div className="rounded-lg bg-bg-page p-4">
            <h3 className="mb-3 text-label">Checklist modérateur</h3>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {CHECKS.map((c) => (
                <label key={c} className="flex cursor-pointer items-center gap-2.5 text-body text-text-primary">
                  <Checkbox checked={checks.includes(c)} onChange={() => setChecks((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]))} /> {c}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="mod-msg" className="text-label">
              Message au créateur (obligatoire en cas de refus ou de demande de modification)
            </label>
            <Textarea id="mod-msg" value={message} onChange={(e) => setMessage(e.target.value)} invalid={!!error} placeholder="Merci d’ajouter une capture du tableau « Planning de révisions » dans les aperçus." />
            {error && <p className="text-caption text-danger">{error}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="danger-soft" loading={busy === "reject"} onClick={() => decide("reject")}>
              <X /> Refuser
            </Button>
            <Button variant="secondary" loading={busy === "changes"} onClick={() => decide("changes")}>
              Demander des modifications
            </Button>
            <Button className="ml-auto bg-success hover:bg-[#15803D]" loading={busy === "approve"} disabled={checks.length < CHECKS.length} onClick={() => decide("approve")} title={checks.length < CHECKS.length ? "Complétez la checklist" : undefined}>
              <Check /> Approuver et publier
            </Button>
          </div>
        </>
      ) : (
        <p className="rounded-md bg-danger-subtle px-4 py-3 text-body-sm text-danger">Motif communiqué : {p.rejection_reason}</p>
      )}
      <Link href={`/produit/${p.slug}`} target="_blank" className="text-label-sm text-brand-primary hover:underline">
        Prévisualiser la fiche produit
      </Link>
    </section>
  );
}

export function ModerationRules() {
  return (
    <Dialog>
      <DialogTriggerButton />
      <DialogContent title="Règles de modération" wide>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-body text-text-secondary">
          <li>Délai de traitement : 72 h maximum, par ordre d’ancienneté.</li>
          <li>Aperçus fidèles : 3 captures minimum montrant le contenu réel du fichier.</li>
          <li>Aucun contenu protégé (logos de marques, polices sans licence, contenus copiés).</li>
          <li>Pas de promesses trompeuses (« devenir riche », « garanti »…).</li>
          <li>Fichiers ouverts et testés, analysés par l’antivirus.</li>
          <li>Refus ou demande de modifications : message obligatoire, clair et actionnable.</li>
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function DialogTriggerButton() {
  // Bouton « Règles de modération » (écran 51).
  return (
    <DialogTrigger asChild>
      <Button variant="secondary">
        <ShieldCheck /> Règles de modération
      </Button>
    </DialogTrigger>
  );
}
