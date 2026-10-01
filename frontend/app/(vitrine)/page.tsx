import { ArrowRight, Book, Check, Download, Gift, Search, ShieldCheck, Smartphone, Zap } from "lucide-react";
import Link from "next/link";
import { CategoryIcon } from "@/components/home/category-icon";
import { MobileHome } from "@/components/home/mobile-hero";
import { NewsletterForm } from "@/components/home/newsletter";
import { ProductTabs } from "@/components/home/product-tabs";
import { ProductCover } from "@/components/product/product-cover";
import { Badge, ProductBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/misc";
import { Stars } from "@/components/ui/rating";
import { cn } from "@/lib/cn";
import { fcfa, num, rating } from "@/lib/format";
import { serverApi } from "@/lib/server-api";
import type { Bundle, ProductCard, Review } from "@/lib/types";

export const revalidate = 60;

type Home = {
  hero: { resources: number; customers: number; rating: number; products: ProductCard[] };
  categories: { name: string; slug: string; count: number }[];
  tabs: Record<string, ProductCard[]>;
  bundle: Bundle | null;
  testimonials: (Review & { product: { title: string; slug: string } })[];
  creator: { share: number; payout_delay_hours: number };
};

const TRUST = [
  { icon: Smartphone, title: "Paiement Mobile Money", text: "Orange, MTN, Wave, Moov ou carte" },
  { icon: Zap, title: "Livraison instantanée", text: "Votre fichier en moins de 2 minutes" },
  { icon: Book, title: "Accès à vie", text: "Tout reste dans votre bibliothèque" },
  { icon: ShieldCheck, title: "Achat protégé", text: "Remboursement sous 7 jours si défaut" },
];

const STEPS = [
  { icon: Search, title: "Choisissez", text: "Parcourez plus de 1 200 ressources, consultez les aperçus et les avis d’acheteurs vérifiés." },
  { icon: Smartphone, title: "Payez en Mobile Money", text: "Orange Money, MTN MoMo, Wave, Moov ou carte. Validation directement sur votre téléphone." },
  { icon: Download, title: "Téléchargez", text: "Votre fichier est disponible immédiatement, par email et dans votre bibliothèque à vie." },
];

/** Contexte des avis d'exemple (métier / ville) affiché sous le nom. */
const CONTEXT: Record<string, string> = {
  "business-plan-pro": "Boutique de prêt-à-porter, Abidjan",
  "dashboard-excel-gestion-stock": "Quincaillerie, Bouaké",
  "pack-30-templates-instagram": "Community manager, Dakar",
};

function SectionHead({ title, text, href, cta }: { title: string; text?: string; href?: string; cta?: string }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div className="flex flex-col gap-2">
        <h2 className="text-h3 text-text-primary md:text-h2">{title}</h2>
        {text && <p className="text-body text-text-secondary">{text}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex items-center gap-1.5 text-label whitespace-nowrap text-brand-primary hover:underline">
          {cta} <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

function HeroCard({ product, className, small }: { product: ProductCard; className?: string; small?: boolean }) {
  return (
    <Link href={`/produit/${product.slug}`} className={cn("absolute flex flex-col gap-3 rounded-card bg-white p-3 shadow-float transition-transform hover:-translate-y-1", className)}>
      <div className="relative aspect-[250/188] overflow-hidden rounded-md">
        <ProductCover type={product.cover_type} />
        {product.badge && <ProductBadge label={product.badge} className="absolute top-3 left-3" />}
        <span className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-white shadow-soft" aria-hidden>
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="#111827" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
        </span>
      </div>
      <div className="flex flex-col gap-1.5 px-0.5 pb-1">
        <span className="text-overline text-[#9CA3AF]">{product.category?.label}</span>
        <span className={cn("text-body-medium text-[#111827]", small ? "line-clamp-2" : "line-clamp-2")}>{product.title}</span>
        <span className="inline-flex items-center gap-1">
          <svg viewBox="0 0 24 24" className="size-3.5 fill-[#F59E0B]"><path d="M12 2.6l2.9 6.06 6.6.8-4.87 4.56 1.25 6.54L12 17.3l-5.88 3.26 1.25-6.54L2.5 9.46l6.6-.8L12 2.6Z" /></svg>
          <span className="text-label-sm text-[#111827]">{rating(product.rating)}</span>
          <span className="text-caption text-[#9CA3AF]">({product.rating_count})</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="text-price text-[#111827]">{fcfa(product.price)}</span>
          {product.compare_at_price && <s className="text-body-sm text-[#9CA3AF]">{num(product.compare_at_price)}</s>}
        </span>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const home = await serverApi<Home>("/home");
  const [main, second] = home.hero.products;
  const bundle = home.bundle;

  return (
    <>
      <MobileHome categories={home.categories} trending={home.tabs.tendances ?? []} />
      {/* Hero */}
      <section className="relative hidden overflow-hidden bg-bg-surface md:block">
        <div className="pointer-events-none absolute top-[-120px] right-[-80px] size-[640px] rounded-full bg-brand-primary/14 blur-[120px]" aria-hidden />
        <div className="container-site relative grid items-center gap-14 pt-10 pb-14 lg:grid-cols-[620px_1fr] lg:pt-16 lg:pb-20">
          <div className="flex flex-col items-start gap-7">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-subtle py-[5px] pr-3.5 pl-[5px] text-label-sm text-brand-primary">
              <span className="rounded-full bg-brand-primary px-2.5 py-[3px] text-white">Nouveau</span>
              Plus de {num(Math.max(1200, home.hero.resources))} ressources pour entrepreneurs africains
            </span>
            <h1 className="text-[40px] leading-[46px] font-extrabold tracking-[-0.02em] text-text-primary md:text-display">Transformez vos idées en résultats.</h1>
            <p className="max-w-[540px] text-body-lg text-text-secondary">
              Business plans, templates, formations et outils IA prêts à l’emploi. Payez en Mobile Money, téléchargez en moins de 2 minutes, gardez-les à vie.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/boutique">
                  Explorer les produits <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/devenir-createur">Vendre mes créations</Link>
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2.5">
                {[["AK", "#635BFF"], ["FD", "#F59E0B"], ["KB", "#16A34A"], ["MS", "#DB2777"]].map(([i, c]) => (
                  <Avatar key={i} initials={i} color={c} size={36} className="ring-2 ring-bg-surface" />
                ))}
              </div>
              <div className="flex flex-col gap-0.5">
                <Stars value={5} size={14} />
                <span className="text-body-sm text-text-secondary">
                  {rating(home.hero.rating)}/5 · plus de 3 000 clients en Afrique de l’Ouest
                </span>
              </div>
            </div>
          </div>

          {main && second && (
            <div className="relative mx-auto hidden aspect-[600/520] w-full max-w-[600px] md:block" aria-hidden>
              <div className="absolute top-[5.8%] left-[6.7%] h-[90.4%] w-[90%] rounded-[32px] bg-brand-subtle" />
              <HeroCard product={main} className="top-[13.5%] left-[11.7%] w-[45.7%]" />
              <HeroCard product={second} className="top-[1.9%] left-[59.3%] w-[39%]" small />
              <span className="absolute top-[6.9%] left-0 inline-flex h-9 items-center gap-2 rounded-md bg-[#111827] px-3.5 text-label-sm text-white shadow-float">
                <Download className="size-4" /> Téléchargement en 1 clic
              </span>
              <div className="absolute top-[80.8%] left-[50%] flex items-center whitespace-nowrap gap-3 rounded-lg bg-white px-3.5 py-3 shadow-float">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#DCFCE7] text-[#16A34A]">
                  <Check className="size-5" />
                </span>
                <span className="flex flex-col">
                  <span className="text-label text-[#111827]">Paiement confirmé</span>
                  <span className="text-body-sm text-[#4B5563]">Payé avec Wave · fichier prêt</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Bandeau confiance */}
      <section className="border-y border-border-default bg-bg-surface">
        <div className="container-site grid grid-cols-1 gap-6 py-7 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-center gap-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-brand-subtle text-brand-primary">
                <Icon className="size-5" />
              </span>
              <span className="flex flex-col">
                <span className="text-label text-text-primary">{title}</span>
                <span className="text-body-sm text-text-secondary">{text}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Univers */}
      <section className="container-site flex flex-col gap-8 py-14 md:py-[72px]">
        <SectionHead title="Explorez par univers" text="Des ressources pensées pour le contexte africain : FCFA, OHADA, réalités des PME." href="/categories" cta="Toutes les catégories" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {home.categories.map((c) => (
            <Link key={c.slug} href={`/categorie/${c.slug}`} className="flex flex-col gap-4 rounded-card border border-border-default bg-bg-surface p-5 transition-shadow hover:shadow-soft">
              <CategoryIcon slug={c.slug} />
              <span className="flex flex-col gap-0.5">
                <span className="text-h4 text-text-primary">{c.name}</span>
                <span className="text-body-sm text-text-secondary">{c.count} produit{c.count > 1 ? "s" : ""}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Ressources du moment */}
      <section className="container-site flex flex-col gap-8 pb-14 md:pb-[72px]">
        <SectionHead title="Les ressources du moment" href="/boutique" cta="Voir toute la boutique" />
        <ProductTabs
          tabs={home.tabs}
          packs={
            bundle ? (
              <Link href={`/packs/${bundle.slug}`} className="flex items-center justify-between gap-4 rounded-card border border-border-default bg-bg-surface p-6 hover:shadow-soft">
                <span className="text-h4">{bundle.title}</span>
                <span className="text-price">{fcfa(bundle.price)}</span>
              </Link>
            ) : null
          }
        />
      </section>

      {/* Pack à la une */}
      {bundle && (
        <section className="container-site pt-6 pb-14 md:pb-[72px]">
          <div className="grid items-center gap-12 overflow-hidden rounded-[28px] bg-brand-deep p-8 text-white md:p-14 lg:grid-cols-[1fr_auto] dark:bg-[#1E1B4B]">
            <div className="flex flex-col items-start gap-5">
              <Badge tone="promo">Pack à la une</Badge>
              <h2 className="text-h2 text-white md:text-[40px] md:leading-[48px] md:font-extrabold md:tracking-[-0.015em]">{bundle.title}</h2>
              <p className="max-w-[500px] text-body-lg text-[#C7D2FE]">{bundle.tagline}</p>
              <ul className="flex flex-col gap-3.5">
                {bundle.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-3 text-body-medium text-white">
                    <span className="flex size-[22px] items-center justify-center rounded-full bg-brand-primary">
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                    {h}
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="text-price-lg text-white md:text-[32px] md:leading-10">{fcfa(bundle.price)}</span>
                <s className="text-body text-[#A5B4FC]">{fcfa(bundle.value)}</s>
                <Badge tone="success">-{bundle.discount_percent} %</Badge>
              </div>
              <Button asChild variant="white" size="lg">
                <Link href={`/packs/${bundle.slug}`}>
                  Découvrir le pack <ArrowRight />
                </Link>
              </Button>
            </div>
            <div className="relative hidden h-[350px] w-[490px] lg:block" aria-hidden>
              <div className="absolute top-[170px] left-0 h-[180px] w-[240px] overflow-hidden rounded-[20px] shadow-float">
                <ProductCover type="grid" rounded={false} />
              </div>
              <div className="absolute top-[170px] left-[240px] h-[168px] w-[240px] overflow-hidden rounded-[20px] shadow-float">
                <ProductCover type="notion" rounded={false} />
              </div>
              <div className="absolute top-[10px] left-[320px] h-[158px] w-[170px] overflow-hidden rounded-[20px] shadow-float">
                <ProductCover type="sheet" rounded={false} />
              </div>
              <div className="absolute top-0 left-[40px] h-[210px] w-[280px] overflow-hidden rounded-[20px] shadow-float">
                <ProductCover type="chart" rounded={false} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Comment ça marche */}
      <section id="comment" className="bg-bg-surface">
        <div className="container-site flex flex-col gap-8 py-14 md:py-[72px]">
          <SectionHead title="De la découverte au téléchargement en 3 étapes" text="Aucun compte à créer avant de payer : on s’occupe de tout." />
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="flex flex-col gap-4 rounded-card bg-bg-page p-8">
                <div className="flex items-start justify-between">
                  <span className="flex size-[52px] items-center justify-center rounded-md bg-brand-primary text-white">
                    <Icon className="size-6" />
                  </span>
                  <span className="font-display text-[32px] leading-10 font-bold text-border-strong">0{i + 1}</span>
                </div>
                <h3 className="mt-4 text-h3 text-text-primary">{title}</h3>
                <p className="text-body text-text-secondary">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Avis */}
      {home.testimonials.length > 0 && (
        <section className="container-site flex flex-col gap-8 py-14 md:py-[72px]">
          <SectionHead title="Ils ont gagné du temps avec DigiNova" text="Avis d’acheteurs vérifiés." />
          <div className="grid gap-6 md:grid-cols-3">
            {home.testimonials.map((r) => (
              <figure key={r.id} className="flex flex-col gap-5 rounded-card border border-border-default bg-bg-surface p-7">
                <Stars value={r.rating} size={16} />
                <blockquote className="flex-1 text-body-lg text-text-primary">« {r.comment} »</blockquote>
                <figcaption className="flex items-center gap-3">
                  <Avatar initials={r.initials} size={44} />
                  <span className="flex flex-col">
                    <span className="text-label text-text-primary">{r.author}</span>
                    <span className="text-body-sm text-text-secondary">{CONTEXT[r.product.slug] ?? `A acheté ${r.product.title}`}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Appel aux créateurs */}
      <section className="container-site pb-14 md:pb-[72px]">
        <div className="grid items-center gap-10 rounded-[28px] bg-brand-primary p-8 text-white md:p-14 lg:grid-cols-[1fr_340px]">
          <div className="flex flex-col items-start gap-5">
            <h2 className="text-h2 text-white md:text-[40px] md:leading-[48px] md:font-extrabold md:tracking-[-0.015em]">Vous créez ? Vendez sur DigiNova.</h2>
            <p className="max-w-[540px] text-body-lg text-white/85">Publiez vos templates, e-books et formations. Nous gérons le paiement, la livraison et le support. Vous encaissez en Mobile Money.</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="white" size="lg">
                <Link href="/devenir-createur">
                  Devenir créateur <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/devenir-createur#etapes">Comment ça marche</Link>
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {[
              [`${home.creator.share} %`, "de chaque vente reversés au créateur"],
              [`${home.creator.payout_delay_hours} h`, "pour être payé après la période de garantie"],
              ["0 FCFA", "pour ouvrir votre studio"],
            ].map(([v, t]) => (
              <div key={v} className="flex items-center gap-4 rounded-lg bg-white/12 px-5 py-4">
                <span className="font-display text-[24px] leading-8 font-bold whitespace-nowrap">{v}</span>
                <span className="text-body-sm text-white/85">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-bg-surface">
        <div className="container-site flex flex-col items-center gap-4 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-lg bg-success-subtle text-success">
            <Gift className="size-6" />
          </span>
          <h2 className="text-h3 text-text-primary md:text-h2">Recevez un produit gratuit chaque mois</h2>
          <p className="text-body text-text-secondary">Nouveautés, codes promo et ressources offertes. Un email par semaine, désinscription en un clic.</p>
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}
