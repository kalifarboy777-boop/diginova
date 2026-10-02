import type { Metadata } from "next";
import { notFound } from "next/navigation";
import * as React from "react";
import { MockPayment } from "./mock-payment";

export const metadata: Metadata = { title: "Prestataire simulé", robots: { index: false } };

/** Page de développement : simule la validation chez l'opérateur (MockProvider). */
export default async function MockPaymentPage({ params }: { params: Promise<{ ref: string }> }) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_MOCK_PAYMENT !== "1") notFound();
  const { ref } = await params;
  return (
    <React.Suspense>
      <MockPayment reference={ref} />
    </React.Suspense>
  );
}
