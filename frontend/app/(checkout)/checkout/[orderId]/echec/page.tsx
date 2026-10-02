import type { Metadata } from "next";
import { Failure } from "@/components/checkout/failure";

export const metadata: Metadata = { title: "Paiement échoué", robots: { index: false } };

export default async function FailurePage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return (
    <div className="px-5 py-10 md:py-14">
      <Failure orderId={Number(orderId)} />
    </div>
  );
}
