"use client";

import { Book, Lock, RefreshCw, Share2, ShieldCheck, ShoppingBag, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { StickyActionBar } from "@/components/layout/mobile-tab-bar";
import { Button } from "@/components/ui/button";
import { PaymentChips } from "@/components/ui/payment";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { discountPercent, fcfa } from "@/lib/format";
import { useSetCart } from "@/lib/session";
import type { Cart, License } from "@/lib/types";
import { FavoriteButton } from "./favorite-button";

/** Bloc d'achat : licence, prix, Acheter maintenant / Ajouter au panier, favori, partage, garanties. */
export function BuyBox({ productId, title, price, commercialPrice, compareAt, favorite, owned }: { productId: number; title: string; price: number; commercialPrice: number; compareAt: number | null; favorite: boolean; owned: boolean }) {
  const [license, setLicense] = React.useState<License>("PERSONAL");
  const [busy, setBusy] = React.useState<"buy" | "cart" | null>(null);
  const setCart = useSetCart();
  const router = useRouter();
  const current = license === "PERSONAL" ? price : commercialPrice;
  const pct = license === "PERSONAL" ? discountPercent(price, compareAt) : null;

  async function add(next: "buy" | "cart") {
    setBusy(next);
    try {
      const cart = await api<Cart>("/cart/items", { method: "POST", body: { product_id: productId, license } });
      setCart(cart);
      if (next === "buy") router.push("/checkout");
      else toast.success("Ajouté au panier", { action: { label: "Voir le panier", onClick: () => router.push("/panier") } });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Impossible d’ajouter au panier.");
    } finally {
      setBusy(null);
    }
  }

  async function share() {
    const url = location.href;
    if (navigator.share) await navigator.share({ title, url }).catch(() => {});
    else {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié");
    }
  }

  const options: { v: License; label: string; text: string; price: number }[] = [
    { v: "PERSONAL", label: "Personnelle", text: "Pour votre propre entreprise", price },
    { v: "COMMERCIAL", label: "Commerciale", text: "Pour vos clients (consultants, agences)", price: commercialPrice },
  ];

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 text-label text-text-primary">Licence</legend>
        {options.map((o) => (
          <label
            key={o.v}
            className={cn(
              "flex cursor-pointer items-center gap-3.5 rounded-cover px-5 py-4 transition-colors",
              license === o.v ? "border-2 border-brand-primary bg-brand-subtle" : "border border-border-default bg-bg-surface hover:border-border-strong",
            )}
          >
            <input type="radio" name="license" className="sr-only" checked={license === o.v} onChange={() => setLicense(o.v)} />
            <span className={cn("size-5 shrink-0 rounded-full border bg-white", license === o.v ? "border-[6px] border-brand-primary" : "border-[1.5px] border-border-strong")} aria-hidden />
            <span className="flex flex-1 flex-col">
              <span className="text-label text-text-primary">{o.label}</span>
              <span className="text-body-sm text-text-secondary">{o.text}</span>
            </span>
            <span className="text-price whitespace-nowrap text-text-primary">{fcfa(o.price)}</span>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-price-lg text-text-primary md:text-[34px] md:leading-[40px]">{fcfa(current)}</span>
        {pct && compareAt && <s className="text-body-lg text-text-tertiary">{fcfa(compareAt)}</s>}
        {pct && <span className="rounded-full bg-danger-subtle px-2.5 py-1 text-label-sm text-danger">-{pct} % · offre de lancement</span>}
      </div>

      <div className="flex flex-col gap-3">
        {owned ? (
          <Button size="lg" block onClick={() => router.push("/compte/bibliotheque")}>
            Déjà dans votre bibliothèque — télécharger
          </Button>
        ) : (
          <Button size="lg" block loading={busy === "buy"} onClick={() => add("buy")}>
            <Zap /> Acheter maintenant
          </Button>
        )}
        <div className="flex gap-3">
          <Button size="lg" variant="secondary" className="flex-1" loading={busy === "cart"} onClick={() => add("cart")}>
            <ShoppingBag /> Ajouter au panier
          </Button>
          <FavoriteButton productId={productId} initial={favorite} variant="plain" />
          <button type="button" onClick={share} aria-label="Partager" className="flex size-[52px] items-center justify-center rounded-btn border border-border-strong bg-bg-surface hover:bg-bg-subtle">
            <Share2 className="size-5" />
          </button>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-border-default bg-bg-surface p-5 text-body text-text-primary">
        {[
          [Zap, "Téléchargement immédiat"],
          [Book, "Accès à vie"],
          [RefreshCw, "Mises à jour incluses"],
          [ShieldCheck, "Remboursé sous 7 jours"],
        ].map(([Icon, t]) => {
          const I = Icon as typeof Zap;
          return (
            <li key={t as string} className="flex items-center gap-2.5">
              <I className="size-[18px] text-success" /> {t as string}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 inline-flex items-center gap-1.5 text-caption text-text-secondary">
          <Lock className="size-3.5" /> Paiement sécurisé
        </span>
        <PaymentChips />
      </div>

      <StickyActionBar>
        <div className="flex flex-col">
          <span className="text-caption text-text-tertiary">{license === "PERSONAL" ? "Licence personnelle" : "Licence commerciale"}</span>
          <span className="text-price text-text-primary">{fcfa(current)}</span>
        </div>
        <Button className="flex-1" loading={busy === "buy"} onClick={() => add("buy")}>
          <Zap /> Acheter
        </Button>
      </StickyActionBar>
    </div>
  );
}
