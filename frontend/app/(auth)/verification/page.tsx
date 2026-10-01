import type { Metadata } from "next";
import * as React from "react";
import { VerifyForm } from "@/components/auth/verify-form";

export const metadata: Metadata = { title: "Vérification", robots: { index: false } };

export default function VerifyPage() {
  return (
    <React.Suspense>
      <VerifyForm />
    </React.Suspense>
  );
}
