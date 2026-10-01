"use client";

import { Heart, LayoutDashboard, LogOut, Menu, ShoppingBag, Store, User as UserIcon, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Avatar } from "@/components/ui/misc";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useCart, useMe, useRefreshSession } from "@/lib/session";
import { SearchBox } from "./search-box";

export const NAV = [
  { href: "/boutique", label: "Boutique" },
  { href: "/categories", label: "Catégories" },
  { href: "/nouveautes", label: "Nouveautés" },
  { href: "/meilleures-ventes", label: "Meilleures ventes" },
  { href: "/packs", label: "Packs" },
];

/** Header vitrine (76 px) : logo, navigation, recherche, favoris, panier (compteur), connexion ou compte. */
export function Header() {
  const pathname = usePathname();
  const { user } = useMe();
  const { data: cart } = useCart();
  const [menu, setMenu] = React.useState(false);
  const [mobile, setMobile] = React.useState(false);
  const router = useRouter();
  const refresh = useRefreshSession();

  React.useEffect(() => setMobile(false), [pathname]);

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    await refresh();
    router.push("/");
    router.refresh();
  }

  const accountHome = user ? (user.role === "ADMIN" || user.role === "MODERATOR" ? "/admin" : "/compte") : "/connexion";

  return (
    <header className="sticky top-0 z-40 border-b border-border-default bg-bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-bg-surface/85">
      <div className="container-site flex h-16 items-center gap-10 md:h-[76px]">
        <Logo />
        <nav aria-label="Navigation principale" className="hidden items-center gap-7 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={pathname.startsWith(n.href) ? "page" : undefined}
              className={cn("text-body-medium whitespace-nowrap transition-colors hover:text-text-primary", pathname.startsWith(n.href) ? "text-text-primary" : "text-text-secondary")}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex-1" />
        <React.Suspense fallback={<div className="hidden h-11 w-[280px] rounded-btn bg-bg-subtle md:block" />}>
          <SearchBox className="hidden w-[280px] md:block" />
        </React.Suspense>
        <div className="-ml-6 flex items-center gap-1">
          <Link href="/compte/favoris" aria-label="Mes favoris" className="hidden size-11 items-center justify-center rounded-btn text-text-primary hover:bg-bg-subtle sm:flex">
            <Heart className="size-5" />
          </Link>
          <Link href="/panier" aria-label={`Panier (${cart?.count ?? 0} article${(cart?.count ?? 0) > 1 ? "s" : ""})`} className="relative flex size-11 items-center justify-center rounded-btn text-text-primary hover:bg-bg-subtle">
            <ShoppingBag className="size-5" />
            {(cart?.count ?? 0) > 0 && (
              <span className="absolute top-1 right-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-brand-primary px-1 text-caption leading-[18px] text-white">{cart!.count}</span>
            )}
          </Link>
        </div>
        {user ? (
          <div className="relative hidden md:block">
            <button type="button" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-haspopup="menu" className="flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-bg-subtle">
              <Avatar initials={user.initials} src={user.avatar_url} size={34} />
              <span className="text-label text-text-primary">{user.first_name}</span>
            </button>
            {menu && (
              <div role="menu" onMouseLeave={() => setMenu(false)} className="absolute top-full right-0 mt-2 w-56 rounded-lg border border-border-default bg-bg-surface p-1.5 shadow-float">
                <MenuLink href={accountHome} icon={<LayoutDashboard />}>{user.role === "ADMIN" || user.role === "MODERATOR" ? "Console admin" : "Mon compte"}</MenuLink>
                <MenuLink href="/compte/bibliotheque" icon={<UserIcon />}>Ma bibliothèque</MenuLink>
                {user.is_creator ? <MenuLink href="/studio" icon={<Store />}>Studio créateur</MenuLink> : <MenuLink href="/devenir-createur" icon={<Store />}>Devenir créateur</MenuLink>}
                <button role="menuitem" onClick={logout} className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-body-sm text-danger hover:bg-danger-subtle [&_svg]:size-4">
                  <LogOut /> Se déconnecter
                </button>
              </div>
            )}
          </div>
        ) : (
          <Button asChild variant="dark" className="hidden md:inline-flex">
            <Link href={`/connexion${pathname !== "/" ? `?suite=${encodeURIComponent(pathname)}` : ""}`}>Connexion</Link>
          </Button>
        )}
        <button type="button" className="-mr-2 flex size-11 items-center justify-center rounded-btn lg:hidden" onClick={() => setMobile((m) => !m)} aria-label="Menu" aria-expanded={mobile}>
          {mobile ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {mobile && (
        <div className="border-t border-border-default bg-bg-surface lg:hidden">
          <nav className="container-site flex flex-col py-3" aria-label="Navigation mobile">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="py-3 text-body-medium text-text-primary">
                {n.label}
              </Link>
            ))}
            <Link href={accountHome} className="py-3 text-body-medium text-brand-primary">
              {user ? "Mon compte" : "Connexion"}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

function MenuLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link role="menuitem" href={href} className="flex items-center gap-2.5 rounded-sm px-3 py-2 text-body-sm text-text-primary hover:bg-bg-subtle [&_svg]:size-4 [&_svg]:text-text-secondary">
      {icon}
      {children}
    </Link>
  );
}
