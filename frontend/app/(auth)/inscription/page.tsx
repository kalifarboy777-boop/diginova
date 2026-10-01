import type { Metadata } from "next";
import * as React from "react";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Créer un compte", robots: { index: false } };

export default function RegisterPage() {
  return (
    <React.Suspense>
      <RegisterForm />
    </React.Suspense>
  );
}
