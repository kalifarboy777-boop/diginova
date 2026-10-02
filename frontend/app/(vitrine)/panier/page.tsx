import type { Metadata } from "next";
import { CartView } from "@/components/checkout/cart-view";
import { CartTitle } from "@/components/checkout/cart-title";

export const metadata: Metadata = { title: "Panier", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-site flex flex-col gap-8 pt-10 pb-16">
      <CartTitle />
      <CartView />
    </div>
  );
}
