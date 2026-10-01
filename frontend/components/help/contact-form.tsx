"use client";

import { Upload } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { api, ApiError } from "@/lib/api";
import { useMe } from "@/lib/session";

const SUBJECTS = ["Problème de téléchargement", "Paiement Mobile Money", "Remboursement", "Compte & connexion", "Licence & usage", "Devenir créateur", "Autre"];

/** Formulaire « Contacter le support » (écran 06). */
export function ContactForm() {
  const { user } = useMe();
  const [form, setForm] = React.useState({ name: "", email: "", subject: SUBJECTS[0], order_number: "", message: "" });
  const [file, setFile] = React.useState<File | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || user.name, email: f.email || user.email }));
  }, [user]);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        if (file) fd.append("attachment", file);
        try {
          const r = await api<{ message: string }>("/contact", { method: "POST", body: fd });
          toast.success(r.message);
          setForm((f) => ({ ...f, message: "", order_number: "" }));
          setFile(null);
        } catch (err) {
          if (err instanceof ApiError) setErrors(err.errors);
          toast.error(err instanceof ApiError ? err.message : "Envoi impossible.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom complet" htmlFor="c-name" error={errors.name?.[0]}>
          <Input id="c-name" required value={form.name} onChange={set("name")} autoComplete="name" />
        </Field>
        <Field label="Email" htmlFor="c-email" error={errors.email?.[0]}>
          <Input id="c-email" type="email" required value={form.email} onChange={set("email")} autoComplete="email" />
        </Field>
        <Field label="Sujet" htmlFor="c-subject">
          <Select id="c-subject" value={form.subject} onChange={set("subject")}>
            {SUBJECTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="N° de commande (facultatif)" htmlFor="c-order">
          <Input id="c-order" value={form.order_number} onChange={set("order_number")} placeholder="DN-2026-…" />
        </Field>
      </div>
      <Field label="Message" htmlFor="c-msg" error={errors.message?.[0]}>
        <Textarea id="c-msg" required minLength={10} value={form.message} onChange={set("message")} placeholder="Décrivez votre problème…" />
      </Field>
      <label className="flex cursor-pointer items-center gap-2.5 rounded-btn border border-dashed border-border-strong px-4 py-3 text-body-sm text-text-secondary hover:border-brand-primary">
        <Upload className="size-[18px]" />
        {file ? file.name : "Joindre une capture d’écran (facultatif)"}
        <input type="file" accept="image/png,image/jpeg,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <Button type="submit" size="lg" block loading={busy}>
        Envoyer le message
      </Button>
    </form>
  );
}
