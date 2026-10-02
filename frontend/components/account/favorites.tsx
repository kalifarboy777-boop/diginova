"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, ShoppingBag, TrendingDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { FavoriteButton } from "@/components/product/favorite-button";
import { ProductCover } from "@/components/product/product-cover";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { api } from "@/lib/api";
import { fcfa, num } from "@/lib/format";
import { useSetCart } from "@/lib/session";
import type { Cart, ProductCard } from "@/lib/types";

type Fav = ProductCard & { price_at_save: number; price_drop: boolean };

/** Écran 33 — favoris avec alerte « Prix en baisse ». */
export function FavoritesView({ onCount }: { onCount?: (n: number) => void }) {
  const { data } = useQuery({ queryKey: ["favorites"], queryFn: () => api<{ data: Fav[] }>("/account/favorites") });
  const setCart = useSetCart();
  const router = useRouter();
  const qc = useQueryClient();
  React.useEffect(() => onCount?.(data?.data.length ?? 0), [data, onCount]);

  const add = async (id: number) => {
    setCart(await api<Cart>("/cart/items", { method: "POST", body: { product_id: id } }));
    toast.success("Ajouté au panier", { action: { label: "Voir le panier", onClick: () => router.push("/panier") } });
  };

  if (!data)
    return (
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-80 rounded-card" />
        ))}
      </div>
    );
  if (data.data.length === 0)
    return (
      <div className="rounded-card border border-border-default bg-bg-surface">
        <EmptyState icon={<Heart />} title="Aucun favori" text="Touchez le cœur d’un produit pour le sauvegarder : nous vous prévenons si son prix baisse." action={<Button asChild><Link href="/boutique">Explorer la boutique</Link></Button>} />
      </div>
    );

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {data.data.map((p) => (
        <article key={p.id} className="relative flex flex-col gap-3 rounded-card border border-border-default bg-bg-surface p-4">
          <div className="relative aspect-[321/200] overflow-hidden rounded-md">
            <ProductCover type={p.cover_type} rounded={false} />
            {p.price_drop && (
              <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-label-sm text-white">
                <TrendingDown className="size-3.5" /> Prix en baisse
              </span>
            )}
            <span onClickCapture={() => setTimeout(() => qc.invalidateQueries({ queryKey: ["favorites"] }), 400)}>
              <FavoriteButton productId={p.id} initial className="absolute top-3 right-3" />
            </span>
          </div>
          <span className="text-overline text-text-tertiary">{p.category?.label}</span>
          <Link href={`/produit/${p.slug}`} className="text-body-medium text-text-primary hover:underline">
            {p.title}
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-price">{fcfa(p.price)}</span>
            {p.price_drop && <s className="text-body-sm text-text-tertiary">{num(p.price_at_save)}</s>}
          </div>
          <Button variant="secondary" size="sm" className="mt-auto h-10" onClick={() => add(p.id)}>
            <ShoppingBag /> Ajouter au panier
          </Button>
        </article>
      ))}
    </div>
  );
}

export function AddAllFavorites() {
  const setCart = useSetCart();
  const router = useRouter();
  return (
    <Button
      onClick={async () => {
        setCart(await api<Cart>("/account/favorites/cart", { method: "POST" }));
        toast.success("Favoris ajoutés au panier");
        router.push("/panier");
      }}
    >
      <ShoppingBag /> Tout ajouter au panier
    </Button>
  );
}
