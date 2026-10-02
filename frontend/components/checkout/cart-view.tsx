"use client";

import { ArrowRight, ChevronDown, Gift, Heart, Info, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { ProductCover } from "@/components/product/product-cover";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { PaymentChips } from "@/components/ui/payment";
import { RatingInline } from "@/components/ui/rating";
import { api, ApiError } from "@/lib/api";
import { fcfa } from "@/lib/format";
import { useCart, useSetCart } from "@/lib/session";
import type { Cart, CartLine, License } from "@/lib/types";
import { CouponBox, Reassurance, Totals } from "./summary";

function Line({ line }: { line: CartLine }) {
  const setCart = useSetCart();
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const run = async (fn: () => Promise<Cart>, ok?: string) => {
    setBusy(true);
    try {
      setCart(await fn());
      if (ok) toast.success(ok);
    } catch (e) {
      if (e instanceof ApiError && e.errors.auth) toast(e.errors.auth[0], { action: { label: "Connexion", onClick: () => router.push("/connexion?suite=/panier") } });
      else toast.error(e instanceof ApiError ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  };
  const p = line.product;
  const b = line.bundle;
  return (
    <article className="flex flex-col gap-5 rounded-card border border-border-default bg-bg-surface p-5 sm:flex-row" aria-busy={busy}>
      <Link href={p ? `/produit/${p.slug}` : `/packs/${b!.slug}`} className="h-[120px] w-40 shrink-0 overflow-hidden rounded-cover">
        <ProductCover type={p?.cover_type ?? b!.cover_type} rounded={false} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="text-overline text-text-tertiary">{p ? p.category?.label : "PACK"}</span>
        <Link href={p ? `/produit/${p.slug}` : `/packs/${b!.slug}`} className="text-h4 text-text-primary hover:underline">
          {p?.title ?? b!.title}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-body-sm text-text-secondary">par {p ? p.seller.name : "DigiNova"}</span>
          {p && <RatingInline value={p.rating} count={p.rating_count} />}
          {line.group && <span className="rounded-full bg-success-subtle px-2 py-0.5 text-label-sm text-success">{line.group}</span>}
        </div>
        {p && (
          <label className="relative inline-flex h-[34px] items-center self-start rounded-sm border border-border-strong pr-8 pl-3 text-label-sm text-text-primary">
            <select
              aria-label="Licence"
              value={line.license}
              disabled={busy}
              onChange={(e) => run(() => api<Cart>(`/cart/items/${line.id}`, { method: "PATCH", body: { license: e.target.value as License } }), "Licence mise à jour")}
              className="appearance-none bg-transparent outline-none [field-sizing:content]"
            >
              <option value="PERSONAL">Licence personnelle</option>
              <option value="COMMERCIAL">Licence commerciale (+{fcfa(p.commercial_price - p.price)})</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 size-3.5 text-text-secondary" />
          </label>
        )}
        <div className="flex gap-5 pt-1 text-label-sm text-text-secondary">
          {p && (
            <button type="button" disabled={busy} onClick={() => run(() => api<Cart>(`/cart/items/${line.id}/save`, { method: "POST" }), "Sauvegardé dans vos favoris")} className="inline-flex items-center gap-1.5 hover:text-text-primary">
              <Heart className="size-3.5" /> Sauvegarder pour plus tard
            </button>
          )}
          <button type="button" disabled={busy} onClick={() => run(() => api<Cart>(`/cart/items/${line.id}`, { method: "DELETE" }), "Article retiré")} className="inline-flex items-center gap-1.5 hover:text-danger">
            <Trash2 className="size-3.5" /> Retirer
          </button>
        </div>
      </div>
      <div className="flex flex-row items-end justify-between gap-1 sm:flex-col sm:items-end sm:justify-start">
        <span className="text-price whitespace-nowrap text-text-primary">{fcfa(line.price)}</span>
        {line.compare_at_price && line.compare_at_price > line.price && <s className="text-body-sm whitespace-nowrap text-text-tertiary">{fcfa(line.compare_at_price)}</s>}
      </div>
    </article>
  );
}

/** Écran 20 — panier. */
export function CartView() {
  const { data: cart, isLoading } = useCart();

  if (isLoading || !cart)
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-[190px] rounded-card" />
          <Skeleton className="h-[190px] rounded-card" />
        </div>
        <Skeleton className="h-[500px] rounded-card" />
      </div>
    );

  if (cart.count === 0)
    return (
      <div className="rounded-card border border-border-default bg-bg-surface">
        <EmptyState
          icon={<ShoppingBag />}
          title="Votre panier est vide"
          text="Business plans, templates, e-books… Trouvez la ressource qui fera gagner du temps à votre activité."
          action={
            <Button asChild>
              <Link href="/boutique">
                Explorer la boutique <ArrowRight />
              </Link>
            </Button>
          }
        />
      </div>
    );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
      <div className="flex flex-col gap-4">
        {cart.items.map((l) => (
          <Line key={l.id} line={l} />
        ))}
        {cart.upsell && (
          <div className="flex flex-col gap-5 rounded-card bg-brand-deep p-6 text-white sm:flex-row sm:items-center dark:bg-[#1E1B4B]">
            <span className="flex size-[52px] shrink-0 items-center justify-center rounded-cover bg-brand-primary">
              <Gift className="size-6" />
            </span>
            <div className="flex flex-1 flex-col gap-1">
              <p className="text-h4 text-white">Passez au {cart.upsell.bundle.title}</p>
              <p className="text-body-sm text-[#C7D2FE]">{cart.upsell.message}</p>
            </div>
            <Button asChild variant="white">
              <Link href={`/packs/${cart.upsell.bundle.slug}`}>Voir le pack</Link>
            </Button>
          </div>
        )}
        <p className="flex items-center gap-3 rounded-cover border border-border-default bg-bg-surface px-5 py-4 text-body-sm text-text-secondary">
          <Info className="size-[18px] shrink-0 text-brand-primary" />
          Produits numériques : aucune livraison physique. Vous recevez vos fichiers immédiatement après paiement.
        </p>
      </div>
      <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        <div className="flex flex-col gap-4 rounded-card border border-border-default bg-bg-surface p-7">
          <h2 className="text-h4 text-text-primary">Récapitulatif</h2>
          <CouponBox cart={cart} />
          <Totals cart={cart} />
          <Button asChild size="lg" block>
            <Link href="/checkout">
              Passer au paiement <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="ghost" block>
            <Link href="/boutique">Continuer mes achats</Link>
          </Button>
          <Reassurance />
        </div>
        <PaymentChips />
      </aside>
    </div>
  );
}
