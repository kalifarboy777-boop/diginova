"use client";

import { Lock, ShieldCheck, Tag, X, Zap } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { fcfa } from "@/lib/format";
import { useSetCart } from "@/lib/session";
import type { Cart } from "@/lib/types";

/** Code promo : champ de saisie, ou bandeau vert « CODE appliqué » avec bouton pour retirer. */
export function CouponBox({ cart }: { cart: Cart }) {
  const setCart = useSetCart();
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  if (cart.coupon && !cart.coupon_error) {
    return (
      <div className="flex items-center gap-2 rounded-btn bg-success-subtle px-3 py-2.5 text-label text-success">
        <Tag className="size-4" />
        <span className="flex-1">{cart.coupon.code} appliqué</span>
        <button
          type="button"
          aria-label="Retirer le code promo"
          onClick={async () => setCart(await api<Cart>("/cart/coupon", { method: "DELETE" }))}
          className="rounded p-0.5 hover:bg-success/10"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }
  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const c = await api<Cart>("/cart/coupon", { method: "POST", body: { code } });
          setCart(c);
          setCode("");
          toast.success(`Code ${c.coupon?.code} appliqué`);
        } catch (err) {
          setError(err instanceof ApiError ? (err.field("code") ?? err.message) : "Code invalide.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="flex gap-2">
        <label className="flex h-11 flex-1 items-center gap-2 rounded-btn border border-border-strong bg-bg-surface px-3 focus-within:border-brand-primary">
          <Tag className="size-4 text-text-tertiary" />
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Code promo" aria-label="Code promo" className="min-w-0 flex-1 bg-transparent text-body uppercase outline-none placeholder:normal-case placeholder:text-text-tertiary" />
        </label>
        <Button type="submit" variant="secondary" loading={busy} disabled={!code}>
          Appliquer
        </Button>
      </div>
      {(error || cart.coupon_error) && <p className="text-caption text-danger">{error ?? cart.coupon_error}</p>}
    </form>
  );
}

export function Totals({ cart }: { cart: Cart }) {
  return (
    <dl className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <dt className="text-body text-text-secondary">
          Sous-total ({cart.count} article{cart.count > 1 ? "s" : ""})
        </dt>
        <dd className="text-label text-text-primary">{fcfa(cart.subtotal)}</dd>
      </div>
      {cart.discount > 0 && (
        <div className="flex items-center justify-between">
          <dt className="text-body text-text-secondary">Réduction {cart.coupon?.code}</dt>
          <dd className="text-label text-success">- {fcfa(cart.discount)}</dd>
        </div>
      )}
      <div className="flex items-center justify-between">
        <dt className="text-body text-text-secondary">Frais de paiement</dt>
        <dd className="text-label text-success">Offerts</dd>
      </div>
      <div className="h-px bg-border-default" />
      <div className="flex items-center justify-between">
        <dt className="text-label text-text-primary">Total</dt>
        <dd className="text-price-lg text-text-primary">{fcfa(cart.total)}</dd>
      </div>
    </dl>
  );
}

export function Reassurance() {
  return (
    <ul className="flex flex-col gap-2.5 rounded-md bg-bg-page p-4 text-body-sm text-text-secondary">
      {[
        [Zap, "Téléchargement immédiat après paiement"],
        [ShieldCheck, "Remboursement sous 7 jours si fichier défectueux"],
        [Lock, "Paiement chiffré, aucune donnée bancaire stockée"],
      ].map(([Icon, t]) => {
        const I = Icon as typeof Zap;
        return (
          <li key={t as string} className="flex items-center gap-2.5">
            <I className="size-4 shrink-0 text-success" /> {t as string}
          </li>
        );
      })}
    </ul>
  );
}
