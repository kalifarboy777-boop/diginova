"use client";

import { Clock, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/ui/field";
import { api, ApiError } from "@/lib/api";
import { useMe, useRefreshSession } from "@/lib/session";
import { AuthTitle } from "./bits";

function mask(phone: string) {
  const d = phone.replace(/\D/g, "");
  const l = d.slice(-10);
  return `+${d.slice(0, d.length - 10)} ${l.slice(0, 2)} •• •• ${l.slice(6, 8)} ${l.slice(8, 10)}`;
}

/**
 * Écran 12 — code à 6 chiffres. Trois usages : vérification du numéro après inscription (« inscription »),
 * connexion par SMS (« connexion ») et validation en deux étapes (« 2fa »).
 */
export function VerifyForm() {
  const params = useSearchParams();
  const router = useRouter();
  const refresh = useRefreshSession();
  const { user } = useMe();
  const reason = params.get("raison") ?? "inscription";
  const purpose = reason === "connexion" ? "login" : reason === "2fa" ? "2fa" : "verify";
  const tel = params.get("tel") ?? user?.phone ?? "";
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [left, setLeft] = React.useState(60);

  React.useEffect(() => {
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  async function verify(c = code) {
    if (c.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ next: string }>("/auth/otp/verify", { method: "POST", body: { code: c, purpose, phone: purpose === "login" ? tel : undefined } });
      await refresh();
      toast.success(purpose === "verify" ? "Numéro vérifié." : "Connexion réussie.");
      router.push(params.get("suite") ?? r.next);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? (e.field("code") ?? e.message) : "Réessayez.");
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  async function resend(channel: "sms" | "whatsapp") {
    try {
      await api("/auth/otp/send", { method: "POST", body: { purpose, phone: purpose === "login" ? tel : undefined, channel } });
      setLeft(60);
      toast.success(channel === "whatsapp" ? "Code envoyé sur WhatsApp." : "Nouveau code envoyé.");
    } catch (e) {
      toast.error(e instanceof ApiError ? (e.field("phone") ?? e.message) : "Envoi impossible.");
    }
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        verify();
      }}
    >
      <span className="flex size-16 items-center justify-center rounded-lg bg-brand-subtle text-brand-primary">
        <Smartphone className="size-7" />
      </span>
      <AuthTitle title={purpose === "2fa" ? "Validation en deux étapes" : "Vérifiez votre numéro"} text={<>Nous avons envoyé un code à 6 chiffres par SMS{tel ? <> au {mask(tel)}.</> : "."}</>} />
      <OtpInput
        value={code}
        autoFocus
        invalid={!!error}
        onChange={(v) => {
          setCode(v);
          if (v.length === 6) verify(v);
        }}
      />
      {error && (
        <p role="alert" className="-mt-3 text-caption text-danger">
          {error}
        </p>
      )}
      <p className="flex items-center gap-2 text-body text-text-tertiary" aria-live="polite">
        <Clock className="size-4" />
        {left > 0 ? (
          `Renvoyer le code dans 0:${String(left).padStart(2, "0")}`
        ) : (
          <button type="button" onClick={() => resend("sms")} className="text-label text-brand-primary hover:underline">
            Renvoyer le code
          </button>
        )}
      </p>
      <Button type="submit" size="lg" block loading={busy} disabled={code.length !== 6}>
        Vérifier et continuer
      </Button>
      <div className="flex items-center justify-center gap-4 text-label text-brand-primary">
        <Link href={purpose === "login" ? "/connexion" : "/compte/profil"} className="hover:underline">
          Changer de numéro
        </Link>
        <span className="text-text-tertiary">·</span>
        <button type="button" disabled={left > 0} onClick={() => resend("whatsapp")} className="hover:underline disabled:opacity-50">
          Recevoir par WhatsApp
        </button>
      </div>
    </form>
  );
}
