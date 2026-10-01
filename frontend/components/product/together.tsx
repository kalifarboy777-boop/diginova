"use client";

import { Plus, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/field";
import { api } from "@/lib/api";
import { fcfa, fcfaShort, num } from "@/lib/format";
import { useSetCart } from "@/lib/session";
import type { Cart, ProductCard } from "@/lib/types";
import { ProductCover } from "./product-cover";

/** « Souvent achetés ensemble » : sélection, total, remise groupée, ajout au panier. */
export function Together({ products, discountPercent }: { products: ProductCard[]; discountPercent: number }) {
  const [selected, setSelected] = React.useState(products.map((p) => p.id));
  const [busy, setBusy] = React.useState(false);
  const setCart = useSetCart();
  const router = useRouter();
  const chosen = products.filter((p) => selected.includes(p.id));
  const total = chosen.reduce((a, p) => a + p.price, 0);
  const discounted = chosen.length === products.length ? Math.round((total * (100 - discountPercent)) / 100) : total;

  async function add() {
    setBusy(true);
    try {
      const [first, ...rest] = chosen;
      const cart = await api<Cart>("/cart/items", { method: "POST", body: { product_id: first.id, product_ids: rest.map((p) => p.id) } });
      setCart(cart);
      toast.success(`${chosen.length} produits ajoutés au panier`, { action: { label: "Voir le panier", onClick: () => router.push("/panier") } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-5 rounded-card border border-border-default bg-bg-surface p-7" aria-labelledby="together-title">
      <h2 id="together-title" className="text-h4 text-text-primary">
        Souvent achetés ensemble
      </h2>
      <div className="flex items-center gap-3">
        {products.map((p, i) => (
          <React.Fragment key={p.id}>
            {i > 0 && <Plus className="size-4 shrink-0 text-text-tertiary" />}
            <div className="aspect-[108/81] flex-1 overflow-hidden rounded-md">
              <ProductCover type={p.cover_type} rounded={false} />
            </div>
          </React.Fragment>
        ))}
      </div>
      <ul className="flex flex-col gap-3">
        {products.map((p) => (
          <li key={p.id} className="flex items-center gap-2.5 text-body text-text-primary">
            <Checkbox checked={selected.includes(p.id)} onChange={() => setSelected((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))} aria-label={p.title} />
            <span className="flex-1 truncate">{p.title.replace(" — modèle complet", "").replace("gestion de stock", "stock")}</span>
            <span className="text-label">{fcfaShort(p.price)}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t border-border-default pt-4">
        <span className="text-body text-text-primary">Total pour les {chosen.length}</span>
        <span className="flex items-center gap-2">
          {discounted < total && <s className="text-body-sm text-text-tertiary">{num(total)}</s>}
          <span className="text-price text-brand-primary">{fcfa(discounted)}</span>
        </span>
      </div>
      <Button variant="dark" size="lg" block disabled={chosen.length === 0} loading={busy} onClick={add}>
        <ShoppingBag /> Ajouter les {chosen.length} au panier
      </Button>
    </section>
  );
}
