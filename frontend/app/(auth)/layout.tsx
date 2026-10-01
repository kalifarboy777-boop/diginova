import { Book, ChevronLeft, Smartphone, Zap } from "lucide-react";
import Link from "next/link";
import { ProductCover } from "@/components/product/product-cover";
import { Logo, LogoMark } from "@/components/ui/logo";

/** Écrans 10 à 14 : panneau de marque (620 px, brand/deep) + zone formulaire (440 px). */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg-surface">
      <aside className="relative hidden w-[620px] shrink-0 flex-col overflow-hidden bg-brand-deep p-14 text-white lg:flex dark:bg-[#1E1B4B]">
        <div className="pointer-events-none absolute -bottom-40 -left-20 size-[600px] rounded-full bg-brand-primary/40 blur-[120px]" aria-hidden />
        <Logo inverse className="relative" />
        <div className="relative flex flex-1 items-center" aria-hidden>
          <div className="relative h-[250px] w-[508px]">
            <div className="absolute top-[36px] left-0 h-[162px] w-[204px] -rotate-6 overflow-hidden rounded-[14px] border-[3px] border-white/25 shadow-[0_18px_36px_rgb(0_0_0/0.35)]">
              <ProductCover type="grid" rounded={false} />
            </div>
            <div className="absolute top-[50px] right-0 h-[153px] w-[193px] rotate-6 overflow-hidden rounded-[14px] border-[3px] border-white/25 shadow-[0_18px_36px_rgb(0_0_0/0.35)]">
              <ProductCover type="sheet" rounded={false} />
            </div>
            <div className="absolute top-0 left-[140px] h-[173px] w-[230px] overflow-hidden rounded-[14px] border-[3px] border-white/25 shadow-[0_18px_36px_rgb(0_0_0/0.35)]">
              <ProductCover type="chart" rounded={false} />
            </div>
          </div>
        </div>
        <div className="relative flex flex-col gap-8">
          <p className="font-display text-[40px] leading-[48px] font-extrabold tracking-[-0.015em]">Le meilleur du digital, à portée de clic.</p>
          <ul className="flex flex-col gap-3.5">
            {[
              [Smartphone, "Payez en Orange Money, MTN, Wave, Moov ou carte"],
              [Zap, "Téléchargement immédiat après paiement"],
              [Book, "Vos achats à vie dans votre bibliothèque"],
            ].map(([Icon, t]) => {
              const I = Icon as typeof Zap;
              return (
                <li key={t as string} className="flex items-center gap-3 text-body-medium text-[#E0E7FF]">
                  <span className="flex size-8 items-center justify-center rounded-sm bg-white/10">
                    <I className="size-4" />
                  </span>
                  {t as string}
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col px-5 py-6 md:px-20 md:py-10">
        <div className="flex h-12 items-center justify-between md:h-[100px]">
          <Link href="/" className="inline-flex items-center gap-1.5 text-label text-text-secondary hover:text-text-primary">
            <ChevronLeft className="size-4" /> Retour à la boutique
          </Link>
          <span className="text-label-sm text-text-tertiary">FR · XOF</span>
        </div>
        <main id="contenu" className="flex flex-1 flex-col items-center justify-center py-8">
          <div className="w-full max-w-[440px]">
            <LogoMark size={56} className="mb-6 rounded-[16px] lg:hidden" />
            {children}
          </div>
        </main>
        <p className="text-center text-caption text-text-tertiary">
          Connexion chiffrée · <Link href="/cgu" className="hover:text-text-secondary">CGU</Link> · <Link href="/confidentialite" className="hover:text-text-secondary">Confidentialité</Link>
        </p>
      </div>
    </div>
  );
}
