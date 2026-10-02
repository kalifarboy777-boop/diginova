"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, EyeOff, Flag, MessageSquare, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";
import { TicketThread, type TicketSummary } from "@/components/account/tickets";
import { ProductCover } from "@/components/product/product-cover";
import { Button } from "@/components/ui/button";
import { StatCard, StatusBadge, Table, Td, Th } from "@/components/ui/data";
import { Field, Input, Select, Toggle } from "@/components/ui/field";
import { Avatar, EmptyState, Pill, Skeleton, UnderlineTabs } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { Stars } from "@/components/ui/rating";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { ago, date, fcfaShort, num, time } from "@/lib/format";
import type { CoverType } from "@/lib/types";

const card = "overflow-hidden rounded-card border border-border-default bg-bg-surface";
const errMsg = (e: unknown) => (e instanceof ApiError ? (Object.values(e.errors)[0]?.[0] ?? e.message) : "Action impossible");

/* ───────────── Catalogue (tous les produits) */
export function AdminCatalog() {
  const qc = useQueryClient();
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("");
  const { data } = useQuery({ queryKey: ["admin", "products", q, status], queryFn: () => api<{ data: { id: number; title: string; slug: string; seller: string; category: string; price: number; status: string; sales: number; rating: number; cover_type: CoverType }[] }>("/admin/products", { query: { q: q || undefined, status: status || undefined } }), placeholderData: (p) => p });
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un produit" aria-label="Rechercher" className="h-10 w-72 rounded-btn border border-border-default bg-bg-surface px-3.5 text-body-sm outline-none focus:border-brand-primary" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} shellClassName="h-10 w-56" aria-label="Statut">
          <option value="">Tous les statuts</option>
          <option value="PUBLISHED">Publiés</option>
          <option value="PENDING_REVIEW">En modération</option>
          <option value="DRAFT">Brouillons</option>
          <option value="ARCHIVED">Archivés</option>
        </Select>
        <Button asChild variant="secondary" className="ml-auto h-10">
          <Link href="/admin/produits">File de modération</Link>
        </Button>
      </div>
      <div className={card}>
        {!data ? (
          <Skeleton className="m-5 h-64" />
        ) : (
          <Table>
            <thead>
              <tr>
                {["Produit", "Créateur", "Catégorie", "Prix", "Ventes", "Statut", ""].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.data.map((p) => (
                <tr key={p.id}>
                  <Td>
                    <span className="flex items-center gap-3">
                      <span className="h-9 w-12 shrink-0 overflow-hidden rounded-sm">
                        <ProductCover type={p.cover_type} rounded={false} />
                      </span>
                      <Link href={`/produit/${p.slug}`} className="text-label hover:underline">
                        {p.title}
                      </Link>
                    </span>
                  </Td>
                  <Td>{p.seller}</Td>
                  <Td>{p.category}</Td>
                  <Td className="whitespace-nowrap">{fcfaShort(p.price)}</Td>
                  <Td>{num(p.sales)}</Td>
                  <Td>
                    <StatusBadge status={p.status} />
                  </Td>
                  <Td className="text-right">
                    {p.status === "PUBLISHED" && (
                      <Button
                        variant="danger-soft"
                        size="sm"
                        onClick={async () => {
                          await api(`/admin/products/${p.id}/unpublish`, { method: "POST", body: { reason: "Retrait manuel" } });
                          toast.success("Produit dépublié (les acheteurs gardent l’accès)");
                          qc.invalidateQueries({ queryKey: ["admin", "products"] });
                        }}
                      >
                        <EyeOff /> Dépublier
                      </Button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}

/* ───────────── Catégories */
type Cat = { id: number; name: string; label: string; slug: string; description: string | null; cover_type: string; products: number; children: { id: number; name: string; slug: string }[] };
export function AdminCategories() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "categories"], queryFn: () => api<{ data: Cat[] }>("/admin/categories") });
  const [edit, setEdit] = React.useState<Partial<Cat> & { parent_id?: number | null } | null>(null);
  const save = async () => {
    try {
      const body = { name: edit!.name, label: edit!.label, description: edit!.description, parent_id: edit!.parent_id ?? null, cover_type: edit!.cover_type ?? "doc" };
      qc.setQueryData(["admin", "categories"], await api(edit!.id ? `/admin/categories/${edit!.id}` : "/admin/categories", { method: edit!.id ? "PUT" : "POST", body }));
      setEdit(null);
      toast.success("Catégorie enregistrée");
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  if (!data) return <Skeleton className="h-96 rounded-card" />;
  return (
    <div className="flex flex-col gap-5">
      <Button className="self-end" onClick={() => setEdit({ name: "", cover_type: "doc" })}>
        <Plus /> Nouvelle catégorie
      </Button>
      <div className="grid gap-5 lg:grid-cols-2">
        {data.data.map((c) => (
          <div key={c.id} className="flex flex-col gap-3 rounded-card border border-border-default bg-bg-surface p-5">
            <div className="flex items-center gap-3">
              <span className="h-10 w-14 overflow-hidden rounded-sm">
                <ProductCover type={c.cover_type as CoverType} rounded={false} />
              </span>
              <span className="flex flex-1 flex-col">
                <span className="text-label">{c.name}</span>
                <span className="text-caption text-text-tertiary">
                  /{c.slug} · {c.products} produits
                </span>
              </span>
              <button type="button" aria-label="Modifier" onClick={() => setEdit(c)} className="rounded p-1.5 hover:bg-bg-subtle">
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Supprimer"
                onClick={async () => {
                  try {
                    qc.setQueryData(["admin", "categories"], await api(`/admin/categories/${c.id}`, { method: "DELETE" }));
                  } catch (e) {
                    toast.error(errMsg(e));
                  }
                }}
                className="rounded p-1.5 text-danger hover:bg-danger-subtle"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {c.children.map((s) => (
                <span key={s.id} className="rounded-full bg-bg-subtle px-2.5 py-1 text-label-sm text-text-secondary">
                  {s.name}
                </span>
              ))}
              <button type="button" onClick={() => setEdit({ name: "", parent_id: c.id, cover_type: c.cover_type })} className="rounded-full border border-dashed border-border-strong px-2.5 py-1 text-label-sm text-brand-primary">
                + sous-catégorie
              </button>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent title={edit?.id ? "Modifier la catégorie" : "Nouvelle catégorie"}>
          <div className="flex flex-col gap-4">
            <Field label="Nom">
              <Input value={edit?.name ?? ""} onChange={(e) => setEdit({ ...edit!, name: e.target.value })} />
            </Field>
            <Field label="Libellé court (surcapitales)">
              <Input value={edit?.label ?? ""} onChange={(e) => setEdit({ ...edit!, label: e.target.value })} placeholder="E-BOOKS" />
            </Field>
            <Field label="Description">
              <Input value={edit?.description ?? ""} onChange={(e) => setEdit({ ...edit!, description: e.target.value })} />
            </Field>
            <Field label="Visuel par défaut">
              <Select value={edit?.cover_type ?? "doc"} onChange={(e) => setEdit({ ...edit!, cover_type: e.target.value })}>
                {["chart", "grid", "chat", "sheet", "doc", "notion", "book", "brand"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Button onClick={save} block disabled={!edit?.name}>
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ───────────── Remboursements */
export function AdminRefunds() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "refunds"], queryFn: () => api<{ data: { id: number; order_id: number; order: string; customer: string | null; amount: number; reason: string; status: string; status_label: string; created_at: string; paid_at: string | null }[] }>("/admin/refunds") });
  const decide = async (id: number, decision: "approve" | "reject") => {
    try {
      qc.setQueryData(["admin", "refunds"], await api(`/admin/refunds/${id}/decision`, { method: "POST", body: { decision } }));
      qc.invalidateQueries({ queryKey: ["nav", "admin"] });
      toast.success(decision === "approve" ? "Remboursement accepté · accès révoqué, solde créateur débité" : "Demande refusée");
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  if (!data) return <Skeleton className="h-96 rounded-card" />;
  return (
    <div className={card}>
      {data.data.length === 0 ? (
        <EmptyState icon={<Check />} title="Aucune demande de remboursement" />
      ) : (
        <Table>
          <thead>
            <tr>
              {["Commande", "Client", "Montant", "Motif", "Payée le", "Demandée", "Statut", ""].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.data.map((r) => (
              <tr key={r.id}>
                <Td>
                  <Link href={`/admin/paiements?commande=${r.order_id}`} className="text-label-sm text-brand-primary">
                    {r.order}
                  </Link>
                </Td>
                <Td>{r.customer}</Td>
                <Td className="whitespace-nowrap">{fcfaShort(r.amount)}</Td>
                <Td className="max-w-xs">{r.reason}</Td>
                <Td className="whitespace-nowrap">{date(r.paid_at)}</Td>
                <Td className="whitespace-nowrap">{ago(r.created_at)}</Td>
                <Td>
                  <StatusBadge status={r.status} />
                </Td>
                <Td className="text-right whitespace-nowrap">
                  {r.status === "REQUESTED" && (
                    <span className="inline-flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => decide(r.id, "reject")}>
                        Refuser
                      </Button>
                      <Button size="sm" onClick={() => decide(r.id, "approve")}>
                        Rembourser
                      </Button>
                    </span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

/* ───────────── Coupons */
type Coupon = { id: number; code: string; label: string; type: string; value: number; scope: string; min_amount: number; used: number; limit: number | null; active: boolean; starts_at: string | null; expires_at: string | null; seller: string | null; description?: string };
export function AdminCoupons() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "coupons"], queryFn: () => api<{ data: Coupon[] }>("/admin/coupons") });
  const [edit, setEdit] = React.useState<Partial<Coupon> | null>(null);
  const save = async () => {
    try {
      const e = edit!;
      qc.setQueryData(
        ["admin", "coupons"],
        await api(e.id ? `/admin/coupons/${e.id}` : "/admin/coupons", {
          method: e.id ? "PUT" : "POST",
          body: { code: e.code, description: e.description ?? e.label, type: e.type, value: e.value, scope: e.scope, min_amount: e.min_amount ?? 0, usage_limit: e.limit ?? null, expires_at: e.expires_at || null, active: e.active ?? true },
        }),
      );
      setEdit(null);
      toast.success("Coupon enregistré");
    } catch (err) {
      toast.error(errMsg(err));
    }
  };
  if (!data) return <Skeleton className="h-96 rounded-card" />;
  return (
    <div className="flex flex-col gap-5">
      <Button className="self-end" onClick={() => setEdit({ code: "", type: "PERCENT", value: 10, scope: "ALL", active: true })}>
        <Plus /> Nouveau coupon
      </Button>
      <div className={card}>
        <Table>
          <thead>
            <tr>
              {["Code", "Réduction", "Portée", "Minimum", "Utilisations", "Expiration", "Créateur", "Actif", ""].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.data.map((c) => (
              <tr key={c.id}>
                <Td className="text-label text-brand-primary">{c.code}</Td>
                <Td>{c.label}</Td>
                <Td>{{ ALL: "Tout le site", PACKS: "Packs", PRODUCT: "Produit" }[c.scope]}</Td>
                <Td>{c.min_amount ? fcfaShort(c.min_amount) : "—"}</Td>
                <Td>
                  {c.used}
                  {c.limit ? ` / ${c.limit}` : ""}
                </Td>
                <Td className="whitespace-nowrap">{c.expires_at ? date(c.expires_at) : "—"}</Td>
                <Td>{c.seller ?? "DigiNova"}</Td>
                <Td>{c.active ? <StatusBadge status="PAID" label="Actif" /> : <StatusBadge status="EXPIRED" label="Inactif" />}</Td>
                <Td>
                  <button type="button" aria-label="Modifier" onClick={() => setEdit({ ...c, expires_at: c.expires_at?.slice(0, 10) ?? null })} className="rounded p-1.5 hover:bg-bg-subtle">
                    <Pencil className="size-4" />
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent title={edit?.id ? `Coupon ${edit.code}` : "Nouveau coupon"}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Code" className="col-span-2">
              <Input value={edit?.code ?? ""} onChange={(e) => setEdit({ ...edit!, code: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="Description" className="col-span-2">
              <Input value={edit?.description ?? edit?.label ?? ""} onChange={(e) => setEdit({ ...edit!, description: e.target.value })} placeholder="-10 % sur tout le site" />
            </Field>
            <Field label="Type">
              <Select value={edit?.type} onChange={(e) => setEdit({ ...edit!, type: e.target.value })}>
                <option value="PERCENT">Pourcentage</option>
                <option value="FIXED">Montant fixe</option>
              </Select>
            </Field>
            <Field label="Valeur">
              <Input inputMode="numeric" value={edit?.value ?? 0} onChange={(e) => setEdit({ ...edit!, value: Number(e.target.value.replace(/\D/g, "")) })} />
            </Field>
            <Field label="Portée">
              <Select value={edit?.scope} onChange={(e) => setEdit({ ...edit!, scope: e.target.value })}>
                <option value="ALL">Tout le site</option>
                <option value="PACKS">Packs</option>
              </Select>
            </Field>
            <Field label="Montant minimum">
              <Input inputMode="numeric" value={edit?.min_amount ?? 0} onChange={(e) => setEdit({ ...edit!, min_amount: Number(e.target.value.replace(/\D/g, "")) })} />
            </Field>
            <Field label="Limite d’utilisations">
              <Input inputMode="numeric" value={edit?.limit ?? ""} onChange={(e) => setEdit({ ...edit!, limit: Number(e.target.value.replace(/\D/g, "")) || null })} />
            </Field>
            <Field label="Expire le">
              <Input type="date" value={edit?.expires_at ?? ""} onChange={(e) => setEdit({ ...edit!, expires_at: e.target.value })} />
            </Field>
            <label className="col-span-2 flex items-center justify-between text-body">
              Actif <Toggle checked={!!edit?.active} onChange={(v) => setEdit({ ...edit!, active: v })} />
            </label>
            <Button onClick={save} block className="col-span-2">
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ───────────── Utilisateurs */
export function AdminUsers({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const [q, setQ] = React.useState("");
  const [role, setRole] = React.useState("");
  const [page, setPage] = React.useState(1);
  const { data } = useQuery({
    queryKey: ["admin", "users", q, role, page],
    queryFn: () => api<{ data: { id: number; name: string; initials: string; email: string; phone: string | null; role: string; role_label: string; orders: number; created_at: string; last_login_at: string | null; suspended: boolean }[]; meta: { total: number; page: number; last_page: number } }>("/admin/users", { query: { q: q || undefined, role: role || undefined, page } }),
    placeholderData: (p) => p,
  });
  const update = async (id: number, body: object) => {
    try {
      await api(`/admin/users/${id}`, { method: "PATCH", body });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Compte mis à jour");
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-3">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Nom, email, téléphone" aria-label="Rechercher" className="h-10 w-72 rounded-btn border border-border-default bg-bg-surface px-3.5 text-body-sm outline-none focus:border-brand-primary" />
        {["", "CLIENT", "CREATOR", "MODERATOR", "ADMIN"].map((r) => (
          <Pill key={r} active={role === r} onClick={() => { setRole(r); setPage(1); }} className="h-10 text-label-sm">
            {{ "": "Tous", CLIENT: "Clients", CREATOR: "Créateurs", MODERATOR: "Modérateurs", ADMIN: "Admins" }[r]}
          </Pill>
        ))}
      </div>
      <div className={card}>
        {!data ? (
          <Skeleton className="m-5 h-64" />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  {["Utilisateur", "Téléphone", "Rôle", "Commandes", "Inscrit", "Dernière connexion", ""].map((h) => (
                    <Th key={h}>{h}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.data.map((u) => (
                  <tr key={u.id} className={u.suspended ? "opacity-60" : ""}>
                    <Td>
                      <span className="flex items-center gap-3">
                        <Avatar initials={u.initials} size={32} />
                        <span className="flex flex-col">
                          <span className="text-label-sm">{u.name}</span>
                          <span className="text-caption text-text-tertiary">{u.email}</span>
                        </span>
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap">{u.phone ?? "—"}</Td>
                    <Td>
                      {isAdmin ? (
                        <select aria-label="Rôle" value={u.role} onChange={(e) => update(u.id, { role: e.target.value })} className="rounded-sm border border-border-default bg-bg-surface px-2 py-1 text-body-sm">
                          <option value="CLIENT">Client</option>
                          <option value="CREATOR">Créateur</option>
                          <option value="MODERATOR">Modérateur</option>
                          <option value="ADMIN">Administrateur</option>
                        </select>
                      ) : (
                        u.role_label
                      )}
                    </Td>
                    <Td>{u.orders}</Td>
                    <Td className="whitespace-nowrap">{date(u.created_at)}</Td>
                    <Td className="whitespace-nowrap">{u.last_login_at ? ago(u.last_login_at) : "—"}</Td>
                    <Td className="text-right">
                      {isAdmin && (
                        <Button size="sm" variant={u.suspended ? "soft" : "danger-soft"} onClick={() => update(u.id, { suspended: !u.suspended })}>
                          {u.suspended ? "Réactiver" : "Suspendre"}
                        </Button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="flex items-center justify-between px-5 py-4 text-body-sm text-text-secondary">
              {data.meta.total} comptes
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Précédent
                </Button>
                <Button variant="secondary" size="sm" disabled={page >= data.meta.last_page} onClick={() => setPage((p) => p + 1)}>
                  Suivant
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ───────────── Avis & signalements */
export function AdminReviews() {
  const qc = useQueryClient();
  const [tab, setTab] = React.useState<"reports" | "reviews">("reports");
  const { data } = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: () =>
      api<{
        reports: { id: number; product: string | null; product_slug: string | null; reason: string; details: string | null; reporter: string; status: string; status_label: string; created_at: string }[];
        reviews: { id: number; product: string; author: string; rating: number; comment: string | null; status: string; reply: string | null; created_at: string }[];
      }>("/admin/reviews"),
  });
  if (!data) return <Skeleton className="h-96 rounded-card" />;
  const set = (d: unknown) => {
    qc.setQueryData(["admin", "reviews"], d);
    qc.invalidateQueries({ queryKey: ["nav", "admin"] });
  };
  return (
    <div className="flex flex-col gap-5">
      <UnderlineTabs value={tab} onChange={setTab} tabs={[{ value: "reports", label: `Signalements (${data.reports.filter((r) => r.status === "OPEN").length})` }, { value: "reviews", label: `Avis (${data.reviews.length})` }]} />
      {tab === "reports" ? (
        <div className="flex flex-col gap-3">
          {data.reports.length === 0 && <EmptyState icon={<Flag />} title="Aucun signalement" />}
          {data.reports.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-4 rounded-lg border border-border-default bg-bg-surface p-4">
              <Flag className="size-5 text-danger" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-label">
                  {r.reason} ·{" "}
                  {r.product_slug ? (
                    <Link href={`/produit/${r.product_slug}`} className="text-brand-primary">
                      {r.product}
                    </Link>
                  ) : (
                    r.product
                  )}
                </span>
                <span className="text-body-sm text-text-secondary">{r.details}</span>
                <span className="text-caption text-text-tertiary">
                  Par {r.reporter} · {ago(r.created_at)}
                </span>
              </div>
              <StatusBadge status={r.status === "OPEN" ? "OPEN" : "RESOLVED"} label={r.status_label} />
              {r.status === "OPEN" && (
                <span className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={async () => set(await api(`/admin/reports/${r.id}/decision`, { method: "POST", body: { decision: "dismiss" } }))}>
                    Classer
                  </Button>
                  <Button size="sm" variant="danger-soft" onClick={async () => set(await api(`/admin/reports/${r.id}/decision`, { method: "POST", body: { decision: "unpublish" } }))}>
                    Dépublier le produit
                  </Button>
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className={card}>
          <Table>
            <thead>
              <tr>
                {["Produit", "Auteur", "Note", "Commentaire", "Date", ""].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.reviews.map((r) => (
                <tr key={r.id} className={r.status === "HIDDEN" ? "opacity-50" : ""}>
                  <Td className="text-label-sm">{r.product}</Td>
                  <Td>{r.author}</Td>
                  <Td>
                    <Stars value={r.rating} size={12} />
                  </Td>
                  <Td className="max-w-md">{r.comment}</Td>
                  <Td className="whitespace-nowrap">{date(r.created_at)}</Td>
                  <Td className="text-right">
                    <Button size="sm" variant="secondary" onClick={async () => set(await api(`/admin/reviews/${r.id}/status`, { method: "POST", body: { status: r.status === "HIDDEN" ? "PUBLISHED" : "HIDDEN" } }))}>
                      {r.status === "HIDDEN" ? "Republier" : "Masquer"}
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}

/* ───────────── Tickets */
export function AdminTickets() {
  const [status, setStatus] = React.useState("");
  const [selected, setSelected] = React.useState<number | null>(null);
  const { data } = useQuery({ queryKey: ["tickets", "admin", status], queryFn: () => api<{ data: TicketSummary[] }>("/admin/tickets", { query: { status: status || undefined } }) });
  React.useEffect(() => {
    if (selected === null && data?.data[0]) setSelected(data.data[0].id);
  }, [data, selected]);
  return (
    <div className="grid overflow-hidden rounded-card border border-border-default bg-bg-surface lg:grid-cols-[380px_1fr]">
      <div className="border-b border-border-default lg:border-r lg:border-b-0">
        <div className="flex flex-wrap gap-2 border-b border-border-default p-4">
          {["", "OPEN", "IN_PROGRESS", "RESOLVED"].map((s) => (
            <Pill key={s} active={status === s} onClick={() => setStatus(s)} className="h-8 px-3 text-label-sm">
              {{ "": "Tous", OPEN: "Ouverts", IN_PROGRESS: "En cours", RESOLVED: "Résolus" }[s]}
            </Pill>
          ))}
        </div>
        <ul className="max-h-[640px] overflow-y-auto">
          {(data?.data ?? []).map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => setSelected(t.id)} className={cn("flex w-full flex-col gap-1 border-b border-border-default px-5 py-4 text-left", selected === t.id ? "bg-brand-subtle" : "hover:bg-bg-page")}>
                <span className="flex items-center justify-between text-caption text-text-tertiary">
                  #{t.number} · {t.customer?.name} <StatusBadge status={t.status} />
                </span>
                <span className="text-label">{t.subject}</span>
                <span className="text-caption text-text-tertiary">{ago(t.last_message_at)}</span>
              </button>
            </li>
          ))}
          {data?.data.length === 0 && <li className="p-8 text-center text-body-sm text-text-secondary">Aucun ticket.</li>}
        </ul>
      </div>
      <div className="min-w-0">{selected ? <TicketThread id={selected} base="/admin" staff /> : <EmptyState icon={<MessageSquare />} title="Sélectionnez un ticket" />}</div>
    </div>
  );
}

/* ───────────── Commissions */
export function AdminCommissions() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "commissions"], queryFn: () => api<{ settings: { standard: number; pro: number; pro_price: number }; collected_30d: number; sellers: { id: number; name: string; plan: string; rate: number; sales_30d: number }[] }>("/admin/commissions") });
  if (!data) return <Skeleton className="h-96 rounded-card" />;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Commission plan Standard" value={`${data.settings.standard} %`} />
        <StatCard label="Commission plan Pro" value={`${data.settings.pro} %`} hint={`${fcfaShort(data.settings.pro_price)} / mois · indicatif`} />
        <StatCard label="Commissions perçues (30 j)" value={fcfaShort(data.collected_30d)} />
      </div>
      <div className={card}>
        <Table>
          <thead>
            <tr>
              {["Créateur", "Plan", "Taux", "Ventes (30 j)", ""].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.sellers.map((s) => (
              <tr key={s.id}>
                <Td className="text-label">{s.name}</Td>
                <Td>{s.plan === "PRO" ? "Pro" : "Standard"}</Td>
                <Td>{s.rate} %</Td>
                <Td>{fcfaShort(s.sales_30d)}</Td>
                <Td className="text-right">
                  <Button
                    size="sm"
                    variant={s.plan === "PRO" ? "secondary" : "soft"}
                    onClick={async () => {
                      qc.setQueryData(["admin", "commissions"], await api(`/admin/sellers/${s.id}/plan`, { method: "POST", body: { plan: s.plan === "PRO" ? "STANDARD" : "PRO" } }));
                      toast.success("Plan mis à jour (journalisé)");
                    }}
                  >
                    {s.plan === "PRO" ? "Repasser Standard" : "Passer Pro"}
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}

/* ───────────── Paramètres + journal d'audit */
const SETTINGS: [string, string, string][] = [
  ["commission_standard", "Commission plan Standard", "%"],
  ["commission_pro", "Commission plan Pro", "%"],
  ["guarantee_days", "Période de garantie", "jours"],
  ["payout_minimum", "Retrait minimum", "FCFA"],
  ["download_link_minutes", "Validité des liens de téléchargement", "min"],
  ["download_limit", "Téléchargements par achat", ""],
  ["payment_timeout_minutes", "Délai de paiement", "min"],
  ["bundle_discount_percent", "Remise « Souvent achetés ensemble »", "%"],
  ["pro_plan_price", "Prix indicatif du plan Pro", "FCFA / mois"],
  ["moderation_hours", "Délai cible de modération", "h"],
];
export function AdminSettings() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "settings"], queryFn: () => api<Record<string, number>>("/admin/settings") });
  const { data: audit } = useQuery({ queryKey: ["admin", "audit"], queryFn: () => api<{ data: { id: number; actor: string | null; action: string; entity: string; entity_id: number | null; metadata: Record<string, unknown> | null; ip: string | null; at: string }[] }>("/admin/audit") });
  const [form, setForm] = React.useState<Record<string, number>>({});
  React.useEffect(() => data && setForm(data), [data]);
  if (!data) return <Skeleton className="h-96 rounded-card" />;
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <form
        className="flex flex-col gap-5 rounded-card border border-border-default bg-bg-surface p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const changed = Object.fromEntries(Object.entries(form).filter(([k, v]) => data[k] !== v));
            qc.setQueryData(["admin", "settings"], await api("/admin/settings", { method: "PUT", body: changed }));
            qc.invalidateQueries({ queryKey: ["admin", "audit"] });
            toast.success("Paramètres enregistrés");
          } catch (err) {
            toast.error(errMsg(err));
          }
        }}
      >
        <h2 className="text-h4">Règles de la plateforme</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {SETTINGS.map(([k, l, u]) => (
            <Field key={k} label={l}>
              <Input inputMode="numeric" value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: Number(e.target.value.replace(/\D/g, "")) })} suffix={u ? <span className="text-body-sm text-text-tertiary">{u}</span> : null} />
            </Field>
          ))}
        </div>
        <Button type="submit" className="self-end">
          Enregistrer
        </Button>
      </form>
      <section className="rounded-card border border-border-default bg-bg-surface p-6">
        <h2 className="mb-4 text-h4">Journal d’audit</h2>
        <ul className="flex max-h-[560px] flex-col gap-3 overflow-y-auto">
          {(audit?.data ?? []).map((a) => (
            <li key={a.id} className="flex flex-col rounded-md bg-bg-page px-4 py-2.5 text-body-sm">
              <span className="text-label-sm">
                {a.action} · {a.entity}
                {a.entity_id ? ` #${a.entity_id}` : ""}
              </span>
              <span className="text-caption text-text-tertiary">
                {a.actor ?? "Système"} · {date(a.at)} {time(a.at)} · {a.ip}
              </span>
            </li>
          ))}
          {audit?.data.length === 0 && <li className="text-body-sm text-text-secondary">Aucune action enregistrée.</li>}
        </ul>
      </section>
    </div>
  );
}


