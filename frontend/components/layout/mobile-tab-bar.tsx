"use client";

import { Heart, Home, LayoutGrid, PlusSquare, Search, User, Wallet, Package } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const SHOP = [
  { href: "/", label: "Accueil", icon: Home, exact: true },
  { href: "/boutique", label: "Boutique", icon: LayoutGrid },
  { href: "/recherche", label: "Recherche", icon: Search },
  { href: "/compte/favoris", label: "Favoris", icon: Heart },
  { href: "/compte", label: "Compte", icon: User, exact: true },
];
const STUDIO = [
  { href: "/studio", label: "Accueil", icon: Home, exact: true },
  { href: "/studio/produits", label: "Produits", icon: Package, exact: true },
  { href: "/studio/produits/nouveau", label: "Ajouter", icon: PlusSquare },
  { href: "/studio/revenus", label: "Revenus", icon: Wallet },
  { href: "/studio/profil", label: "Profil", icon: User },
];

/** Barre d'onglets fixe en bas, sous 768 px (écrans 60 à 67). */
export function MobileTabBar({ variant = "shop" }: { variant?: "shop" | "studio" }) {
  const pathname = usePathname();
  const items = variant === "studio" ? STUDIO : SHOP;
  // Les pages avec barre d'action collée (fiche produit, checkout) n'affichent pas les onglets.
  if (variant === "shop" && /^\/(produit|checkout|packs\/)/.test(pathname)) return null;
  return (
    <nav aria-label="Navigation mobile" className="fixed inset-x-0 bottom-0 z-40 border-t border-border-default bg-bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-medium", active ? "text-brand-primary" : "text-text-tertiary")}>
                <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Barre d'action collée en bas (fiche produit, checkout) sur mobile. */
export function StickyActionBar({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-border-default bg-bg-surface px-5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] shadow-float md:hidden">{children}</div>;
}
