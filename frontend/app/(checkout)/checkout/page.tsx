import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export const metadata: Metadata = { title: "Paiement", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 pt-10 pb-16">
      <CheckoutForm />
    </div>
  );
}
