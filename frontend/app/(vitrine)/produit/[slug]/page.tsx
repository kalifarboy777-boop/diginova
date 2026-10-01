import { BadgeCheck, Book, FileText, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyBox } from "@/components/product/buy-box";
import { Gallery } from "@/components/product/gallery";
import { ProductGrid } from "@/components/product/product-card";
import { ReportProduct, Reviews } from "@/components/product/reviews";
import { SectionTabs } from "@/components/product/section-tabs";
import { Together } from "@/components/product/together";
import { Button } from "@/components/ui/button";
import { Avatar, Breadcrumb } from "@/components/ui/misc";
import { Faq } from "@/components/ui/overlay";
import { Stars } from "@/components/ui/rating";
import { compact, date, fileSize, num, rating } from "@/lib/format";
import { serverApiOrNull } from "@/lib/server-api";
import type { ProductCard, ProductDetail, Review } from "@/lib/types";

type Data = {
  product: ProductDetail;
  reviews: Review[];
  together: { products: ProductCard[]; total: number; price: number; discount_percent: number };
  related: ProductCard[];
  viewer: { owns: boolean; can_review: boolean; is_favorite: boolean };
};

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = await serverApiOrNull<Data>(`/products/${slug}`, { revalidate: 300 });
  if (!d) return { title: "Produit introuvable" };
  const p = d.product;
  return {
    title: p.title,
    description: p.short_description ?? undefined,
    alternates: { canonical: `/produit/${p.slug}` },
    openGraph: { title: p.title, description: p.short_description ?? undefined, type: "website" },
  };
}

const ICONS = [FileText, FileText, Book, FileText, Sparkles];

/** Écran 04 — fiche produit. */
export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const d = await serverApiOrNull<Data>(`/products/${slug}`, { auth: true });
  if (!d) notFound();
  const p = d.product;
  const [first, ...rest] = (p.description ?? "").split("\n\n");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: p.short_description,
    sku: `DN-${p.id}`,
    category: p.category?.name,
    brand: { "@type": "Brand", name: p.seller.name },
    offers: { "@type": "Offer", priceCurrency: "XOF", price: p.price, availability: "https://schema.org/InStock", url: `/produit/${p.slug}` },
    ...(p.rating_count > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.rating_count } } : {}),
  };

  const specs: [string, string][] = [
    ["Format", p.formats.join(" · ")],
    ["Taille", fileSize(p.total_size)],
    ["Version", `${p.version}${p.version_updated_at ? ` · mise à jour le ${date(p.version_updated_at)}` : ""}`],
    ["Compatibilité", p.compatibility ?? "—"],
    ["Langue", p.language],
    ["Licence", "Personnelle ou commerciale"],
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container-site flex flex-col gap-6 pt-6 pb-12">
        <Breadcrumb
          items={[
            { label: "Accueil", href: "/" },
            { label: "Boutique", href: "/boutique" },
            ...(p.category ? [{ label: p.category.name, href: `/categorie/${p.category.slug}` }] : []),
            ...(p.subcategory ? [{ label: p.subcategory.name, href: `/categorie/${p.subcategory.slug}` }] : []),
            { label: p.title.split(" —")[0] },
          ]}
        />
        {!p.published && <p className="rounded-md bg-warning-subtle px-4 py-3 text-body-sm text-warning">Aperçu : ce produit n’est pas encore publié.</p>}
        <div className="grid gap-12 lg:grid-cols-[680px_1fr]">
          <Gallery cover={p.cover_type} images={p.images} badge={p.badge} title={p.title} pages={p.preview_pages} video={p.video_url} duration={p.video_duration} />
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <p className="text-overline text-brand-primary">
                {p.category?.label}
                {p.subcategory ? ` · ${p.subcategory.name.toUpperCase()}` : ""}
              </p>
              <h1 className="text-h2 text-text-primary md:text-[44px] md:leading-[52px] md:font-extrabold md:tracking-[-0.015em]">{p.title}</h1>
              {p.rating_count > 0 && (
                <a href="#avis" className="flex items-center gap-3">
                  <Stars value={p.rating} size={18} />
                  <span className="text-label text-text-primary">{rating(p.rating)}</span>
                  <span className="text-body-sm text-text-secondary">
                    {p.rating_count} avis · {num(p.sales_count)} ventes
                  </span>
                </a>
              )}
              <Link href={`/createur/${p.seller.slug}`} className="flex items-center gap-3 self-start">
                <Avatar initials={p.seller.initials} size={32} color="#635BFF" />
                <span className="text-body-sm text-text-secondary">par</span>
                <span className="text-label text-text-primary">{p.seller.name}</span>
                {p.seller.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-subtle px-2.5 py-1 text-label-sm text-brand-primary">
                    <BadgeCheck className="size-3.5" /> Créateur vérifié
                  </span>
                )}
              </Link>
              {p.short_description && <p className="text-body-lg text-text-secondary">{p.short_description}</p>}
            </div>
            <BuyBox productId={p.id} title={p.title} price={p.price} commercialPrice={p.commercial_price} compareAt={p.compare_at_price} favorite={d.viewer.is_favorite} owned={d.viewer.owns} />
          </div>
        </div>
      </div>

      <SectionTabs
        tabs={[
          { id: "description", label: "Description" },
          { id: "contenu", label: "Contenu du pack" },
          { id: "fiche", label: "Fiche technique" },
          { id: "avis", label: `Avis (${p.rating_count})` },
          { id: "faq", label: "FAQ" },
        ]}
      />

      <div className="container-site grid gap-12 py-12 lg:grid-cols-[1fr_472px]">
        <div className="flex flex-col gap-10">
          <section id="contenu" className="scroll-mt-40 rounded-card border border-border-default bg-bg-surface p-7">
            <h2 className="mb-2 text-h3 text-text-primary">Ce que vous obtenez</h2>
            <ul>
              {p.includes.map((it, i) => {
                const Icon = ICONS[i % ICONS.length];
                return (
                  <li key={it.title} className="flex items-center gap-4 border-b border-border-default py-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-brand-subtle text-brand-primary">
                      <Icon className="size-5" />
                    </span>
                    <span className="flex flex-1 flex-col">
                      <span className="text-label text-text-primary">{it.title}</span>
                      <span className="text-body-sm text-text-secondary">{it.description}</span>
                    </span>
                    <span className="rounded-full bg-bg-subtle px-2.5 py-1 text-label-sm whitespace-nowrap text-text-secondary">{it.format}</span>
                  </li>
                );
              })}
            </ul>
          </section>
          <section id="description" className="flex scroll-mt-40 flex-col gap-4">
            <h2 className="text-h3 text-text-primary">Description</h2>
            {[first, ...rest].filter(Boolean).map((para, i) => (
              <p key={i} className="text-body-lg text-text-secondary">
                {para}
              </p>
            ))}
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section id="fiche" className="scroll-mt-40 rounded-card border border-border-default bg-bg-surface p-7">
            <h2 className="mb-2 text-h4 text-text-primary">Fiche technique</h2>
            <dl>
              {specs.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 border-b border-border-default py-4">
                  <dt className="text-body text-text-secondary">{k}</dt>
                  <dd className="text-right text-label-sm text-text-primary">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="flex flex-col gap-5 rounded-card border border-border-default bg-bg-surface p-7">
            <div className="flex items-center gap-3.5">
              <Avatar initials={p.seller.initials} size={56} color="#635BFF" />
              <div className="flex flex-col">
                <span className="flex items-center gap-1.5 text-h4 text-text-primary">
                  {p.seller.name} {p.seller.verified && <BadgeCheck className="size-[18px] text-brand-primary" aria-label="Créateur vérifié" />}
                </span>
                <span className="text-body-sm text-text-secondary">
                  {p.seller.city ?? "Afrique de l’Ouest"} · membre depuis {p.seller.member_since}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                [String(p.seller.product_count), "produits"],
                [`${rating(p.seller.rating)} ★`, "note moyenne"],
                [compact(p.seller.sales), "ventes"],
              ].map(([v, l]) => (
                <div key={l} className="flex flex-col rounded-md bg-bg-page px-3 py-3">
                  <span className="text-h4 text-text-primary">{v}</span>
                  <span className="text-caption text-text-secondary">{l}</span>
                </div>
              ))}
            </div>
            <Button asChild variant="secondary" block>
              <Link href={`/createur/${p.seller.slug}`}>Voir la boutique du créateur</Link>
            </Button>
          </section>
          <ReportProduct slug={p.slug} />
        </aside>
      </div>

      <Reviews slug={p.slug} avg={p.rating} count={p.rating_count} distribution={p.rating_distribution} initial={d.reviews} canReview={d.viewer.can_review} />

      <div className="container-site grid gap-12 py-14 lg:grid-cols-[1fr_472px]">
        <section id="faq" className="flex scroll-mt-40 flex-col gap-5">
          <h2 className="text-h3 md:text-h2">Questions fréquentes</h2>
          <Faq items={p.faq} />
        </section>
        {d.together.products.length > 1 && <Together products={d.together.products} discountPercent={d.together.discount_percent} />}
      </div>

      {d.related.length > 0 && (
        <section className="container-site flex flex-col gap-8 pb-16">
          <h2 className="text-h3 md:text-h2">Vous aimerez aussi</h2>
          <ProductGrid products={d.related} />
        </section>
      )}
    </>
  );
}

