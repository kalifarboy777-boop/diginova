import type { Metadata } from "next";
import { Waiting } from "@/components/checkout/waiting";

export const metadata: Metadata = { title: "Paiement en attente", robots: { index: false } };

export default async function WaitingPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return (
    <div className="px-5 py-10 md:py-14">
      <Waiting orderId={Number(orderId)} />
    </div>
  );
}
