"use client";

import { Mail } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { api, ApiError } from "@/lib/api";

export function NewsletterForm() {
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  return (
    <form
      className="mt-2 flex w-full max-w-[520px] flex-col gap-3 sm:flex-row"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const r = await api<{ message: string }>("/newsletter", { method: "POST", body: { email } });
          toast.success(r.message);
          setEmail("");
        } catch (err) {
          setError(err instanceof ApiError ? (err.field("email") ?? err.message) : "Réessayez.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="flex-1">
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Votre adresse email" aria-label="Votre adresse email" icon={<Mail />} invalid={!!error} shellClassName="h-[52px] bg-bg-page" />
        {error && <p className="mt-1.5 text-left text-caption text-danger">{error}</p>}
      </div>
      <Button size="lg" type="submit" loading={busy}>
        Je m’inscris
      </Button>
    </form>
  );
}
