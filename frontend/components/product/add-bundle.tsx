"use client";

import { ShoppingBag, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useSetCart } from "@/lib/session";
import type { Cart } from "@/lib/types";

export function AddBundleButton({ bundleId }: { bundleId: number }) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const setCart = useSetCart();
  const router = useRouter();
  const add = async (then: "buy" | "cart") => {
    setBusy(then);
    try {
      setCart(await api<Cart>("/cart/items", { method: "POST", body: { bundle_id: bundleId } }));
      if (then === "buy") router.push("/checkout");
      else toast.success("Pack ajouté au panier", { action: { label: "Voir le panier", onClick: () => router.push("/panier") } });
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button size="lg" className="flex-1" loading={busy === "buy"} onClick={() => add("buy")}>
        <Zap /> Acheter le pack
      </Button>
      <Button size="lg" variant="secondary" className="flex-1" loading={busy === "cart"} onClick={() => add("cart")}>
        <ShoppingBag /> Ajouter au panier
      </Button>
    </div>
  );
}
