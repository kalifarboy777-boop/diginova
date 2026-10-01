import type { Metadata } from "next";
import * as React from "react";
import { ForgotForm } from "@/components/auth/password-forms";

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false } };

export default function Page() {
  return (
    <React.Suspense>
      <ForgotForm />
    </React.Suspense>
  );
}
