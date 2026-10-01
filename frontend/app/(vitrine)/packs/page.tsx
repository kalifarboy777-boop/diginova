import { ArrowRight, Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ProductCover } from "@/components/product/product-cover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/misc";
import { fcfa } from "@/lib/format";
import { serverApi } from "@/lib/server-api";
import type { Bundle } from "@/lib/types";

export const metadata: Metadata = { title: "Packs", description: "Packs DigiNova : plusieurs ressources réunies à prix réduit." };

export default async function PacksPage() {
  const { data } = await serverApi<{ data: Bundle[] }>("/bundles", { revalidate: 120 });
  return (
    <>
      <section className="bg-bg-surface">
        <div className="container-site flex flex-col gap-4 py-8">
          <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Packs" }]} />
          <h1 className="text-h2 md:text-h1">Packs</h1>
          <p className="max-w-[640px] text-body-lg text-text-secondary">Plusieurs ressources complémentaires réunies à prix réduit. Code BIENVENUE : -20 % supplémentaires sur les packs.</p>
        </div>
      </section>
      <section className="container-site flex flex-col gap-6 py-10">
        {data.map((b) => (
          <article key={b.id} className="grid items-center gap-8 overflow-hidden rounded-[24px] bg-brand-deep p-8 text-white md:grid-cols-[1fr_360px] md:p-12 dark:bg-[#1E1B4B]">
            <div className="flex flex-col items-start gap-4">
              {b.featured && <Badge tone="promo">Pack à la une</Badge>}
              <h2 className="text-h2 text-white">{b.title}</h2>
              <p className="max-w-[520px] text-body-lg text-[#C7D2FE]">{b.tagline}</p>
              <ul className="flex flex-col gap-2.5">
                {b.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-3 text-body-medium">
                    <Check className="size-4 text-[#A5B4FC]" /> {h}
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-3">
                <span className="text-price-lg">{fcfa(b.price)}</span>
                <s className="text-[#A5B4FC]">{fcfa(b.value)}</s>
                <Badge tone="success">-{b.discount_percent} %</Badge>
              </div>
              <Button asChild variant="white" size="lg">
                <Link href={`/packs/${b.slug}`}>
                  Découvrir le pack <ArrowRight />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3" aria-hidden>
              {(b.products ?? []).slice(0, 4).map((p) => (
                <div key={p.id} className="aspect-[4/3] overflow-hidden rounded-lg">
                  <ProductCover type={p.cover_type} rounded={false} />
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
