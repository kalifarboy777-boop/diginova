import type { Metadata } from "next";
import * as React from "react";
import { SetPasswordForm } from "@/components/auth/password-forms";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false } };

export default function Page() {
  return (
    <React.Suspense>
      <SetPasswordForm />
    </React.Suspense>
  );
}
