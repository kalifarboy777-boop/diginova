"use client";

import { useCart } from "@/lib/session";

export function CartTitle() {
  const { data } = useCart();
  return (
    <div className="flex items-center gap-4">
      <h1 className="text-h2 md:text-h1">Votre panier</h1>
      {!!data?.count && (
        <span className="rounded-full bg-bg-subtle px-2.5 py-1 text-label-sm text-text-secondary">
          {data.count} article{data.count > 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
