import { ArrowRight, Check, ShieldCheck, Tag, Upload, User, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { serverApi } from "@/lib/server-api";

export const metadata: Metadata = {
  title: "Devenir créateur",
  description: "Vendez vos templates, e-books et formations à toute l’Afrique francophone. Paiement Mobile Money, livraison sécurisée, 85 % reversés.",
};

const STEPS = [
  { icon: User, title: "Candidature", text: "Nom, bio, pays, exemple de travail et compte Mobile Money pour vos revenus." },
  { icon: ShieldCheck, title: "Vérification", text: "Identité et qualité des exemples vérifiées par l’équipe sous 72 h." },
  { icon: Upload, title: "Publication", text: "Ajoutez vos fichiers, aperçus et prix. Chaque produit est modéré avant mise en ligne." },
  { icon: Wallet, title: "Encaissement", text: "Revenus disponibles après 7 jours de garantie, retrait vers Mobile Money ou banque." },
];

/** Écran 05 — programme créateurs. */
export default async function CreatorLandingPage() {
  const home = await serverApi<{ creator: { share: number } }>("/home", { revalidate: 300 });
  const share = home.creator.share;
  const fmt = (n: number) => n.toLocaleString("fr-FR").replace(/ /g, " ");

  return (
    <>
      <section className="relative overflow-hidden bg-brand-deep text-white dark:bg-[#1E1B4B]">
        <div className="pointer-events-none absolute -top-40 right-0 size-[700px] rounded-full bg-brand-primary/30 blur-[140px]" aria-hidden />
        <div className="container-site relative grid items-center gap-14 py-16 lg:grid-cols-[1fr_520px] lg:py-20">
          <div className="flex flex-col items-start gap-6">
            <Badge tone="promo">Programme créateurs</Badge>
            <h1 className="text-[40px] leading-[46px] font-extrabold tracking-[-0.02em] md:text-display">Vendez vos créations digitales à toute l’Afrique francophone.</h1>
            <p className="max-w-[540px] text-body-lg text-[#C7D2FE]">
              Templates, e-books, formations, presets… Publiez en quelques minutes. DigiNova gère le paiement Mobile Money, la livraison sécurisée et le support client.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/studio/candidature">
                  Créer mon studio <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-[#A5B4FC]/60">
                <Link href="/aide/categorie/createurs">Guide du vendeur</Link>
              </Button>
            </div>
          </div>
          <div className="hidden rounded-[24px] bg-white p-6 text-[#111827] shadow-float md:block" aria-hidden>
            <div className="flex items-center justify-between">
              <span className="font-display text-[18px] font-bold">Bonjour Jean 👋</span>
              <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-label-sm text-[#4B5563]">Ce mois-ci</span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                ["Revenus nets", "420 000 F", "+18 %"],
                ["Ventes", "84", "+12"],
                ["Note", "4,8 ★", ""],
              ].map(([l, v, d]) => (
                <div key={l} className="rounded-md bg-[#F8F9FC] p-3.5">
                  <p className="text-caption text-[#4B5563]">{l}</p>
                  <p className="mt-1 font-display text-[18px] font-bold">{v}</p>
                  {d && <p className="mt-1 text-caption text-[#16A34A]">{d}</p>}
                </div>
              ))}
            </div>
            <div className="mt-6 flex h-[120px] items-end gap-3">
              {[30, 45, 38, 58, 50, 70, 64, 80, 72, 92, 85, 100].map((h, i) => (
                <span key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i === 11 ? "#635BFF" : "#EEEDFF" }} />
              ))}
            </div>
            <ul className="mt-4">
              {[
                ["Template CV", "28 ventes", "140 000 F"],
                ["Pack Canva", "21 ventes", "126 000 F"],
                ["Excel Business", "15 ventes", "90 000 F"],
              ].map(([t, n, r]) => (
                <li key={t} className="flex items-center justify-between border-t border-[#E5E7EB] py-4 text-body-sm">
                  <span className="text-label">{t}</span>
                  <span>
                    <span className="mr-3 text-[#4B5563]">{n}</span>
                    <span className="text-label">{r}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-b border-border-default bg-bg-surface">
        <div className="container-site grid grid-cols-2 gap-8 py-9 lg:grid-cols-4">
          {[
            [`${share} %`, "de chaque vente reversés"],
            ["72 h", "pour valider votre candidature"],
            ["0 FCFA", "pour ouvrir votre studio"],
            ["5", "moyens de paiement acceptés"],
          ].map(([v, l]) => (
            <div key={l}>
              <p className="font-display text-[40px] leading-[48px] font-extrabold text-brand-primary">{v}</p>
              <p className="text-body text-text-secondary">{l}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="etapes" className="container-site flex scroll-mt-24 flex-col gap-8 py-16">
        <div className="flex flex-col gap-2">
          <h2 className="text-h3 md:text-h2">Votre studio ouvert en 4 étapes</h2>
          <p className="text-body-lg text-text-secondary">Une procédure simple pour garantir la qualité du catalogue et la confiance des acheteurs.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="flex flex-col gap-4 rounded-card border border-border-default bg-bg-surface p-7">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-md bg-brand-subtle text-brand-primary">
                  <Icon className="size-5" />
                </span>
                <span className="text-label-sm text-text-tertiary">Étape {i + 1}</span>
              </div>
              <h3 className="text-h3">{title}</h3>
              <p className="text-body text-text-secondary">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="offres" className="scroll-mt-24 bg-bg-surface">
        <div className="mx-auto flex max-w-[1000px] flex-col items-center gap-10 px-5 py-16">
          <div className="flex flex-col gap-2 text-center">
            <h2 className="text-h3 md:text-h2">Une offre simple, sans frais fixes</h2>
            <p className="text-body-lg text-text-secondary">Vous ne payez que lorsque vous vendez.</p>
          </div>
          <div className="grid w-full gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-5 rounded-[24px] border border-border-default bg-bg-page p-8">
              <h3 className="text-h3">Créateur</h3>
              <p>
                <span className="font-display text-[40px] leading-[48px] font-extrabold">Gratuit</span> <span className="text-body-sm text-text-secondary">pour toujours</span>
              </p>
              <Badge tone="neutral" className="self-start">
                {100 - share} % de commission par vente
              </Badge>
              <ul className="flex flex-1 flex-col gap-3.5">
                {["Studio et page publique", "Produits illimités après validation", "Retraits Mobile Money", "Statistiques essentielles"].map((t) => (
                  <li key={t} className="flex items-center gap-3 text-body-medium">
                    <Check className="size-[18px] text-success" /> {t}
                  </li>
                ))}
              </ul>
              <Button asChild variant="secondary" size="lg" block>
                <Link href="/studio/candidature">Commencer gratuitement</Link>
              </Button>
            </div>
            <div className="flex flex-col gap-5 rounded-[24px] bg-brand-deep p-8 text-white dark:bg-[#1E1B4B]">
              <div className="flex items-center justify-between">
                <h3 className="text-h3 text-white">Créateur Pro</h3>
                <Badge tone="promo">Recommandé</Badge>
              </div>
              <p>
                <span className="font-display text-[40px] leading-[48px] font-extrabold">{fmt(9900)}&nbsp;FCFA</span> <span className="text-body-sm text-[#A5B4FC]">par mois · prix indicatif</span>
              </p>
              <Badge tone="brand" className="self-start bg-white">
                10 % de commission par vente
              </Badge>
              <ul className="flex flex-1 flex-col gap-3.5">
                {["Tout le plan Créateur", "Statistiques avancées", "Mise en avant mensuelle", "Badge Pro et retraits prioritaires"].map((t) => (
                  <li key={t} className="flex items-center gap-3 text-body-medium">
                    <Check className="size-[18px] text-[#A5B4FC]" /> {t}
                  </li>
                ))}
              </ul>
              <Button asChild size="lg" block>
                <Link href="/studio/candidature?plan=pro">Passer Pro</Link>
              </Button>
            </div>
          </div>
          <p className="flex w-full items-start gap-4 rounded-lg bg-brand-subtle px-7 py-5 text-body-medium text-text-primary">
            <Tag className="mt-0.5 size-5 shrink-0 text-brand-primary" />
            Exemple : pour une vente à 10 000 FCFA, vous recevez {fmt(10000 * share / 100)} FCFA (plan Créateur) ou 9 000 FCFA (plan Pro). Les frais de paiement sont pris en charge par DigiNova.
          </p>
        </div>
      </section>

      <section className="container-site py-16">
        <div className="flex flex-col items-center gap-5 rounded-[28px] bg-brand-primary px-6 py-14 text-center text-white">
          <h2 className="text-h2 text-white md:text-[40px] md:leading-[48px] md:font-extrabold">Prêt à vendre votre savoir-faire ?</h2>
          <p className="text-body-lg text-white/85">Rejoignez les créateurs qui vendent à Abidjan, Dakar, Lomé, Cotonou et Douala.</p>
          <Button asChild variant="white" size="lg">
            <Link href="/studio/candidature">
              Déposer ma candidature <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
