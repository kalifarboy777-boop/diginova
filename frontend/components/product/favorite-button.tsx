"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useMe } from "@/lib/session";

/** Bouton favori (rond blanc 32 px sur les visuels, ou bouton secondaire sur la fiche produit). */
export function FavoriteButton({ productId, initial = false, className, variant = "overlay" }: { productId: number; initial?: boolean; className?: string; variant?: "overlay" | "plain" }) {
  const [fav, setFav] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const { user } = useMe();
  const router = useRouter();
  React.useEffect(() => setFav(initial), [initial]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast("Connectez-vous pour sauvegarder vos favoris.", { action: { label: "Connexion", onClick: () => router.push(`/connexion?suite=${encodeURIComponent(location.pathname)}`) } });
      return;
    }
    setBusy(true);
    setFav((f) => !f);
    try {
      const r = await api<{ favorite: boolean }>("/favorites/toggle", { method: "POST", body: { product_id: productId } });
      setFav(r.favorite);
      toast.success(r.favorite ? "Ajouté aux favoris — on vous prévient si le prix baisse." : "Retiré des favoris.");
    } catch {
      setFav((f) => !f);
      toast.error("Impossible de modifier vos favoris.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={fav}
      aria-label={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={cn(
        variant === "overlay"
          ? "flex size-8 items-center justify-center rounded-full bg-white text-[#111827] shadow-soft transition-transform hover:scale-105"
          : "flex size-[52px] items-center justify-center rounded-btn border border-border-strong bg-bg-surface text-text-primary hover:bg-bg-subtle",
        className,
      )}
    >
      <Heart className={cn(variant === "overlay" ? "size-4" : "size-5", fav && "fill-danger text-danger")} />
    </button>
  );
}
