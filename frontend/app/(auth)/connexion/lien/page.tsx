import type { Metadata } from "next";
import * as React from "react";
import { MagicLinkConsumer } from "@/components/auth/password-forms";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default function Page() {
  return (
    <React.Suspense>
      <MagicLinkConsumer />
    </React.Suspense>
  );
}
