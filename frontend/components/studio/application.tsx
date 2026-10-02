"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Clock, FileText, Link2, ShieldCheck, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { ProductCover } from "@/components/product/product-cover";
import { Button } from "@/components/ui/button";
import { Field, Input, PhoneInput, Select, Textarea } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/misc";
import { PaymentLogo } from "@/components/ui/payment";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { fileSize } from "@/lib/format";
import type { CoverType, PaymentMethod } from "@/lib/types";

type App = {
  id: number;
  step: number;
  studio_name: string | null;
  country: string;
  city: string | null;
  phone: string | null;
  bio: string | null;
  categories: string[] | null;
  portfolio_url: string | null;
  payout_method: string | null;
  payout_account_masked: string | null;
  id_status: string;
  has_id_document: boolean;
  status: string;
  status_label: string;
  submitted: boolean;
  review_note: string | null;
  samples: { name: string; size: number | null }[];
};
type Payload = { application: App | null; defaults: { name: string; phone: string | null; country: string; city: string | null }; is_creator: boolean; categories: string[] };

const STEPS = [
  ["Profil", "Nom, photo, contact"],
  ["Activité", "Catégories, bio, exemples"],
  ["Paiement des revenus", "Compte Mobile Money ou bancaire"],
  ["Vérification", "Pièce d’identité · réponse sous 72 h"],
] as const;
const COUNTRIES: [string, string][] = [["CI", "Côte d’Ivoire"], ["SN", "Sénégal"], ["TG", "Togo"], ["BJ", "Bénin"], ["CM", "Cameroun"], ["BF", "Burkina Faso"], ["ML", "Mali"]];
const PAYOUTS: { v: string; label: string; m?: PaymentMethod }[] = [
  { v: "WAVE", label: "Wave", m: "WAVE" },
  { v: "ORANGE_MONEY", label: "Orange Money", m: "ORANGE_MONEY" },
  { v: "MTN_MOMO", label: "MTN MoMo", m: "MTN_MOMO" },
  { v: "MOOV_MONEY", label: "Moov Money", m: "MOOV_MONEY" },
  { v: "BANK", label: "Compte bancaire" },
];
const SAMPLE_COVERS: CoverType[] = ["sheet", "doc", "grid", "book", "chart"];

/** Écran 40 — candidature créateur en 4 étapes. */
export function Application() {
  const qc = useQueryClient();
  const router = useRouter();
  const { data } = useQuery({ queryKey: ["application"], queryFn: () => api<Payload>("/studio/application") });
  const [step, setStep] = React.useState(1);
  const [f, setF] = React.useState<Record<string, unknown>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!data) return;
    if (data.is_creator) router.replace("/studio");
    const a = data.application;
    setF({
      studio_name: a?.studio_name ?? data.defaults.name,
      country: a?.country ?? data.defaults.country ?? "CI",
      city: a?.city ?? data.defaults.city ?? "",
      phone: a?.phone ?? data.defaults.phone ?? "+225",
      bio: a?.bio ?? "",
      categories: a?.categories ?? [],
      portfolio_url: a?.portfolio_url ?? "",
      payout_method: a?.payout_method ?? "WAVE",
      payout_account: "",
    });
    if (a && !a.submitted) setStep(Math.min(4, Math.max(1, a.step)));
  }, [data, router]);

  if (!data) return <Skeleton className="h-[700px] rounded-card" />;
  const a = data.application;

  if (a?.submitted && a.status !== "NEEDS_DOCUMENT" && a.status !== "REJECTED")
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-card border border-border-default bg-bg-surface p-10 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-brand-subtle text-brand-primary">
          <Clock className="size-9" />
        </span>
        <h1 className="text-h2">Candidature envoyée</h1>
        <p className="text-body-lg text-text-secondary">Merci {a.studio_name} ! Notre équipe vérifie votre identité et vos exemples. Réponse par email sous 72 h maximum.</p>
        <Button asChild variant="secondary">
          <Link href="/">Retour à la boutique</Link>
        </Button>
      </div>
    );

  const set = (k: string, v: unknown) => setF((x) => ({ ...x, [k]: v }));
  const save = async (next: number) => {
    setBusy(true);
    setErrors({});
    try {
      const body: Record<string, unknown> = { step };
      if (step === 1) Object.assign(body, { studio_name: f.studio_name, country: f.country, city: f.city, phone: f.phone });
      if (step === 2) Object.assign(body, { studio_name: f.studio_name, bio: f.bio, categories: f.categories, portfolio_url: f.portfolio_url });
      if (step === 3) Object.assign(body, { payout_method: f.payout_method, payout_account: f.payout_account || (a?.payout_account_masked ? null : f.payout_method !== "BANK" ? f.phone : null) });
      if (step < 4) {
        const r = await api<{ application: App }>("/studio/application", { method: "PUT", body });
        qc.setQueryData(["application"], { ...data, application: r.application });
      }
      setStep(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      if (e instanceof ApiError) setErrors(Object.fromEntries(Object.entries(e.errors).map(([k, v]) => [k, v[0]])));
    } finally {
      setBusy(false);
    }
  };
  const upload = async (kind: "sample" | "id", file: File) => {
    const fd = new FormData();
    fd.append("kind", kind);
    fd.append("file", file);
    try {
      const r = await api<{ application: App }>("/studio/application/files", { method: "POST", body: fd });
      qc.setQueryData(["application"], { ...data, application: r.application });
    } catch (e) {
      toast.error(e instanceof ApiError ? (e.field("file") ?? e.message) : "Envoi impossible");
    }
  };
  const submit = async () => {
    setBusy(true);
    try {
      const r = await api<{ application: App }>("/studio/application/submit", { method: "POST" });
      qc.setQueryData(["application"], { ...data, application: r.application });
      toast.success("Candidature envoyée !");
    } catch (e) {
      toast.error(e instanceof ApiError ? (Object.values(e.errors)[0]?.[0] ?? e.message) : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const titles = ["Créez votre profil de créateur", "Parlez-nous de votre activité", "Comment voulez-vous être payé ?", "Vérifiez votre identité"];
  const texts = [
    "Le nom de votre studio apparaîtra sur vos produits et votre boutique publique.",
    "Ces informations nous aident à valider votre studio et à présenter votre profil aux acheteurs.",
    "Vos revenus sont versés sous 48 h ouvrées, après 7 jours de garantie.",
    "Une pièce d’identité valide (CNI, passeport, permis). Elle n’est jamais publiée.",
  ];
  const bio = String(f.bio ?? "");

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        <span className="self-start rounded-full bg-brand-subtle px-2.5 py-1 text-label-sm text-brand-primary">Étape {step} sur 4</span>
        <h1 className="text-h2 md:text-h1">{titles[step - 1]}</h1>
        <p className="text-body-lg text-text-secondary">{texts[step - 1]}</p>
        {a?.status === "NEEDS_DOCUMENT" && a.review_note && <p className="rounded-md bg-warning-subtle px-4 py-3 text-body-sm text-warning">Message de l’équipe : {a.review_note}</p>}
        <div className="grid grid-cols-4 gap-2" aria-hidden>
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={cn("h-1.5 rounded-full", i <= step ? "bg-brand-primary" : "bg-border-default")} />
          ))}
        </div>

        <div className="flex flex-col gap-6 rounded-card border border-border-default bg-bg-surface p-6 md:p-8">
          {step === 1 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Nom public du studio" error={errors.studio_name} className="sm:col-span-2">
                <Input value={String(f.studio_name ?? "")} onChange={(e) => set("studio_name", e.target.value)} placeholder="Ex. : Jean Kouassi Design" />
              </Field>
              <Field label="Pays">
                <Select value={String(f.country ?? "CI")} onChange={(e) => set("country", e.target.value)}>
                  {COUNTRIES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Ville" error={errors.city}>
                <Input value={String(f.city ?? "")} onChange={(e) => set("city", e.target.value)} placeholder="Abidjan" />
              </Field>
              <Field label="Téléphone (WhatsApp)" error={errors.phone} className="sm:col-span-2">
                <PhoneInput value={String(f.phone ?? "+225")} onChange={(v) => set("phone", v)} />
              </Field>
            </div>
          )}

          {step === 2 && (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Nom public du studio" error={errors.studio_name}>
                  <Input value={String(f.studio_name ?? "")} onChange={(e) => set("studio_name", e.target.value)} />
                </Field>
                <Field label="Pays">
                  <Select value={String(f.country ?? "CI")} onChange={(e) => set("country", e.target.value)}>
                    {COUNTRIES.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Biographie courte" error={errors.bio} help={`${bio.length} / 300 caractères`}>
                <Textarea value={bio} maxLength={300} onChange={(e) => set("bio", e.target.value)} placeholder="Votre parcours, votre spécialité, ce que vous apportez aux acheteurs…" />
              </Field>
              <fieldset className="flex flex-col gap-3">
                <legend className="mb-3 text-label">Ce que vous souhaitez vendre</legend>
                <div className="flex flex-wrap gap-2.5">
                  {data.categories.map((c) => {
                    const on = ((f.categories as string[]) ?? []).includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={on}
                        onClick={() => set("categories", on ? (f.categories as string[]).filter((x) => x !== c) : [...((f.categories as string[]) ?? []), c])}
                        className={cn("inline-flex h-[34px] items-center gap-1.5 rounded-full border px-3.5 text-label-sm", on ? "border-brand-primary bg-brand-subtle text-brand-primary" : "border-border-strong text-text-secondary hover:text-text-primary")}
                      >
                        {on && <Check className="size-3.5" />} {c}
                      </button>
                    );
                  })}
                </div>
                {errors.categories && <p className="text-caption text-danger">{errors.categories}</p>}
              </fieldset>
              <Field label="Portfolio ou réseaux (facultatif)">
                <Input icon={<Link2 />} value={String(f.portfolio_url ?? "")} onChange={(e) => set("portfolio_url", e.target.value)} placeholder="behance.net/votre-nom" />
              </Field>
              <div className="flex flex-col gap-3">
                <p className="text-label">Exemples de vos créations</p>
                <div className="flex flex-wrap gap-3">
                  {(a?.samples ?? []).map((s, i) => (
                    <div key={i} className="relative h-[100px] w-[140px] overflow-hidden rounded-md">
                      <ProductCover type={SAMPLE_COVERS[i % 5]} rounded={false} />
                      <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-2 py-1 text-caption text-white">{s.name}</span>
                      <button
                        type="button"
                        aria-label={`Retirer ${s.name}`}
                        onClick={async () => {
                          const r = await api<{ application: App }>(`/studio/application/samples/${i}`, { method: "DELETE" });
                          qc.setQueryData(["application"], { ...data, application: r.application });
                        }}
                        className="absolute top-1.5 right-1.5 rounded-full bg-white p-0.5 shadow"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                  {(a?.samples.length ?? 0) < 5 && (
                    <label className="flex h-[100px] w-[140px] cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border-strong text-label-sm text-brand-primary hover:bg-bg-subtle">
                      <Upload className="size-5" /> Ajouter
                      <input type="file" accept="application/pdf,image/png,image/jpeg" className="sr-only" onChange={(e) => e.target.files?.[0] && upload("sample", e.target.files[0])} disabled={!a} />
                    </label>
                  )}
                </div>
                <p className="text-caption text-text-tertiary">2 à 5 fichiers, aperçus PDF ou images. Ils ne seront pas publiés.</p>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {PAYOUTS.map((p) => (
                  <label key={p.v} className={cn("flex cursor-pointer items-center gap-3 rounded-cover p-4", f.payout_method === p.v ? "border-2 border-brand-primary bg-brand-subtle" : "border border-border-default")}>
                    <input type="radio" name="payout" className="sr-only" checked={f.payout_method === p.v} onChange={() => set("payout_method", p.v)} />
                    {p.m ? <PaymentLogo method={p.m} /> : <span className="flex h-8 w-11 items-center justify-center rounded-sm bg-[#111827] text-label-sm text-white">BQ</span>}
                    <span className="text-label">{p.label}</span>
                  </label>
                ))}
              </div>
              <Field label={f.payout_method === "BANK" ? "IBAN / RIB" : "Numéro du compte"} error={errors.payout_account} help={a?.payout_account_masked ? `Compte enregistré : ${a.payout_account_masked}` : "Le titulaire doit correspondre à votre pièce d’identité."}>
                {f.payout_method === "BANK" ? (
                  <Input value={String(f.payout_account ?? "")} onChange={(e) => set("payout_account", e.target.value)} placeholder="CI93 CI008 …" />
                ) : (
                  <PhoneInput value={String(f.payout_account || f.phone || "+225")} onChange={(v) => set("payout_account", v)} />
                )}
              </Field>
            </>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-4">
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border-strong px-6 py-10 text-center hover:border-brand-primary">
                {a?.has_id_document ? <FileText className="size-8 text-success" /> : <Upload className="size-8 text-brand-primary" />}
                <span className="text-label">{a?.has_id_document ? "Pièce d’identité reçue — remplacer" : "Déposer votre pièce d’identité"}</span>
                <span className="text-caption text-text-tertiary">PDF, JPG ou PNG · 10 Mo maximum · recto-verso lisible</span>
                <input type="file" accept="application/pdf,image/png,image/jpeg" className="sr-only" onChange={(e) => e.target.files?.[0] && upload("id", e.target.files[0])} />
              </label>
              <ul className="flex flex-col gap-2 text-body-sm text-text-secondary">
                <li className="flex items-center gap-2">{(a?.samples.length ?? 0) >= 2 ? <Check className="size-4 text-success" /> : <X className="size-4 text-danger" />} Au moins 2 exemples de créations ({a?.samples.length ?? 0})</li>
                <li className="flex items-center gap-2">{a?.payout_method ? <Check className="size-4 text-success" /> : <X className="size-4 text-danger" />} Compte de paiement des revenus</li>
                <li className="flex items-center gap-2">{a?.has_id_document ? <Check className="size-4 text-success" /> : <X className="size-4 text-danger" />} Pièce d’identité</li>
              </ul>
            </div>
          )}

          <div className="flex flex-wrap justify-between gap-3 border-t border-border-default pt-6">
            <Button variant="secondary" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
              <ArrowLeft /> Retour
            </Button>
            {step < 4 ? (
              <Button loading={busy} onClick={() => save(step + 1)}>
                Continuer : {STEPS[step][0].toLowerCase()} <ArrowRight />
              </Button>
            ) : (
              <Button loading={busy} onClick={submit} disabled={!a?.has_id_document || (a?.samples.length ?? 0) < 2}>
                Envoyer ma candidature <ArrowRight />
              </Button>
            )}
          </div>
        </div>
      </div>

      <aside className="flex flex-col gap-5">
        <ol className="flex flex-col gap-6 rounded-card border border-border-default bg-bg-surface p-6">
          {STEPS.map(([t, d], i) => {
            const n = i + 1;
            const done = n < step;
            return (
              <li key={t} className="flex items-start gap-3.5" aria-current={n === step ? "step" : undefined}>
                <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-label-sm", done ? "bg-success text-white" : n === step ? "bg-brand-primary text-white" : "bg-bg-subtle text-text-tertiary")}>
                  {done ? <Check className="size-4" strokeWidth={3} /> : n}
                </span>
                <span className="flex flex-col">
                  <span className={cn("text-label", n > step ? "text-text-tertiary" : "text-text-primary")}>{t}</span>
                  <span className="text-caption text-text-tertiary">{d}</span>
                </span>
              </li>
            );
          })}
        </ol>
        <div className="flex flex-col gap-3 rounded-card bg-brand-deep p-6 text-white dark:bg-[#1E1B4B]">
          <ShieldCheck className="size-6 text-[#A5B4FC]" />
          <h2 className="text-h4 text-white">Pourquoi une vérification ?</h2>
          <p className="text-body-sm text-[#C7D2FE]">Elle garantit aux acheteurs des produits de qualité, sans contenu piraté, et protège vos revenus contre la fraude.</p>
        </div>
        {a && a.samples.length > 0 && (
          <p className="text-caption text-text-tertiary">
            {a.samples.length} exemple{a.samples.length > 1 ? "s" : ""} · {fileSize(a.samples.reduce((x, s) => x + (s.size ?? 0), 0))}
          </p>
        )}
      </aside>
    </div>
  );
}
