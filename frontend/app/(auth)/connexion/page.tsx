import type { Metadata } from "next";
import * as React from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default function LoginPage() {
  return (
    <React.Suspense>
      <LoginForm />
    </React.Suspense>
  );
}
