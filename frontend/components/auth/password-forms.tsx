"use client";

import { ArrowLeft, Lock, Mail, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, PasswordInput } from "@/components/ui/field";
import { api, ApiError } from "@/lib/api";
import { useRefreshSession } from "@/lib/session";
import { AuthTitle } from "./bits";

/** Écran 13 — mot de passe oublié. */
export function ForgotForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await api("/auth/password/forgot", { method: "POST", body: { email } });
          router.push(`/mot-de-passe-oublie/envoye?email=${encodeURIComponent(email)}`);
        } catch (err) {
          setError(err instanceof ApiError ? (err.field("email") ?? err.message) : "Réessayez.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <span className="flex size-16 items-center justify-center rounded-lg bg-brand-subtle text-brand-primary">
        <Lock className="size-7" />
      </span>
      <AuthTitle title="Mot de passe oublié ?" text="Indiquez l’email de votre compte : nous vous enverrons un lien pour en choisir un nouveau." />
      <Field label="Adresse email" htmlFor="email" error={error}>
        <Input id="email" type="email" autoComplete="email" icon={<Mail />} value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!error} placeholder="vous@exemple.ci" />
      </Field>
      <Button type="submit" size="lg" block loading={busy}>
        Envoyer le lien
      </Button>
      <Link href="/connexion" className="inline-flex items-center justify-center gap-2 text-label text-brand-primary hover:underline">
        <ArrowLeft className="size-4" /> Retour à la connexion
      </Link>
    </form>
  );
}

/** Écran 14 — lien envoyé. */
export function SentNotice() {
  const email = useSearchParams().get("email") ?? "";
  const [left, setLeft] = React.useState(60);
  React.useEffect(() => {
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const domain = email.split("@")[1] ?? "";
  const webmail = domain.includes("gmail") ? "https://mail.google.com" : domain.match(/outlook|hotmail|live/) ? "https://outlook.live.com" : domain.includes("yahoo") ? "https://mail.yahoo.com" : null;
  return (
    <div className="flex flex-col gap-5">
      <span className="flex size-16 items-center justify-center rounded-lg bg-success-subtle text-success">
        <MailCheck className="size-7" />
      </span>
      <AuthTitle
        title="Vérifiez votre boîte mail"
        text={
          <>
            Un lien de réinitialisation a été envoyé à <strong className="font-semibold text-text-primary">{email}</strong>. Il est valable 30 minutes.
          </>
        }
      />
      {webmail ? (
        <Button asChild size="lg" block>
          <a href={webmail} target="_blank" rel="noreferrer">
            Ouvrir ma messagerie
          </a>
        </Button>
      ) : (
        <Button asChild size="lg" block>
          <Link href="/connexion">Retour à la connexion</Link>
        </Button>
      )}
      <p className="text-center text-body-sm text-text-secondary">
        Rien reçu ? Vérifiez vos spams{left > 0 ? ` ou renvoyez le lien dans ${left} secondes.` : "."}
      </p>
      <Button
        variant="secondary"
        size="lg"
        block
        disabled={left > 0}
        onClick={async () => {
          await api("/auth/password/forgot", { method: "POST", body: { email } });
          setLeft(60);
          toast.success("Lien renvoyé.");
        }}
      >
        Renvoyer le lien
      </Button>
    </div>
  );
}

/** Choix d'un nouveau mot de passe (lien « mot de passe oublié » ou compte créé au checkout). */
export function SetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const refresh = useRefreshSession();
  const [pw, setPw] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const token = params.get("token") ?? "";
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        try {
          const r = await api<{ next: string }>("/auth/password/reset", { method: "POST", body: { token, password: pw, password_confirmation: confirm } });
          await refresh();
          toast.success("Mot de passe enregistré. Vous êtes connecté.");
          router.push(r.next);
        } catch (err) {
          if (err instanceof ApiError) setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])));
        } finally {
          setBusy(false);
        }
      }}
    >
      <AuthTitle title="Choisissez votre mot de passe" text="8 caractères minimum, avec des lettres et des chiffres." />
      {errors.token && (
        <p role="alert" className="rounded-md bg-danger-subtle px-4 py-3 text-body-sm text-danger">
          {errors.token}{" "}
          <Link href="/mot-de-passe-oublie" className="underline">
            Demander un nouveau lien
          </Link>
        </p>
      )}
      <Field label="Nouveau mot de passe" htmlFor="pw" error={errors.password}>
        <PasswordInput id="pw" meter autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} invalid={!!errors.password} />
      </Field>
      <Field label="Confirmation" htmlFor="pw2">
        <PasswordInput id="pw2" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      <Button type="submit" size="lg" block loading={busy}>
        Enregistrer et me connecter
      </Button>
    </form>
  );
}

/** Consommation d'un lien magique (« /connexion/lien?token=… »). */
export function MagicLinkConsumer() {
  const params = useSearchParams();
  const router = useRouter();
  const refresh = useRefreshSession();
  const [error, setError] = React.useState<string | null>(null);
  const done = React.useRef(false);
  React.useEffect(() => {
    if (done.current) return;
    done.current = true;
    api<{ next: string }>("/auth/magic-link/consume", { method: "POST", body: { token: params.get("token") ?? "" } })
      .then(async (r) => {
        await refresh();
        router.replace(r.next);
      })
      .catch((e) => setError(e instanceof ApiError ? (e.field("token") ?? e.message) : "Lien invalide."));
  }, [params, refresh, router]);
  return error ? (
    <div className="flex flex-col gap-5">
      <AuthTitle title="Lien expiré" text={error} />
      <Button asChild size="lg" block>
        <Link href="/connexion">Recevoir un nouveau lien</Link>
      </Button>
    </div>
  ) : (
    <AuthTitle title="Connexion en cours…" text="Un instant, nous vérifions votre lien." />
  );
}
