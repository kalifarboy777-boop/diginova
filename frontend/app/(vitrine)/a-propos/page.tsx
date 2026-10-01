import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "À propos" };

export default function AboutPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-14">
      <h1 className="text-h2 md:text-h1">Le meilleur du digital, à portée de clic.</h1>
      <p className="text-body-lg text-text-secondary">
        DigiNova est une marketplace de produits numériques pensée pour l’Afrique francophone : business plans, tableaux de gestion, factures OHADA, templates réseaux sociaux, e-books et packs IA.
      </p>
      <p className="text-body-lg text-text-secondary">
        On paie en Mobile Money (Wave, Orange Money, MTN MoMo, Moov Money) ou par carte, on télécharge immédiatement, et chaque achat reste à vie dans sa bibliothèque. Les créateurs vendent via leur studio et encaissent leurs revenus en Mobile Money.
      </p>
      <p className="text-body-lg text-text-secondary">DigiNova est basée à Abidjan, Côte d’Ivoire.</p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/boutique">Explorer la boutique</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/devenir-createur">Devenir créateur</Link>
        </Button>
      </div>
    </div>
  );
}
