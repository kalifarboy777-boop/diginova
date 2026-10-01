import type { Metadata } from "next";
import * as React from "react";
import { SentNotice } from "@/components/auth/password-forms";

export const metadata: Metadata = { title: "Lien envoyé", robots: { index: false } };

export default function Page() {
  return (
    <React.Suspense>
      <SentNotice />
    </React.Suspense>
  );
}
