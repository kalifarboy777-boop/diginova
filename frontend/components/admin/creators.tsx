"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, IdCard, Mail, Smartphone, Star, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";
import { ProductCover } from "@/components/product/product-cover";
import { Button } from "@/components/ui/button";
import { StatCard, StatusBadge, Table, Td, Th } from "@/components/ui/data";
import { Textarea } from "@/components/ui/field";
import { Avatar, EmptyState, Skeleton, UnderlineTabs } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { date, fcfaShort, num } from "@/lib/format";
import { useMe } from "@/lib/session";
import type { CoverType } from "@/lib/types";

type Tab = "applications" | "active" | "suspended" | "payouts";
type App = { id: number; studio_name: string; initials: string; location: string; bio: string; categories: string[]; hours: number; id_status: string; id_label: string; payout_label: string; payout_verified: boolean; samples: string[]; portfolio_url: string | null; can_approve: boolean };
type Seller = { id: number; name: string; slug: string; email: string; plan: string; commission_rate: number; products: number; verified: boolean; country: string; since: string; suspended: boolean };
type Payout = { id: number; reference: string; seller: string; amount: number; account: string; status: string; status_label: string; created_at: string };
type Data = { stats: Record<string, number | null>; tab: Tab; data: (App | Seller | Payout)[] };

const COLORS = ["#16A34A", "#DB2777", "#D97706", "#0284C7"];
const COVERS: CoverType[] = ["sheet", "doc", "grid", "grid", "book"];

/** Écran 53 — créateurs : candidatures, actifs, suspendus, retraits à valider. */
export function Creators() {
  const qc = useQueryClient();
  const { user } = useMe();
  const [tab, setTab] = React.useState<Tab>("applications");
  const { data } = useQuery({ queryKey: ["admin", "creators", tab], queryFn: () => api<Data>("/admin/creators", { query: { tab } }) });
  const [decision, setDecision] = React.useState<{ app: App; kind: "reject" | "document" } | null>(null);
  const [message, setMessage] = React.useState("");
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "creators"] });
    qc.invalidateQueries({ queryKey: ["nav", "admin"] });
  };
  const decide = async (app: App, kind: "approve" | "reject" | "document", msg?: string) => {
    try {
      await api(`/admin/applications/${app.id}/decision`, { method: "POST", body: { decision: kind, message: msg } });
      toast.success(kind === "approve" ? `${app.studio_name} : studio ouvert` : kind === "reject" ? "Candidature refusée" : "Document demandé");
      setDecision(null);
      setMessage("");
      refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? (Object.values(e.errors)[0]?.[0] ?? e.message) : "Erreur");
    }
  };

  if (!data) return <Skeleton className="h-[700px] rounded-card" />;
  const s = data.stats;
  return (
    <div className="flex flex-col gap-6">
      <p className="-mt-5 text-body-lg text-text-secondary">
        {num(s.active ?? 0)} créateurs actifs · {s.pending} candidatures à traiter
      </p>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Créateurs actifs" value={num(s.active ?? 0)} hint={`+${s.active_month} ce mois`} />
        <StatCard label="Candidatures en attente" value={s.pending ?? 0} hint={s.oldest_hours !== null ? `plus ancienne : ${s.oldest_hours} h` : "—"} />
        <StatCard label="Taux d’acceptation" value={s.acceptance !== null ? `${s.acceptance} %` : "—"} hint="sur 90 jours" />
        <StatCard label="Reversé aux créateurs" value={fcfaShort(s.paid_out ?? 0)} hint="30 derniers jours" />
      </div>
      <UnderlineTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "applications", label: `Candidatures (${s.pending})` },
          { value: "active", label: `Créateurs actifs (${s.active})` },
          { value: "suspended", label: `Suspendus (${s.suspended})` },
          { value: "payouts", label: `Retraits à valider (${s.payouts})` },
        ]}
      />

      {tab === "applications" &&
        (data.data.length === 0 ? (
          <div className="rounded-card border border-border-default bg-bg-surface">
            <EmptyState icon={<Star />} title="Aucune candidature en attente" />
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            {(data.data as App[]).map((a, i) => (
              <article key={a.id} className="flex flex-col gap-5 rounded-card border border-border-default bg-bg-surface p-6">
                <div className="flex items-start gap-3.5">
                  <Avatar initials={a.initials} size={48} color={COLORS[i % 4]} />
                  <div className="flex flex-1 flex-col">
                    <h3 className="text-h4">{a.studio_name}</h3>
                    <p className="text-body-sm text-text-tertiary">
                      {a.location} · soumise il y a {a.hours} h
                    </p>
                  </div>
                  {a.portfolio_url && (
                    <a href={a.portfolio_url.startsWith("http") ? a.portfolio_url : `https://${a.portfolio_url}`} target="_blank" rel="noreferrer" aria-label="Voir le portfolio" className="rounded p-1 text-text-secondary hover:bg-bg-subtle">
                      <Eye className="size-5" />
                    </a>
                  )}
                </div>
                <p className="text-body text-text-secondary">{a.bio}</p>
                <div className="flex flex-wrap gap-2">
                  {a.categories.map((c) => (
                    <span key={c} className="rounded-full bg-bg-subtle px-2.5 py-1 text-label-sm text-text-secondary">
                      {c.replace(" & formations", "")}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 rounded-md bg-bg-page p-3.5">
                    <IdCard className="size-5 text-text-secondary" />
                    <span className="flex flex-col items-start gap-1">
                      <span className="text-caption text-text-tertiary">Identité</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-label-sm", a.id_status === "VERIFIED" ? "bg-success-subtle text-success" : a.id_status === "MISSING" ? "bg-danger-subtle text-danger" : "bg-warning-subtle text-warning")}>{a.id_label}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 rounded-md bg-bg-page p-3.5">
                    <Smartphone className="size-5 text-text-secondary" />
                    <span className="flex flex-col items-start gap-1">
                      <span className="text-caption text-text-tertiary">Revenus</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-label-sm", a.payout_verified ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning")}>{a.payout_label}</span>
                    </span>
                  </div>
                </div>
                {a.id_status === "PENDING" && (
                  <div className="flex gap-2">
                    <Button variant="soft" size="sm" onClick={async () => { await api(`/admin/applications/${a.id}/identity`, { method: "POST", body: { id_status: "VERIFIED" } }); refresh(); }}>
                      <Check /> Pièce conforme
                    </Button>
                    <Button variant="secondary" size="sm" onClick={async () => { await api(`/admin/applications/${a.id}/identity`, { method: "POST", body: { id_status: "BLURRY" } }); refresh(); }}>
                      Pièce illisible
                    </Button>
                  </div>
                )}
                {a.samples.length > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-body-sm text-text-secondary">Exemples :</span>
                    {a.samples.map((sm, j) => (
                      <span key={sm} title={sm} className="h-[52px] w-[72px] overflow-hidden rounded-sm">
                        <ProductCover type={COVERS[(i + j) % 5]} rounded={false} />
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-auto flex flex-wrap gap-3">
                  <Button variant="danger-soft" size="sm" onClick={() => setDecision({ app: a, kind: "reject" })}>
                    <X /> Refuser
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setDecision({ app: a, kind: "document" })}>
                    <Mail /> Demander un document
                  </Button>
                  <Button size="sm" className="ml-auto bg-success hover:bg-[#15803D]" disabled={!a.can_approve} title={a.can_approve ? undefined : "Identité non vérifiée"} onClick={() => decide(a, "approve")}>
                    <Check /> Approuver
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ))}

      {(tab === "active" || tab === "suspended") && (
        <div className="overflow-hidden rounded-card border border-border-default bg-bg-surface">
          <Table>
            <thead>
              <tr>
                {["Studio", "Email", "Plan", "Commission", "Produits", "Depuis", ""].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.data as Seller[]).map((c) => (
                <tr key={c.id}>
                  <Td>
                    <Link href={`/createur/${c.slug}`} className="text-label hover:underline">
                      {c.name}
                    </Link>
                  </Td>
                  <Td className="text-text-secondary">{c.email}</Td>
                  <Td>{c.plan === "PRO" ? "Pro" : "Standard"}</Td>
                  <Td>{c.commission_rate} %</Td>
                  <Td>{c.products}</Td>
                  <Td className="whitespace-nowrap">{date(c.since)}</Td>
                  <Td className="text-right">
                    {user?.role === "ADMIN" && (
                      <Button
                        variant={c.suspended ? "soft" : "danger-soft"}
                        size="sm"
                        onClick={async () => {
                          await api(`/admin/sellers/${c.id}/suspend`, { method: "POST" });
                          toast.success(c.suspended ? "Studio réactivé" : "Studio suspendu");
                          refresh();
                        }}
                      >
                        {c.suspended ? "Réactiver" : "Suspendre"}
                      </Button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {data.data.length === 0 && <EmptyState icon={<Star />} title="Aucun créateur" />}
        </div>
      )}

      {tab === "payouts" && (
        <div className="overflow-hidden rounded-card border border-border-default bg-bg-surface">
          <Table>
            <thead>
              <tr>
                {["Référence", "Créateur", "Montant", "Compte", "Demandé le", "Statut", ""].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.data as Payout[]).map((p) => (
                <tr key={p.id}>
                  <Td className="text-label">{p.reference}</Td>
                  <Td>{p.seller}</Td>
                  <Td className="text-label whitespace-nowrap">{fcfaShort(p.amount)}</Td>
                  <Td className="whitespace-nowrap">{p.account}</Td>
                  <Td className="whitespace-nowrap">{date(p.created_at)}</Td>
                  <Td>
                    <StatusBadge status={p.status} />
                  </Td>
                  <Td className="text-right whitespace-nowrap">
                    {user?.role === "ADMIN" && (
                      <span className="inline-flex gap-2">
                        {p.status === "REQUESTED" && (
                          <Button variant="secondary" size="sm" onClick={async () => { await api(`/admin/payouts/${p.id}`, { method: "POST", body: { action: "process" } }); refresh(); }}>
                            Lancer le virement
                          </Button>
                        )}
                        <Button size="sm" className="bg-success hover:bg-[#15803D]" onClick={async () => { await api(`/admin/payouts/${p.id}`, { method: "POST", body: { action: "paid" } }); toast.success("Retrait marqué versé"); refresh(); }}>
                          Versé
                        </Button>
                        <Button variant="danger-soft" size="sm" onClick={async () => { await api(`/admin/payouts/${p.id}`, { method: "POST", body: { action: "failed" } }); toast("Retrait en échec : montant recrédité au créateur."); refresh(); }}>
                          Échec
                        </Button>
                      </span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {data.data.length === 0 && <EmptyState icon={<Check />} title="Aucun retrait à valider" />}
        </div>
      )}

      <Dialog open={!!decision} onOpenChange={(o) => !o && setDecision(null)}>
        <DialogContent title={decision?.kind === "reject" ? `Refuser ${decision.app.studio_name}` : "Demander un document"} description="Le message est envoyé par email au candidat.">
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (decision) decide(decision.app, decision.kind, message);
            }}
          >
            <Textarea required value={message} onChange={(e) => setMessage(e.target.value)} placeholder={decision?.kind === "reject" ? "Motif du refus…" : "Ex. : merci de nous renvoyer une photo nette du recto et du verso de votre CNI."} />
            <Button type="submit" variant={decision?.kind === "reject" ? "danger" : "primary"} block>
              Envoyer
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
