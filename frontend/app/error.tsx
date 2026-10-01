"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="contenu" className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-5 text-center">
      <span className="flex size-16 items-center justify-center rounded-lg bg-danger-subtle text-danger">
        <AlertTriangle className="size-7" />
      </span>
      <h1 className="text-h2">Une erreur est survenue</h1>
      <p className="max-w-md text-body-lg text-text-secondary">Le service est momentanément indisponible. Vos achats et paiements ne sont pas affectés.</p>
      <div className="flex gap-3">
        <Button onClick={reset}>Réessayer</Button>
        <Button asChild variant="secondary">
          <Link href="/">Accueil</Link>
        </Button>
      </div>
    </main>
  );
}
