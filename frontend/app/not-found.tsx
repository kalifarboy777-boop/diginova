import { SearchX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <main id="contenu" className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg-page px-5 text-center">
      <Logo />
      <span className="flex size-16 items-center justify-center rounded-lg bg-brand-subtle text-brand-primary">
        <SearchX className="size-7" />
      </span>
      <p className="font-display text-[72px] leading-none font-extrabold text-brand-primary">404</p>
      <h1 className="text-h2">Page introuvable</h1>
      <p className="max-w-md text-body-lg text-text-secondary">Cette page n’existe pas ou a été déplacée. Les produits retirés restent accessibles dans la bibliothèque de leurs acheteurs.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/">Retour à l’accueil</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/boutique">Explorer la boutique</Link>
        </Button>
      </div>
    </main>
  );
}
