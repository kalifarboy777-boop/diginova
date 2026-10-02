"use client";

import { Lock } from "lucide-react";
import { usePathname } from "next/navigation";
import { Stepper } from "@/components/ui/data";
import { Logo } from "@/components/ui/logo";

/** Header du tunnel d'achat : logo, étapes Panier → Paiement → Téléchargement, mention sécurité. */
export function CheckoutHeader() {
  const path = usePathname();
  const step = path.endsWith("/succes") ? 3 : 1;
  return (
    <header className="border-b border-border-default bg-bg-surface">
      <div className="container-site flex h-16 items-center gap-6 md:h-[76px]">
        <Logo />
        <Stepper steps={["Panier", "Paiement", "Téléchargement"]} current={step} className="mx-auto max-md:hidden" />
        <span className="ml-auto inline-flex items-center gap-2 text-label text-success md:ml-0">
          <Lock className="size-4" /> <span className="max-sm:hidden">Paiement 100 % sécurisé</span>
        </span>
      </div>
    </header>
  );
}
