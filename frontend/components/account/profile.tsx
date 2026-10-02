"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Laptop, Lock, Mail, ShieldCheck, Smartphone, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, PasswordInput, PhoneInput, Select, Toggle } from "@/components/ui/field";
import { Avatar, Skeleton } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { api, ApiError } from "@/lib/api";
import { ago } from "@/lib/format";
import { useRefreshSession } from "@/lib/session";

type Profile = {
  first_name: string;
  last_name: string;
  email: string;
  email_verified: boolean;
  phone: string | null;
  phone_verified: boolean;
  country: string;
  city: string | null;
  avatar_url: string | null;
  has_password: boolean;
  password_changed_at: string;
  two_factor_enabled: boolean;
  notifications: { order_confirmation: boolean; product_updates: boolean; price_drops: boolean; newsletter: boolean; magic_link_login: boolean };
  sessions: { id: string; device: string; location: string; last_activity: string; current: boolean }[];
};

const COUNTRIES: [string, string][] = [["CI", "Côte d’Ivoire"], ["SN", "Sénégal"], ["TG", "Togo"], ["BJ", "Bénin"], ["CM", "Cameroun"], ["BF", "Burkina Faso"], ["ML", "Mali"]];

function Card({ id, title, children, className }: { id?: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`scroll-mt-6 rounded-card border border-border-default bg-bg-surface p-6 ${className ?? ""}`}>
      <h2 className="mb-5 text-h4">{title}</h2>
      {children}
    </section>
  );
}

const Verified = () => <span className="rounded-full bg-success-subtle px-2 py-0.5 text-label-sm whitespace-nowrap text-success">Vérifié</span>;

/** Écran 34 — profil, sécurité, notifications, sessions, suppression du compte. */
export function ProfileView() {
  const qc = useQueryClient();
  const router = useRouter();
  const refresh = useRefreshSession();
  const { data: p } = useQuery({ queryKey: ["profile"], queryFn: () => api<Profile>("/account/profile") });
  const [form, setForm] = React.useState<Partial<Profile>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [pwOpen, setPwOpen] = React.useState(false);
  const [delOpen, setDelOpen] = React.useState(false);
  React.useEffect(() => p && setForm(p), [p]);
  const set = (patch: Profile) => qc.setQueryData(["profile"], patch);

  if (!p) return <Skeleton className="h-[700px] rounded-card" />;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      set(await api<Profile>("/account/profile", { method: "PATCH", body: form }));
      await refresh();
      toast.success("Informations enregistrées");
    } catch (err) {
      if (err instanceof ApiError) setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])));
    } finally {
      setBusy(false);
    }
  };
  const patch = async (path: string, body: object) => {
    try {
      set(await api<Profile>(path, { method: "PATCH", body }));
    } catch (err) {
      toast.error(err instanceof ApiError ? (Object.values(err.errors)[0]?.[0] ?? err.message) : "Erreur");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex gap-7 overflow-x-auto border-b border-border-default" aria-label="Sections du profil">
        {[
          ["#informations", "Informations"],
          ["#securite", "Sécurité"],
          ["#notifications", "Notifications"],
          ["#paiement", "Moyens de paiement"],
        ].map(([h, l], i) => (
          <a key={h} href={h} className={`-mb-px border-b-2 pb-3.5 text-body-medium whitespace-nowrap ${i === 0 ? "border-brand-primary text-brand-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}>
            {l}
          </a>
        ))}
      </nav>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          <Card id="informations" title="Informations personnelles">
            <form onSubmit={save} className="flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <Avatar initials={`${p.first_name[0] ?? ""}${p.last_name[0] ?? ""}`} src={p.avatar_url} size={72} color="#635BFF" />
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-btn border border-border-strong px-3 text-label-sm hover:bg-bg-subtle">
                      <Upload className="size-4" /> Changer la photo
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        className="sr-only"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const fd = new FormData();
                          fd.append("avatar", f);
                          try {
                            await api("/account/profile/avatar", { method: "POST", body: fd });
                            qc.invalidateQueries({ queryKey: ["profile"] });
                            refresh();
                          } catch (err) {
                            toast.error(err instanceof ApiError ? (err.field("avatar") ?? err.message) : "Envoi impossible");
                          }
                        }}
                      />
                    </label>
                    {p.avatar_url && (
                      <button type="button" className="text-label-sm text-brand-primary" onClick={async () => { await api("/account/profile/avatar", { method: "DELETE" }); qc.invalidateQueries({ queryKey: ["profile"] }); refresh(); }}>
                        Supprimer
                      </button>
                    )}
                  </div>
                  <p className="text-caption text-text-tertiary">JPG ou PNG, 2 Mo maximum.</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Prénom" htmlFor="fn" error={errors.first_name}>
                  <Input id="fn" value={form.first_name ?? ""} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                </Field>
                <Field label="Nom" htmlFor="ln" error={errors.last_name}>
                  <Input id="ln" value={form.last_name ?? ""} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                </Field>
                <Field label="Email" htmlFor="em" error={errors.email}>
                  <Input id="em" type="email" icon={<Mail />} value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} suffix={p.email_verified && form.email === p.email ? <Verified /> : null} />
                </Field>
                <Field label="Téléphone" htmlFor="ph" error={errors.phone}>
                  <div className="relative">
                    <PhoneInput id="ph" value={form.phone ?? "+225"} onChange={(v) => setForm({ ...form, phone: v })} />
                    {p.phone_verified && form.phone === p.phone && <span className="absolute top-3.5 right-3.5"><Verified /></span>}
                  </div>
                </Field>
                <Field label="Pays" htmlFor="co">
                  <Select id="co" value={form.country ?? "CI"} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                    {COUNTRIES.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Ville" htmlFor="ci">
                  <Input id="ci" value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </Field>
              </div>
              {p.phone && !p.phone_verified && (
                <p className="rounded-md bg-warning-subtle px-4 py-3 text-body-sm text-warning">
                  Numéro non vérifié.{" "}
                  <button type="button" className="underline" onClick={async () => { await api("/auth/otp/send", { method: "POST", body: { purpose: "verify" } }); router.push("/verification?raison=inscription&suite=/compte/profil"); }}>
                    Vérifier maintenant
                  </button>
                </p>
              )}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setForm(p)}>
                  Annuler
                </Button>
                <Button type="submit" loading={busy}>
                  Enregistrer
                </Button>
              </div>
            </form>
          </Card>

          <Card id="securite" title="Sécurité">
            <ul className="flex flex-col divide-y divide-border-default">
              <li className="flex items-center gap-4 pb-5">
                <span className="flex size-10 items-center justify-center rounded-md bg-bg-subtle text-text-secondary"><Lock className="size-[18px]" /></span>
                <span className="flex flex-1 flex-col">
                  <span className="text-label">Mot de passe</span>
                  <span className="text-body-sm text-text-secondary">{p.has_password ? `Modifié ${ago(p.password_changed_at)}` : "Aucun mot de passe : connexion par lien ou code SMS"}</span>
                </span>
                <Button variant="secondary" size="sm" onClick={() => setPwOpen(true)}>
                  {p.has_password ? "Modifier" : "Définir"}
                </Button>
              </li>
              <li className="flex items-center gap-4 py-5">
                <span className="flex size-10 items-center justify-center rounded-md bg-bg-subtle text-text-secondary"><ShieldCheck className="size-[18px]" /></span>
                <span className="flex flex-1 flex-col">
                  <span className="text-label">Validation en deux étapes</span>
                  <span className="text-body-sm text-text-secondary">Code par SMS à chaque nouvelle connexion</span>
                </span>
                <Toggle label="Validation en deux étapes" checked={p.two_factor_enabled} onChange={(v) => patch("/account/security", { two_factor_enabled: v })} />
              </li>
              <li className="flex items-center gap-4 pt-5">
                <span className="flex size-10 items-center justify-center rounded-md bg-bg-subtle text-text-secondary"><Mail className="size-[18px]" /></span>
                <span className="flex flex-1 flex-col">
                  <span className="text-label">Connexion par lien magique</span>
                  <span className="text-body-sm text-text-secondary">Se connecter sans mot de passe depuis l’email</span>
                </span>
                <Toggle label="Connexion par lien magique" checked={p.notifications.magic_link_login} onChange={(v) => patch("/account/security", { magic_link_login: v })} />
              </li>
            </ul>
          </Card>

          <Card id="paiement" title="Moyens de paiement">
            <p className="text-body-sm text-text-secondary">
              DigiNova ne conserve aucune donnée bancaire. Votre numéro Mobile Money ({p.phone ?? "non renseigné"}) est proposé par défaut au paiement ; vous pouvez en choisir un autre à chaque commande.
            </p>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Sessions actives">
            <ul className="flex flex-col gap-3">
              {p.sessions.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-md bg-bg-page px-4 py-3">
                  {s.device.startsWith("iPhone") || s.device.startsWith("Android") ? <Smartphone className="size-[18px] text-text-secondary" /> : <Laptop className="size-[18px] text-text-secondary" />}
                  <span className="flex flex-1 flex-col">
                    <span className="text-label-sm">{s.device}</span>
                    <span className="text-caption text-text-tertiary">{s.location} · {s.current ? "maintenant" : ago(s.last_activity)}</span>
                  </span>
                  {s.current ? (
                    <span className="rounded-full bg-success-subtle px-2.5 py-1 text-label-sm text-success">Cet appareil</span>
                  ) : (
                    <button type="button" className="text-label-sm text-danger" onClick={async () => { await api(`/account/sessions/${s.id}`, { method: "DELETE" }); qc.invalidateQueries({ queryKey: ["profile"] }); toast.success("Session déconnectée"); }}>
                      Déconnecter
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Card>
          <Card id="notifications" title="Notifications">
            <ul className="flex flex-col gap-4">
              {(
                [
                  ["order_confirmation", "Confirmation de commande"],
                  ["product_updates", "Mises à jour de mes produits"],
                  ["price_drops", "Baisse de prix des favoris"],
                  ["newsletter", "Newsletter et promotions"],
                ] as const
              ).map(([k, l]) => (
                <li key={k} className="flex items-center justify-between gap-4 text-body">
                  {l}
                  <Toggle label={l} checked={p.notifications[k]} onChange={(v) => patch("/account/notification-preferences", { [k]: v })} />
                </li>
              ))}
            </ul>
          </Card>
          <section className="flex flex-col items-start gap-3 rounded-card bg-danger-subtle p-6">
            <h2 className="text-label text-danger">Supprimer mon compte</h2>
            <p className="text-body-sm text-text-secondary">Vos achats et votre bibliothèque seront définitivement supprimés.</p>
            <button type="button" onClick={() => setDelOpen(true)} className="inline-flex items-center gap-2 px-3 py-1.5 text-label-sm text-danger hover:underline">
              <Trash2 className="size-4" /> Supprimer le compte
            </button>
          </section>
        </div>
      </div>
      <PasswordDialog open={pwOpen} onOpenChange={setPwOpen} hasPassword={p.has_password} onDone={() => qc.invalidateQueries({ queryKey: ["profile"] })} />
      <DeleteDialog open={delOpen} onOpenChange={setDelOpen} />
    </div>
  );
}

function PasswordDialog({ open, onOpenChange, hasPassword, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; hasPassword: boolean; onDone: () => void }) {
  const [f, setF] = React.useState({ current_password: "", password: "", password_confirmation: "" });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={hasPassword ? "Modifier le mot de passe" : "Définir un mot de passe"} description="Vos autres sessions seront déconnectées.">
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const r = await api<{ message: string }>("/account/password", { method: "PUT", body: f });
              toast.success(r.message);
              onOpenChange(false);
              onDone();
            } catch (err) {
              if (err instanceof ApiError) setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])));
            }
          }}
        >
          {hasPassword && (
            <Field label="Mot de passe actuel" error={errors.current_password}>
              <PasswordInput autoComplete="current-password" value={f.current_password} onChange={(e) => setF({ ...f, current_password: e.target.value })} />
            </Field>
          )}
          <Field label="Nouveau mot de passe" error={errors.password}>
            <PasswordInput meter autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          </Field>
          <Field label="Confirmation">
            <PasswordInput autoComplete="new-password" value={f.password_confirmation} onChange={(e) => setF({ ...f, password_confirmation: e.target.value })} />
          </Field>
          <Button type="submit" block>
            Enregistrer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const router = useRouter();
  const refresh = useRefreshSession();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Supprimer votre compte ?" description="Cette action est définitive : vos achats et votre bibliothèque ne seront plus accessibles. Vos factures sont conservées de façon anonymisée (obligation comptable).">
        <div className="flex flex-col gap-4">
          <Field label="Tapez SUPPRIMER pour confirmer">
            <Input value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
          <Button
            variant="danger"
            block
            disabled={text !== "SUPPRIMER"}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api("/account", { method: "DELETE", body: { confirmation: text } });
                await refresh();
                toast.success("Votre compte a été supprimé.");
                router.push("/");
              } catch (err) {
                toast.error(err instanceof ApiError ? err.message : "Suppression impossible");
                setBusy(false);
              }
            }}
          >
            Supprimer définitivement
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
