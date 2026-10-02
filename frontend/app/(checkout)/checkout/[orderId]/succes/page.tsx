import type { Metadata } from "next";
import { Success } from "@/components/checkout/success";

export const metadata: Metadata = { title: "Paiement confirmé", robots: { index: false } };

export default async function SuccessPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return (
    <div className="px-5 py-10 md:py-14">
      <Success orderId={Number(orderId)} />
    </div>
  );
}
