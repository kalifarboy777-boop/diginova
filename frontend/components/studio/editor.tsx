"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bold, Check, Eye, FileText, Image as ImageIcon, Link2, List, Plus, ShieldCheck, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { ProductCover } from "@/components/product/product-cover";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, Toggle } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/misc";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { ago, fcfa, fileSize, num } from "@/lib/format";
import type { CoverType } from "@/lib/types";

type Editor = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  tags: string[];
  category_id: number;
  subcategory_id: number | null;
  category: { name: string; label: string } | null;
  price: number;
  compare_at_price: number | null;
  commercial_price: number | null;
  commercial_enabled: boolean;
  suggested_commercial: number;
  video_url: string | null;
  cover_type: CoverType;
  status: string;
  status_label: string;
  rejection_reason: string | null;
  rights_confirmed: boolean;
  files: { id: number; name: string; size: number; format: string; scan_status: "PENDING" | "CLEAN" | "INFECTED" }[];
  images: { id: number; url: string }[];
  steps: Record<"infos" | "files" | "previews" | "pricing" | "publish", boolean>;
  checklist: { key: string; label: string; done: boolean }[];
  can_submit: boolean;
  updated_at: string;
  categories: { id: number; name: string; children: { id: number; name: string }[] }[];
};

const STEP_LABELS = ["Informations", "Fichiers", "Aperçus", "Prix & licence", "Publication"];

function StepBadge({ state }: { state: "done" | "current" | "todo" }) {
  return state === "done" ? (
    <span className="rounded-full bg-success-subtle px-2.5 py-0.5 text-label-sm text-success">Complété</span>
  ) : state === "current" ? (
    <span className="rounded-full bg-brand-subtle px-2.5 py-0.5 text-label-sm text-brand-primary">En cours</span>
  ) : (
    <span className="rounded-full bg-bg-subtle px-2.5 py-0.5 text-label-sm text-text-secondary">À faire</span>
  );
}

/** Upload avec progression (XHR) : la barre suit l'envoi, puis l'analyse antivirus prend le relais. */
function uploadWithProgress(url: string, form: FormData, onProgress: (p: number) => void): Promise<Editor> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api${url}`);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Accept", "application/json");
    const token = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
    if (token) xhr.setRequestHeader("X-XSRF-TOKEN", decodeURIComponent(token));
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      const data = JSON.parse(xhr.responseText || "{}");
      if (xhr.status < 300) resolve(data);
      else reject(new ApiError(xhr.status, data.message ?? "Envoi impossible", data.errors ?? {}));
    };
    xhr.onerror = () => reject(new ApiError(0, "Connexion interrompue"));
    xhr.send(form);
  });
}

/** Écran 42 — ajout / modification d'un produit en 5 étapes, brouillon enregistré automatiquement. */
export function ProductEditor({ id }: { id?: number }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [productId, setProductId] = React.useState<number | undefined>(id);
  const { data: remote } = useQuery({
    queryKey: ["studio", "product", productId],
    queryFn: () => api<Editor>(`/studio/products/${productId}`),
    enabled: !!productId,
    refetchInterval: (q) => (q.state.data?.files.some((f) => f.scan_status === "PENDING") ? 2500 : false),
  });
  const { data: cats } = useQuery({ queryKey: ["studio", "categories"], queryFn: () => api<{ id: number; name: string; children: { id: number; name: string }[] }[]>("/categories").catch(() => []), enabled: !productId });
  const [p, setP] = React.useState<Partial<Editor>>({ title: "", description: "", tags: [], price: 0, compare_at_price: null, commercial_enabled: true, video_url: "" });
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<string | null>(null);
  const [tag, setTag] = React.useState("");
  const [uploads, setUploads] = React.useState<{ name: string; progress: number; size: number }[]>([]);
  const [drag, setDrag] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (remote && !dirty) {
      setP(remote);
      setSavedAt(remote.updated_at);
    }
  }, [remote, dirty]);

  const editable = !remote || !["PENDING_REVIEW"].includes(remote.status);
  const categories = remote?.categories ?? cats ?? [];

  const save = React.useCallback(
    async (patch: Partial<Editor>) => {
      setSaving(true);
      setErrors({});
      try {
        const body = Object.fromEntries(Object.entries(patch).filter(([k]) => ["title", "description", "tags", "category_id", "subcategory_id", "price", "compare_at_price", "commercial_enabled", "commercial_price", "video_url", "rights_confirmed"].includes(k)));
        if (!productId) {
          if (!patch.title || String(patch.title).length < 3) return;
          const created = await api<Editor>("/studio/products", { method: "POST", body });
          setProductId(created.id);
          qc.setQueryData(["studio", "product", created.id], created);
          router.replace(`/studio/produits/${created.id}/modifier`, { scroll: false });
          setSavedAt(created.updated_at);
        } else {
          const r = await api<Editor>(`/studio/products/${productId}`, { method: "PATCH", body });
          qc.setQueryData(["studio", "product", productId], r);
          setSavedAt(r.updated_at);
        }
        setDirty(false);
      } catch (e) {
        if (e instanceof ApiError) setErrors(Object.fromEntries(Object.entries(e.errors).map(([k, v]) => [k, v[0]])));
      } finally {
        setSaving(false);
      }
    },
    [productId, qc, router],
  );

  // Brouillon automatique : 1,2 s après la dernière frappe.
  React.useEffect(() => {
    if (!dirty || !editable) return;
    const t = setTimeout(() => save(p), 1200);
    return () => clearTimeout(t);
  }, [p, dirty, save, editable]);

  const set = (patch: Partial<Editor>) => {
    setP((x) => ({ ...x, ...patch }));
    setDirty(true);
  };

  if (productId && !remote) return <Skeleton className="h-[900px] rounded-card" />;

  const steps = remote?.steps ?? { infos: false, files: false, previews: false, pricing: false, publish: false };
  const order = ["infos", "files", "previews", "pricing", "publish"] as const;
  const current = order.findIndex((k) => !steps[k]);
  const state = (i: number) => (steps[order[i]] ? "done" : i === current ? "current" : "todo") as "done" | "current" | "todo";
  const allCats = categories;
  const subcats = categories.find((c) => c.id === p.category_id)?.children ?? [];

  const sendFiles = async (files: FileList | File[]) => {
    if (!productId) {
      toast("Saisissez d’abord le titre du produit pour créer le brouillon.");
      return;
    }
    for (const file of Array.from(files)) {
      setUploads((u) => [...u, { name: file.name, progress: 0, size: file.size }]);
      const fd = new FormData();
      fd.append("file", file);
      try {
        const r = await uploadWithProgress(`/studio/products/${productId}/files`, fd, (pr) => setUploads((u) => u.map((x) => (x.name === file.name ? { ...x, progress: pr } : x))));
        qc.setQueryData(["studio", "product", productId], r);
      } catch (e) {
        toast.error(e instanceof ApiError ? (e.field("file") ?? e.message) : "Envoi impossible");
      } finally {
        setUploads((u) => u.filter((x) => x.name !== file.name));
      }
    }
  };
  const sendImage = async (file: File) => {
    if (!productId) return toast("Saisissez d’abord le titre du produit.");
    const fd = new FormData();
    fd.append("image", file);
    try {
      qc.setQueryData(["studio", "product", productId], await api<Editor>(`/studio/products/${productId}/images`, { method: "POST", body: fd }));
    } catch (e) {
      toast.error(e instanceof ApiError ? (e.field("image") ?? e.message) : "Envoi impossible");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="-mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <p className="text-body-lg text-text-secondary" aria-live="polite">
          {saving ? "Enregistrement…" : savedAt ? `Brouillon enregistré automatiquement ${ago(savedAt)}.` : "Commencez par le titre : le brouillon s’enregistre tout seul."}
        </p>
        <div className="flex gap-3">
          {remote && (
            <Button asChild variant="secondary">
              <Link href={`/produit/${remote.slug}`} target="_blank">
                <Eye /> Aperçu
              </Link>
            </Button>
          )}
          <Button variant="secondary" loading={saving} onClick={() => save(p)} disabled={!editable}>
            Enregistrer le brouillon
          </Button>
        </div>
      </div>

      {remote?.rejection_reason && (
        <p className="rounded-card bg-danger-subtle px-5 py-4 text-body-sm text-danger" role="alert">
          <strong>Motif de la modération :</strong> {remote.rejection_reason}
        </p>
      )}
      {remote?.status === "PENDING_REVIEW" && <p className="rounded-card bg-warning-subtle px-5 py-4 text-body-sm text-warning">Produit en cours de modération (72 h maximum) : les modifications sont bloquées.</p>}

      <ol className="flex flex-wrap items-center gap-3 rounded-card border border-border-default bg-bg-surface px-5 py-4">
        {STEP_LABELS.map((l, i) => {
          const st = state(i);
          return (
            <li key={l} className="flex flex-1 items-center gap-3" aria-current={st === "current" ? "step" : undefined}>
              <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-label-sm", st === "done" ? "bg-success text-white" : st === "current" ? "bg-brand-primary text-white" : "bg-bg-subtle text-text-tertiary")}>
                {st === "done" ? <Check className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn("text-label whitespace-nowrap max-md:hidden", st === "todo" ? "text-text-tertiary" : "text-text-primary")}>{l}</span>
              {i < 4 && <span className={cn("h-0.5 flex-1 rounded-full max-sm:hidden", st === "done" ? "bg-success" : "bg-border-default")} />}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <fieldset disabled={!editable} className="flex min-w-0 flex-col gap-6">
          <section className={cn("flex flex-col gap-5 rounded-card border bg-bg-surface p-6", state(0) === "current" ? "border-2 border-brand-primary" : "border-border-default")}>
            <div className="flex items-center gap-3">
              <h2 className="text-h4">1. Informations</h2>
              <StepBadge state={state(0)} />
            </div>
            <Field label="Titre du produit" htmlFor="pt" error={errors.title} action={<span className="text-caption text-text-tertiary">{(p.title ?? "").length}/80</span>}>
              <Input id="pt" maxLength={80} value={p.title ?? ""} onChange={(e) => set({ title: e.target.value })} placeholder="Ex. : Pack Notion étudiant — organisation & révisions" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Catégorie" htmlFor="pc">
                <Select id="pc" value={p.category_id ?? ""} onChange={(e) => set({ category_id: Number(e.target.value), subcategory_id: null })}>
                  <option value="" disabled>
                    Choisir…
                  </option>
                  {allCats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Sous-catégorie" htmlFor="ps">
                <Select id="ps" value={p.subcategory_id ?? ""} onChange={(e) => set({ subcategory_id: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">—</option>
                  {subcats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Description" htmlFor="pd" error={errors.description} help={`${(p.description ?? "").length} caractères · 150 minimum`}>
              <div className="overflow-hidden rounded-btn border border-border-strong focus-within:border-brand-primary">
                <div className="flex gap-3 border-b border-border-default bg-bg-page px-3.5 py-2 text-text-secondary" aria-hidden>
                  <Bold className="size-4" />
                  <List className="size-4" />
                  <Link2 className="size-4" />
                  <ImageIcon className="size-4" />
                </div>
                <Textarea id="pd" value={p.description ?? ""} onChange={(e) => set({ description: e.target.value })} className="rounded-none border-0 focus:shadow-none" placeholder="Contenu, formats, à qui s’adresse le produit, ce qu’il permet d’obtenir…" />
              </div>
            </Field>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-body-sm text-text-secondary">Mots-clés :</span>
              {(p.tags ?? []).map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-bg-subtle px-2.5 py-1 text-label-sm text-text-secondary">
                  {t}
                  <button type="button" aria-label={`Retirer ${t}`} onClick={() => set({ tags: (p.tags ?? []).filter((x) => x !== t) })}>
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === ",") && tag.trim()) {
                    e.preventDefault();
                    if ((p.tags ?? []).length < 10) set({ tags: [...new Set([...(p.tags ?? []), tag.trim().toLowerCase()])] });
                    setTag("");
                  }
                }}
                placeholder="+ ajouter (Entrée)"
                aria-label="Ajouter un mot-clé"
                className="h-7 w-36 bg-transparent text-body-sm outline-none"
              />
            </div>
          </section>

          <section className={cn("flex flex-col gap-4 rounded-card border bg-bg-surface p-6", state(1) === "current" ? "border-2 border-brand-primary" : "border-border-default")}>
            <div className="flex items-center gap-3">
              <h2 className="text-h4">2. Fichiers à livrer</h2>
              <StepBadge state={state(1)} />
            </div>
            {(remote?.files ?? []).map((f) => (
              <div key={f.id} className="flex items-center gap-4 rounded-lg border border-border-default p-4">
                <span className="flex size-10 items-center justify-center rounded-md bg-brand-subtle text-brand-primary">
                  <FileText className="size-[18px]" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="truncate text-label">{f.name}</span>
                  <span className="h-1 overflow-hidden rounded-full bg-bg-subtle">
                    <span className={cn("block h-full rounded-full", f.scan_status === "CLEAN" ? "w-full bg-success" : f.scan_status === "INFECTED" ? "w-full bg-danger" : "w-2/3 animate-pulse bg-brand-primary")} />
                  </span>
                  <span className="text-caption text-text-tertiary">{fileSize(f.size)}</span>
                </div>
                <span className={cn("rounded-full px-2.5 py-1 text-label-sm whitespace-nowrap", f.scan_status === "CLEAN" ? "bg-success-subtle text-success" : f.scan_status === "INFECTED" ? "bg-danger-subtle text-danger" : "bg-warning-subtle text-warning")}>
                  {f.scan_status === "CLEAN" ? "Analyse antivirus OK" : f.scan_status === "INFECTED" ? "Menace détectée" : "Analyse en cours…"}
                </span>
                <button
                  type="button"
                  aria-label={`Supprimer ${f.name}`}
                  onClick={async () => qc.setQueryData(["studio", "product", productId], await api<Editor>(`/studio/products/${productId}/files/${f.id}`, { method: "DELETE" }))}
                  className="rounded p-1 text-text-tertiary hover:bg-bg-subtle"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
            {uploads.map((u) => (
              <div key={u.name} className="flex items-center gap-4 rounded-lg border border-border-default p-4">
                <Upload className="size-5 text-brand-primary" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <span className="text-label">{u.name}</span>
                  <span className="h-1 overflow-hidden rounded-full bg-bg-subtle">
                    <span className="block h-full rounded-full bg-brand-primary transition-[width]" style={{ width: `${u.progress}%` }} />
                  </span>
                  <span className="text-caption text-text-tertiary">
                    {fileSize(u.size)} · envoi {u.progress} %
                  </span>
                </div>
              </div>
            ))}
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                sendFiles(e.dataTransfer.files);
              }}
              className={cn("flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors", drag ? "border-brand-primary bg-brand-subtle" : "border-border-strong hover:border-brand-primary")}
            >
              <Upload className="size-6 text-brand-primary" />
              <span className="text-label">Glissez vos fichiers ici ou parcourez</span>
              <span className="text-caption text-text-tertiary">ZIP, PDF, DOCX, XLSX, PPTX… 2 Go maximum par fichier</span>
              <input type="file" multiple className="sr-only" onChange={(e) => e.target.files && sendFiles(e.target.files)} />
            </label>
          </section>

          <section className={cn("flex flex-col gap-4 rounded-card border bg-bg-surface p-6", state(2) === "current" ? "border-2 border-brand-primary" : "border-border-default")}>
            <div className="flex items-center gap-3">
              <h2 className="text-h4">3. Aperçus (images et vidéo)</h2>
              <StepBadge state={state(2)} />
            </div>
            <p className="text-body-sm text-text-secondary">Ajoutez 3 à 8 visuels fidèles au contenu. La première image sert de couverture.</p>
            <div className="flex flex-wrap gap-3">
              {(remote?.images ?? []).map((img, i) => (
                <div key={img.id} className="relative h-28 w-[150px] overflow-hidden rounded-md border border-border-default">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={`Aperçu ${i + 1}`} className="size-full object-cover" />
                  {i === 0 && <span className="absolute top-2 left-2 rounded-full bg-accent-amber px-2 py-0.5 text-label-sm text-white">Couverture</span>}
                  <button
                    type="button"
                    aria-label="Supprimer l’aperçu"
                    onClick={async () => qc.setQueryData(["studio", "product", productId], await api<Editor>(`/studio/products/${productId}/images/${img.id}`, { method: "DELETE" }))}
                    className="absolute top-2 right-2 rounded-full bg-white p-0.5 shadow"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
              {(remote?.images.length ?? 0) < 8 && (
                <label className="flex h-28 w-[150px] cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border-strong text-label-sm text-brand-primary hover:bg-bg-subtle">
                  <Plus className="size-5" /> Ajouter
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && sendImage(e.target.files[0])} />
                </label>
              )}
            </div>
            <Field label="Lien vidéo de démonstration (facultatif)" error={errors.video_url}>
              <Input value={p.video_url ?? ""} onChange={(e) => set({ video_url: e.target.value || null })} placeholder="https://youtu.be/…" />
            </Field>
          </section>

          <section className={cn("flex flex-col gap-4 rounded-card border bg-bg-surface p-6", state(3) === "current" ? "border-2 border-brand-primary" : "border-border-default")}>
            <div className="flex items-center gap-3">
              <h2 className="text-h4">4. Prix & licence</h2>
              <StepBadge state={state(3)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prix (licence personnelle)" error={errors.price}>
                <Input inputMode="numeric" value={p.price ? num(p.price) : ""} onChange={(e) => set({ price: Number(e.target.value.replace(/\D/g, "")) || 0 })} suffix={<span className="text-body-sm text-text-tertiary">FCFA</span>} placeholder="6 000" />
              </Field>
              <Field label="Prix barré (facultatif)" error={errors.compare_at_price}>
                <Input inputMode="numeric" value={p.compare_at_price ? num(p.compare_at_price) : ""} onChange={(e) => set({ compare_at_price: Number(e.target.value.replace(/\D/g, "")) || null })} suffix={<span className="text-body-sm text-text-tertiary">FCFA</span>} />
              </Field>
            </div>
            <div className="flex items-center gap-4 rounded-md bg-bg-page px-4 py-3">
              <span className="flex flex-1 flex-col">
                <span className="text-label">Proposer une licence commerciale</span>
                <span className="text-caption text-text-tertiary">Prix suggéré : +50 % ({fcfa(Math.round((p.price ?? 0) * 1.5))})</span>
              </span>
              <Toggle label="Licence commerciale" checked={!!p.commercial_enabled} onChange={(v) => set({ commercial_enabled: v, commercial_price: v ? Math.round((p.price ?? 0) * 1.5) : null })} />
            </div>
            {p.commercial_enabled && (
              <Field label="Prix licence commerciale">
                <Input inputMode="numeric" value={p.commercial_price ? num(p.commercial_price) : ""} onChange={(e) => set({ commercial_price: Number(e.target.value.replace(/\D/g, "")) || null })} suffix={<span className="text-body-sm text-text-tertiary">FCFA</span>} />
              </Field>
            )}
          </section>

          <section className="flex flex-col gap-4 rounded-card border border-border-default bg-bg-surface p-6">
            <div className="flex items-center gap-3">
              <h2 className="text-h4">5. Publication</h2>
              <StepBadge state={state(4)} />
            </div>
            <label className="flex items-start gap-3 text-body text-text-secondary">
              <input type="checkbox" checked={!!p.rights_confirmed} onChange={(e) => set({ rights_confirmed: e.target.checked })} className="mt-1 size-[18px] accent-[var(--brand-primary)]" />
              Je certifie détenir tous les droits sur ce contenu (textes, images, polices, modèles) et accepte les règles de modération.
            </label>
          </section>
        </fieldset>

        <aside className="flex flex-col gap-5 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-card border border-border-default bg-bg-surface p-6">
            <p className="mb-4 text-label text-text-secondary">Aperçu en boutique</p>
            <div className="aspect-[292/219] overflow-hidden rounded-md">
              {remote?.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={remote.images[0].url} alt="" className="size-full object-cover" />
              ) : (
                <ProductCover type={remote?.cover_type ?? "doc"} rounded={false} />
              )}
            </div>
            <p className="mt-4 text-overline text-text-tertiary">{remote?.category?.label ?? "CATÉGORIE"}</p>
            <p className="mt-1.5 text-body-medium">{p.title || "Titre du produit"}</p>
            <p className="mt-3 flex items-center gap-2">
              <span className="text-price">{fcfa(p.price ?? 0)}</span>
              {p.compare_at_price && p.compare_at_price > (p.price ?? 0) && <s className="text-body-sm text-text-tertiary">{num(p.compare_at_price)}</s>}
            </p>
          </section>
          <section className="rounded-card border border-border-default bg-bg-surface p-6">
            <h2 className="mb-4 text-h4">Checklist qualité</h2>
            <ul className="flex flex-col gap-3">
              {(remote?.checklist ?? []).map((c) => (
                <li key={c.key} className={cn("flex items-center gap-3 text-body-sm", c.done ? "text-text-primary" : "text-text-secondary")}>
                  <span className={cn("flex size-5 items-center justify-center rounded-full", c.done ? "bg-success text-white" : "bg-bg-subtle")}>{c.done && <Check className="size-3" strokeWidth={3} />}</span>
                  {c.label}
                </li>
              ))}
            </ul>
          </section>
          <Button
            size="lg"
            block
            disabled={!remote?.can_submit || dirty}
            loading={submitting}
            onClick={async () => {
              setSubmitting(true);
              try {
                qc.setQueryData(["studio", "product", productId], await api<Editor>(`/studio/products/${productId}/submit`, { method: "POST" }));
                toast.success("Produit soumis à la modération. Réponse sous 72 h.");
                router.push("/studio/produits");
              } catch (e) {
                toast.error(e instanceof ApiError ? (Object.values(e.errors)[0]?.[0] ?? e.message) : "Soumission impossible");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            Soumettre à la modération
          </Button>
          <p className="flex items-center gap-2 text-body-sm text-text-secondary">
            <ShieldCheck className="size-4" /> Délai de modération : 72 h maximum.
          </p>
        </aside>
      </div>
    </div>
  );
}
