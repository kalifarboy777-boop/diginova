"use client";

import { ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, PasswordInput, PhoneInput } from "@/components/ui/field";
import { api, ApiError } from "@/lib/api";
import { useRefreshSession } from "@/lib/session";
import type { User } from "@/lib/types";
import { AuthTitle, GoogleButton, ModeSwitch, PasswordlessHint, Separator } from "./bits";

type Mode = "email" | "phone";

/** Écran 10 (desktop : email par défaut) et 66 (mobile : téléphone par défaut). */
export function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const refresh = useRefreshSession();
  const next = params.get("suite");
  const [mode, setMode] = React.useState<Mode>("email");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [remember, setRemember] = React.useState(true);
  const [phone, setPhone] = React.useState("+225");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setMode("phone");
    if (params.get("erreur") === "google") toast.error("La connexion Google a échoué. Réessayez ou utilisez votre email.");
  }, [params]);

  const fail = (e: unknown) => {
    if (e instanceof ApiError) setErrors(Object.fromEntries(Object.entries(e.errors).map(([k, v]) => [k, v[0]])));
    if (e instanceof ApiError && !Object.keys(e.errors).length) toast.error(e.message);
  };

  async function loginEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy("login");
    setErrors({});
    try {
      const r = await api<{ user?: User; next: string; two_factor?: boolean }>("/auth/login", { method: "POST", body: { email, password, remember } });
      await refresh();
      router.push(r.two_factor ? `${r.next}${next ? `&suite=${encodeURIComponent(next)}` : ""}` : (next ?? r.next));
      router.refresh();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy("otp");
    setErrors({});
    try {
      await api("/auth/otp/send", { method: "POST", body: { phone, purpose: "login" } });
      router.push(`/verification?raison=connexion&tel=${encodeURIComponent(phone)}${next ? `&suite=${encodeURIComponent(next)}` : ""}`);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  }

  async function magicLink() {
    if (!email) {
      setErrors({ email: "Saisissez votre adresse email pour recevoir le lien." });
      return;
    }
    setBusy("magic");
    try {
      const r = await api<{ message: string }>("/auth/magic-link", { method: "POST", body: { email } });
      toast.success(r.message);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <AuthTitle title="Bon retour parmi nous" text="Connectez-vous pour retrouver vos achats et vos téléchargements." />
      <GoogleButton />
      <Separator label="ou avec votre email" />
      <ModeSwitch
        value={mode}
        onChange={setMode}
        options={[
          { value: "email", label: "Email" },
          { value: "phone", label: "Téléphone" },
        ]}
      />
      {mode === "email" ? (
        <form onSubmit={loginEmail} className="flex flex-col gap-5" noValidate>
          <Field label="Adresse email" htmlFor="email" error={errors.email}>
            <Input id="email" type="email" autoComplete="email" required icon={<Mail />} value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!errors.email} placeholder="vous@exemple.ci" />
          </Field>
          <Field
            label="Mot de passe"
            htmlFor="password"
            error={errors.password}
            action={
              <Link href="/mot-de-passe-oublie" className="text-label-sm text-brand-primary hover:underline">
                Mot de passe oublié ?
              </Link>
            }
          >
            <PasswordInput id="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!errors.password} />
          </Field>
          <label className="flex cursor-pointer items-center gap-2.5 text-body text-text-secondary">
            <Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Rester connecté sur cet appareil
          </label>
          <Button type="submit" size="lg" block loading={busy === "login"}>
            Se connecter <ArrowRight />
          </Button>
          <PasswordlessHint>
            Sans mot de passe :{" "}
            <button type="button" onClick={magicLink} className="underline underline-offset-2" disabled={busy === "magic"}>
              recevez un lien de connexion par email
            </button>{" "}
            ou{" "}
            <button type="button" onClick={() => setMode("phone")} className="underline underline-offset-2">
              un code par SMS
            </button>
            .
          </PasswordlessHint>
        </form>
      ) : (
        <form onSubmit={sendCode} className="flex flex-col gap-5">
          <Field label="Numéro de téléphone" htmlFor="phone" error={errors.phone} help="Nous vous enverrons un code à 6 chiffres par SMS.">
            <PhoneInput id="phone" value={phone} onChange={setPhone} invalid={!!errors.phone} />
          </Field>
          <Button type="submit" size="lg" block loading={busy === "otp"}>
            Recevoir le code
          </Button>
        </form>
      )}
      <p className="text-center text-body text-text-secondary">
        Pas encore de compte ?{" "}
        <Link href={`/inscription${next ? `?suite=${encodeURIComponent(next)}` : ""}`} className="text-label text-brand-primary hover:underline">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
