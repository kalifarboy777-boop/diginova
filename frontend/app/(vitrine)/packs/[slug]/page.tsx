import { Check } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddBundleButton } from "@/components/product/add-bundle";
import { ProductGrid } from "@/components/product/product-card";
import { ProductCover } from "@/components/product/product-cover";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/misc";
import { PaymentChips } from "@/components/ui/payment";
import { fcfa } from "@/lib/format";
import { serverApiOrNull } from "@/lib/server-api";
import type { Bundle } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await serverApiOrNull<{ data: Bundle }>(`/bundles/${(await params).slug}`, { revalidate: 120 });
  return r ? { title: r.data.title, description: r.data.tagline ?? undefined } : { title: "Pack" };
}

export default async function BundlePage({ params }: Props) {
  const r = await serverApiOrNull<{ data: Bundle }>(`/bundles/${(await params).slug}`, { revalidate: 120 });
  if (!r) notFound();
  const b = r.data;
  return (
    <div className="container-site flex flex-col gap-10 py-8">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Packs", href: "/packs" }, { label: b.title }]} />
      <div className="grid gap-12 lg:grid-cols-[1fr_480px]">
        <div className="grid grid-cols-2 gap-4">
          {(b.products ?? []).map((p) => (
            <div key={p.id} className="aspect-[4/3] overflow-hidden rounded-[20px]">
              <ProductCover type={p.cover_type} rounded={false} title={p.title} />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-5">
          {b.featured && <Badge tone="promo" className="self-start">Pack à la une</Badge>}
          <h1 className="text-h2 md:text-h1">{b.title}</h1>
          <p className="text-body-lg text-text-secondary">{b.tagline}</p>
          <ul className="flex flex-col gap-3">
            {b.highlights.map((h) => (
              <li key={h} className="flex items-center gap-3 text-body-medium">
                <span className="flex size-[22px] items-center justify-center rounded-full bg-brand-primary text-white">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                {h}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-price-lg md:text-[34px] md:leading-[40px]">{fcfa(b.price)}</span>
            <s className="text-body-lg text-text-tertiary">{fcfa(b.value)}</s>
            <Badge tone="success">-{b.discount_percent} %</Badge>
          </div>
          <AddBundleButton bundleId={b.id} />
          <PaymentChips />
        </div>
      </div>
      <section className="flex flex-col gap-6">
        <h2 className="text-h3">Inclus dans le pack</h2>
        <ProductGrid products={b.products ?? []} />
      </section>
    </div>
  );
}
