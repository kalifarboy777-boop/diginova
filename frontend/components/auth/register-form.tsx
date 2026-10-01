"use client";

import { ArrowRight, Mail, ShoppingBag, Store, User } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, PasswordInput, PhoneInput } from "@/components/ui/field";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useRefreshSession } from "@/lib/session";
import { AuthTitle } from "./bits";

/** Écran 11 — inscription (acheteur / vendeur). */
export function RegisterForm() {
  const params = useSearchParams();
  const router = useRouter();
  const refresh = useRefreshSession();
  const [type, setType] = React.useState<"buyer" | "seller">(params.get("type") === "vendeur" ? "seller" : "buyer");
  const [form, setForm] = React.useState({ name: "", email: "", phone: "+225", password: "" });
  const [terms, setTerms] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const r = await api<{ next: string }>("/auth/register", { method: "POST", body: { ...form, account_type: type, accept_terms: terms } });
      await refresh();
      const suite = params.get("suite");
      router.push(suite && !r.next.includes("suite") ? `${r.next}&suite=${encodeURIComponent(suite)}` : r.next);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])));
        if (!Object.keys(err.errors).length) toast.error(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  const types = [
    { v: "buyer" as const, icon: ShoppingBag, title: "Je veux acheter", text: "Accès à la boutique" },
    { v: "seller" as const, icon: Store, title: "Je veux vendre", text: "Ouvrir un studio" },
  ];

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <AuthTitle title="Créez votre compte" text="Gratuit, en moins d’une minute." />
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Type de compte">
        {types.map(({ v, icon: Icon, title, text }) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={type === v}
            onClick={() => setType(v)}
            className={cn("flex flex-col items-start gap-2 rounded-cover p-4 text-left transition-colors", type === v ? "border-2 border-brand-primary bg-brand-subtle" : "border border-border-strong bg-bg-surface hover:bg-bg-subtle")}
          >
            <Icon className={cn("size-5", type === v ? "text-brand-primary" : "text-text-secondary")} />
            <span className="text-label text-text-primary">{title}</span>
            <span className="text-caption text-text-secondary">{text}</span>
          </button>
        ))}
      </div>
      <Field label="Nom complet" htmlFor="name" error={errors.name}>
        <Input id="name" autoComplete="name" icon={<User />} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} invalid={!!errors.name} placeholder="Aïcha Koné" />
      </Field>
      <Field label="Adresse email" htmlFor="email" error={errors.email}>
        <Input id="email" type="email" autoComplete="email" icon={<Mail />} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} invalid={!!errors.email} placeholder="vous@exemple.ci" />
      </Field>
      <Field label="Téléphone (Mobile Money)" htmlFor="phone" error={errors.phone} help="Utilisé pour vos paiements et la récupération de compte.">
        <PhoneInput id="phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} invalid={!!errors.phone} />
      </Field>
      <Field label="Mot de passe" htmlFor="password" error={errors.password}>
        <PasswordInput id="password" autoComplete="new-password" meter value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} invalid={!!errors.password} placeholder="8 caractères minimum" />
      </Field>
      <div className="flex flex-col gap-1">
        <Checkbox
          checked={terms}
          onChange={(e) => setTerms(e.target.checked)}
          label={
            <>
              J’accepte les{" "}
              <Link href="/cgu" className="underline">
                conditions générales d’utilisation
              </Link>{" "}
              et la{" "}
              <Link href="/confidentialite" className="underline">
                politique de confidentialité
              </Link>
              .
            </>
          }
        />
        {errors.accept_terms && <p className="text-caption text-danger">{errors.accept_terms}</p>}
      </div>
      <Button type="submit" size="lg" block loading={busy}>
        Créer mon compte <ArrowRight />
      </Button>
      <p className="text-center text-body text-text-secondary">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="text-label text-brand-primary hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
