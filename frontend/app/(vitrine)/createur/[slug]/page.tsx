import { BadgeCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView, fetchProducts, type SearchParams } from "@/components/catalog/catalog-view";
import { Avatar } from "@/components/ui/misc";
import { compact, rating } from "@/lib/format";
import { serverApiOrNull } from "@/lib/server-api";

type Seller = { name: string; slug: string; bio: string | null; verified: boolean; plan: string; city: string | null; member_since: number; product_count: number; rating: number; sales: number; review_count: number };
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await serverApiOrNull<Seller>(`/sellers/${(await params).slug}`, { revalidate: 300 });
  return s ? { title: `${s.name} · boutique créateur`, description: s.bio ?? undefined } : { title: "Créateur" };
}

/** Boutique publique d'un créateur. */
export default async function SellerPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const s = await serverApiOrNull<Seller>(`/sellers/${slug}`, { revalidate: 300 });
  if (!s) notFound();
  const data = await fetchProducts(sp, { seller: slug });
  const initials = s.name.split(" ").slice(0, 2).map((w) => w[0]).join("");
  return (
    <>
      <section className="bg-brand-deep text-white dark:bg-[#1E1B4B]">
        <div className="container-site flex flex-col gap-6 py-12 md:flex-row md:items-center">
          <Avatar initials={initials} size={88} color="#635BFF" className="ring-4 ring-white/20" />
          <div className="flex flex-1 flex-col gap-2">
            <h1 className="flex items-center gap-2 text-h2 text-white">
              {s.name} {s.verified && <BadgeCheck className="size-6 text-[#A5B4FC]" aria-label="Créateur vérifié" />}
            </h1>
            <p className="text-body text-[#C7D2FE]">
              {s.city ?? "Afrique de l’Ouest"} · membre depuis {s.member_since}
              {s.plan === "PRO" ? " · Créateur Pro" : ""}
            </p>
            {s.bio && <p className="max-w-2xl text-body-lg text-white/85">{s.bio}</p>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              [String(s.product_count), "produits"],
              [`${rating(s.rating)} ★`, `${s.review_count} avis`],
              [compact(s.sales), "ventes"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-lg bg-white/10 px-4 py-3">
                <p className="text-h4 text-white">{v}</p>
                <p className="text-caption text-[#C7D2FE]">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CatalogView data={data} sp={sp} basePath={`/createur/${slug}`} title={`Les produits de ${s.name}`} breadcrumb={[{ label: "Accueil", href: "/" }, { label: "Créateurs" }, { label: s.name }]} />
    </>
  );
}
