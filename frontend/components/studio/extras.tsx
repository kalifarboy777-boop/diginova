"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Plus, ShoppingBag, Users } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { RevenueBars } from "@/components/dashboard/charts";
import { Button } from "@/components/ui/button";
import { StatCard, Table, Td, Th } from "@/components/ui/data";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Avatar, EmptyState, Skeleton } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { methodColor } from "@/components/ui/payment";
import { Stars } from "@/components/ui/rating";
import { api, ApiError } from "@/lib/api";
import { ago, date, fcfa, fcfaShort, num, rating } from "@/lib/format";
import type { Review } from "@/lib/types";

const card = "rounded-card border border-border-default bg-bg-surface";

export function SalesView() {
  const [page, setPage] = React.useState(1);
  const { data } = useQuery({
    queryKey: ["studio", "sales", page],
    queryFn: () => api<{ data: { id: number; order: string; customer: string; product: string; license: string; price: number; commission: number; net: number; method: string; paid_at: string }[]; meta: { total: number; page: number; last_page: number }; totals: { gross: number; net: number; count: number } }>("/studio/sales", { query: { page } }),
    placeholderData: (p) => p,
  });
  if (!data) return <Skeleton className="h-96 rounded-card" />;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-5 sm:grid-cols-3">
        <StatCard label="Ventes (total)" value={num(data.totals.count)} />
        <StatCard label="Chiffre d’affaires brut" value={fcfaShort(data.totals.gross)} />
        <StatCard label="Revenus nets" value={fcfaShort(data.totals.net)} hint="après commission DigiNova" />
      </div>
      <div className={card}>
        {data.data.length === 0 ? (
          <EmptyState icon={<ShoppingBag />} title="Aucune vente pour le moment" text="Vos ventes apparaîtront ici dès le premier paiement confirmé." />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  {["Date", "Commande", "Client", "Produit", "Licence", "Prix", "Commission", "Net"].map((h) => (
                    <Th key={h}>{h}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.data.map((s) => (
                  <tr key={s.id}>
                    <Td className="whitespace-nowrap">{date(s.paid_at)}</Td>
                    <Td className="whitespace-nowrap">{s.order}</Td>
                    <Td>{s.customer}</Td>
                    <Td className="max-w-[220px] truncate">{s.product}</Td>
                    <Td>{s.license === "COMMERCIAL" ? "Commerciale" : "Personnelle"}</Td>
                    <Td className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ background: methodColor(s.method === "Carte bancaire" ? "CARD" : null) }} />
                        {fcfaShort(s.price)}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap text-text-secondary">-{fcfaShort(s.commission)}</Td>
                    <Td className="text-label whitespace-nowrap text-success">+{fcfaShort(s.net)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="flex items-center justify-between px-5 py-4 text-body-sm text-text-secondary">
              Page {data.meta.page} / {data.meta.last_page}
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

export function CustomersView() {
  const { data } = useQuery({ queryKey: ["studio", "customers"], queryFn: () => api<{ data: { name: string; initials: string; city: string | null; purchases: number; spent: number; last_at: string }[]; total: number }>("/studio/customers") });
  if (!data) return <Skeleton className="h-96 rounded-card" />;
  return (
    <div className={card}>
      {data.data.length === 0 ? (
        <EmptyState icon={<Users />} title="Pas encore de clients" />
      ) : (
        <Table>
          <thead>
            <tr>
              {["Client", "Ville", "Achats", "Total dépensé", "Dernier achat"].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.data.map((c, i) => (
              <tr key={i}>
                <Td>
                  <span className="flex items-center gap-3">
                    <Avatar initials={c.initials} size={32} /> {c.name}
                  </span>
                </Td>
                <Td>{c.city ?? "—"}</Td>
                <Td>{c.purchases}</Td>
                <Td className="text-label">{fcfaShort(c.spent)}</Td>
                <Td>{ago(c.last_at)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <p className="px-5 py-4 text-caption text-text-tertiary">Les coordonnées des acheteurs ne sont pas partagées (protection des données). Répondez-leur via les avis.</p>
    </div>
  );
}

export function StatsView() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["studio", "stats"],
    queryFn: () => api<{ chart: { points: { label: string; value: number }[] }; products: { title: string; views: number; sales: number; conversion: number; rating: number; reviews: number }[]; methods: Record<string, number> }>("/studio/stats"),
  });
  const { data: reviews } = useQuery({ queryKey: ["studio", "reviews"], queryFn: () => api<{ data: Review[] }>("/studio/reviews") });
  const [reply, setReply] = React.useState<Review | null>(null);
  const [text, setText] = React.useState("");
  if (!data) return <Skeleton className="h-96 rounded-card" />;
  const methodTotal = Object.values(data.methods).reduce((a, b) => a + b, 0) || 1;
  const labels: Record<string, string> = { WAVE: "Wave", ORANGE_MONEY: "Orange Money", MTN_MOMO: "MTN MoMo", MOOV_MONEY: "Moov Money", CARD: "Carte bancaire" };
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className={`${card} p-6`}>
          <h2 className="mb-5 text-h4">Revenus nets · 12 derniers mois</h2>
          <RevenueBars data={data.chart.points} />
        </section>
        <section className={`${card} p-6`}>
          <h2 className="mb-5 text-h4">Moyens de paiement</h2>
          <ul className="flex flex-col gap-4">
            {Object.entries(data.methods)
              .sort((a, b) => b[1] - a[1])
              .map(([m, n]) => (
                <li key={m} className="flex flex-col gap-1.5">
                  <span className="flex justify-between text-body-sm">
                    {labels[m] ?? m} <span className="text-label-sm">{Math.round((n / methodTotal) * 100)} %</span>
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-bg-subtle">
                    <span className="block h-full rounded-full" style={{ width: `${(n / methodTotal) * 100}%`, background: methodColor(m as never) }} />
                  </span>
                </li>
              ))}
          </ul>
        </section>
      </div>
      <section className={card}>
        <h2 className="px-6 pt-6 pb-2 text-h4">Performance par produit</h2>
        <Table>
          <thead>
            <tr>
              {["Produit", "Vues", "Ventes", "Conversion", "Note"].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.products.map((p) => (
              <tr key={p.title}>
                <Td className="text-label">{p.title}</Td>
                <Td>{num(p.views)}</Td>
                <Td>{p.sales}</Td>
                <Td>{rating(p.conversion)} %</Td>
                <Td className="whitespace-nowrap">
                  {p.reviews ? `${rating(p.rating)} ★ (${p.reviews})` : "—"}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </section>
      <section id="avis" className={`${card} scroll-mt-6 p-6`}>
        <h2 className="mb-4 text-h4">Avis de vos clients</h2>
        <ul className="flex flex-col divide-y divide-border-default">
          {(reviews?.data ?? []).map((r) => (
            <li key={r.id} className="flex flex-col gap-2 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <Avatar initials={r.initials} size={32} />
                <span className="text-label">{r.author}</span>
                <Stars value={r.rating} size={14} />
                <span className="text-caption text-text-tertiary">
                  {r.product?.title} · {ago(r.created_at)}
                </span>
              </div>
              {r.comment && <p className="text-body text-text-primary">{r.comment}</p>}
              {r.seller_reply ? (
                <p className="rounded-md bg-bg-subtle px-4 py-2.5 text-body-sm text-text-secondary">
                  <strong className="text-text-primary">Votre réponse · </strong>
                  {r.seller_reply}
                </p>
              ) : (
                <Button variant="soft" size="sm" className="self-start" onClick={() => { setReply(r); setText(""); }}>
                  <MessageSquare /> Répondre
                </Button>
              )}
            </li>
          ))}
          {reviews?.data.length === 0 && <li className="py-6 text-body-sm text-text-secondary">Aucun avis pour le moment.</li>}
        </ul>
      </section>
      <Dialog open={!!reply} onOpenChange={(o) => !o && setReply(null)}>
        <DialogContent title="Répondre à l’avis" description="Une seule réponse publique par avis.">
          <form
            className="flex flex-col gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api(`/studio/reviews/${reply!.id}/reply`, { method: "POST", body: { reply: text } });
                toast.success("Réponse publiée");
                setReply(null);
                qc.invalidateQueries({ queryKey: ["studio", "reviews"] });
              } catch (err) {
                toast.error(err instanceof ApiError ? err.message : "Erreur");
              }
            }}
          >
            <p className="rounded-md bg-bg-subtle px-4 py-3 text-body-sm">« {reply?.comment} »</p>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} required />
            <Button type="submit" block>
              Publier la réponse
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type StudioCoupon = { id: number; code: string; label: string; used: number; limit: number | null; expires_at: string | null; active: boolean; product: string | null };

export function StudioCouponsView() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["studio", "coupons"], queryFn: () => api<{ data: StudioCoupon[] }>("/studio/coupons") });
  const { data: products } = useQuery({ queryKey: ["studio", "products", "", ""], queryFn: () => api<{ data: { id: number; title: string; status: string }[] }>("/studio/products") });
  const [open, setOpen] = React.useState(false);
  const [f, setF] = React.useState({ code: "", type: "PERCENT", value: 10, product_id: 0, usage_limit: "", expires_at: "" });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const published = (products?.data ?? []).filter((p) => p.status === "PUBLISHED");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button onClick={() => { setOpen(true); setF((x) => ({ ...x, product_id: published[0]?.id ?? 0 })); }}>
          <Plus /> Créer un coupon
        </Button>
      </div>
      <div className={card}>
        {!data ? (
          <Skeleton className="m-5 h-40" />
        ) : data.data.length === 0 ? (
          <EmptyState icon={<Plus />} title="Aucun coupon" text="Créez un code promo pour un de vos produits et partagez-le à votre communauté." />
        ) : (
          <Table>
            <thead>
              <tr>
                {["Code", "Réduction", "Produit", "Utilisations", "Expiration", "Statut"].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.data.map((c) => (
                <tr key={c.id}>
                  <Td className="text-label text-brand-primary">{c.code}</Td>
                  <Td>{c.label}</Td>
                  <Td>{c.product}</Td>
                  <Td>
                    {c.used}
                    {c.limit ? ` / ${c.limit}` : ""}
                  </Td>
                  <Td>{c.expires_at ? date(c.expires_at) : "—"}</Td>
                  <Td>
                    <button
                      type="button"
                      className={c.active ? "rounded-full bg-success-subtle px-2.5 py-1 text-label-sm text-success" : "rounded-full bg-bg-subtle px-2.5 py-1 text-label-sm text-text-secondary"}
                      onClick={async () => qc.setQueryData(["studio", "coupons"], await api(`/studio/coupons/${c.id}/toggle`, { method: "POST" }))}
                    >
                      {c.active ? "Actif" : "Désactivé"}
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Nouveau coupon">
          <form
            className="flex flex-col gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                qc.setQueryData(["studio", "coupons"], await api("/studio/coupons", { method: "POST", body: { ...f, usage_limit: f.usage_limit || null, expires_at: f.expires_at || null } }));
                setOpen(false);
                toast.success("Coupon créé");
              } catch (err) {
                if (err instanceof ApiError) setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])));
              }
            }}
          >
            <Field label="Code" error={errors.code}>
              <Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="RENTREE20" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
                  <option value="PERCENT">Pourcentage</option>
                  <option value="FIXED">Montant fixe</option>
                </Select>
              </Field>
              <Field label={f.type === "PERCENT" ? "Réduction (%)" : "Réduction (FCFA)"} error={errors.value}>
                <Input inputMode="numeric" value={f.value} onChange={(e) => setF({ ...f, value: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
              </Field>
            </div>
            <Field label="Produit" error={errors.product_id}>
              <Select value={f.product_id} onChange={(e) => setF({ ...f, product_id: Number(e.target.value) })}>
                {published.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Limite d’utilisations">
                <Input inputMode="numeric" value={f.usage_limit} onChange={(e) => setF({ ...f, usage_limit: e.target.value.replace(/\D/g, "") })} placeholder="Illimité" />
              </Field>
              <Field label="Expire le" error={errors.expires_at}>
                <Input type="date" value={f.expires_at} onChange={(e) => setF({ ...f, expires_at: e.target.value })} />
              </Field>
            </div>
            <Button type="submit" block>
              Créer
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function StudioProfileView() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["studio", "profile"], queryFn: () => api<{ display_name: string; slug: string; bio: string | null; country: string; plan: string; commission_rate: number; verified: boolean }>("/studio/profile") });
  const [f, setF] = React.useState({ display_name: "", bio: "", country: "CI" });
  React.useEffect(() => data && setF({ display_name: data.display_name, bio: data.bio ?? "", country: data.country }), [data]);
  if (!data) return <Skeleton className="h-96 rounded-card" />;
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <form
        className={`${card} flex flex-col gap-5 p-6`}
        onSubmit={async (e) => {
          e.preventDefault();
          qc.setQueryData(["studio", "profile"], await api("/studio/profile", { method: "PUT", body: f }));
          toast.success("Profil public mis à jour");
        }}
      >
        <Field label="Nom public du studio">
          <Input value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} />
        </Field>
        <Field label="Biographie" help={`${f.bio.length} / 300`}>
          <Textarea maxLength={300} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} />
        </Field>
        <Field label="Pays">
          <Select value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>
            {[["CI", "Côte d’Ivoire"], ["SN", "Sénégal"], ["TG", "Togo"], ["BJ", "Bénin"], ["CM", "Cameroun"], ["BF", "Burkina Faso"], ["ML", "Mali"]].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" className="self-end">
          Enregistrer
        </Button>
      </form>
      <aside className={`${card} flex flex-col gap-3 p-6`}>
        <h2 className="text-h4">Votre offre</h2>
        <p className="text-body text-text-secondary">
          Plan {data.plan === "PRO" ? "Créateur Pro" : "Créateur"} · commission {data.commission_rate} %
        </p>
        <p className="text-body-sm text-text-tertiary">Le passage au plan Pro (10 %) est activé par l’équipe DigiNova sur demande au support.</p>
        <Button asChild variant="secondary">
          <a href={`/createur/${data.slug}`}>Voir ma boutique publique</a>
        </Button>
        <p className="text-caption text-text-tertiary">{fcfa(9900)} par mois · prix indicatif</p>
      </aside>
    </div>
  );
}
