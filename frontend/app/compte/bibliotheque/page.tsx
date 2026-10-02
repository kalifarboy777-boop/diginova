import * as React from "react";
import { LibraryView } from "@/components/account/library";
import { PageHeader } from "@/components/layout/app-shell";

export const metadata = { title: "Ma bibliothèque" };

export default function LibraryPage() {
  return (
    <>
      <PageHeader title="Ma bibliothèque" subtitle="Accès à vie, mises à jour incluses." search="/compte/bibliotheque" />
      <React.Suspense>
        <LibraryView />
      </React.Suspense>
    </>
  );
}
