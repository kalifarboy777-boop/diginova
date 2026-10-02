import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { PaymentChips } from "@/components/ui/payment";
import { ThemeToggle } from "./theme-toggle";

const COLUMNS = [
  { title: "Explorer", links: [["Boutique", "/boutique"], ["Nouveautés", "/nouveautes"], ["Meilleures ventes", "/meilleures-ventes"], ["Packs", "/packs"], ["Produits gratuits", "/boutique?max=0"]] },
  { title: "Créateurs", links: [["Devenir créateur", "/devenir-createur"], ["Studio créateur", "/studio"], ["Guide du vendeur", "/aide/categorie/createurs"], ["Commissions", "/devenir-createur#offres"]] },
  { title: "Aide", links: [["Centre d’aide", "/aide"], ["Téléchargements", "/aide/categorie/telechargements"], ["Remboursements", "/aide/categorie/remboursements"], ["Contact", "/aide#contact"]] },
  { title: "Légal", links: [["CGU", "/cgu"], ["CGV", "/cgv"], ["Licences", "/licences"], ["Confidentialité", "/confidentialite"]] },
];

/** Pied de page sombre (bg/inverse) avec moyens de paiement. */
export function Footer() {
  return (
    <footer className="bg-bg-inverse pb-24 text-white md:pb-0">
      <div className="container-site flex flex-col gap-12 pt-16 pb-10">
        <div className="grid gap-10 md:grid-cols-[1.55fr_repeat(4,1fr)]">
          <div className="flex max-w-[300px] flex-col gap-4">
            <Logo inverse />
            <p className="text-body-sm text-[#9CA3AF]">Le meilleur du digital, à portée de clic. Des ressources professionnelles payables en Mobile Money et livrées instantanément.</p>
            <ThemeToggle dark className="self-start" />
          </div>
          {COLUMNS.map((c) => (
            <div key={c.title} className="flex flex-col gap-3">
              <h2 className="mb-1 text-label text-white">{c.title}</h2>
              {c.links.map(([label, href]) => (
                <Link key={href} href={href} className="text-body-sm text-[#9CA3AF] transition-colors hover:text-white">
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="flex flex-col items-start justify-between gap-5 border-t border-white/10 pt-7 md:flex-row md:items-center">
          <p className="text-body-sm text-[#6B7280]">© 2026 DigiNova · Abidjan, Côte d’Ivoire · <Link href="/mentions-legales" className="hover:text-white">Mentions légales</Link></p>
          <PaymentChips dark />
        </div>
      </div>
    </footer>
  );
}
