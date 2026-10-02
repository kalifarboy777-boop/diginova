"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Bell,
  Box,
  ChevronDown,
  CircleHelp,
  FileText,
  Grid2x2,
  Heart,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Percent,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Store,
  Tag,
  User,
  Users,
  Wallet,
  CreditCard,
  X,
  Book,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { Logo } from "@/components/ui/logo";
import { Avatar } from "@/components/ui/misc";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { ago } from "@/lib/format";
import { useMe, useRefreshSession } from "@/lib/session";
import { MobileTabBar } from "./mobile-tab-bar";

type Variant = "client" | "studio" | "admin";
type NavItem = { href: string; label: string; icon: typeof Home; count?: number | null; exact?: boolean; danger?: boolean; adminOnly?: boolean };
type NavSection = { title?: string; items: NavItem[] };

function useNav(variant: Variant): { sections: NavSection[]; badge?: string } {
  const { data: client } = useQuery({ queryKey: ["nav", "client"], queryFn: () => api<Record<string, number>>("/account/nav"), enabled: variant === "client" });
  const { data: studio } = useQuery({ queryKey: ["nav", "studio"], queryFn: () => api<{ products: number }>("/studio/nav"), enabled: variant === "studio" });
  const { data: admin } = useQuery({ queryKey: ["nav", "admin"], queryFn: () => api<{ counts: Record<string, number> }>("/admin/nav"), enabled: variant === "admin", refetchInterval: 60_000 });

  if (variant === "client")
    return {
      sections: [
        {
          title: "MON COMPTE",
          items: [
            { href: "/compte", label: "Tableau de bord", icon: Home, exact: true },
            { href: "/compte/bibliotheque", label: "Ma bibliothèque", icon: Book, count: client?.library },
            { href: "/compte/commandes", label: "Commandes & factures", icon: FileText },
            { href: "/compte/favoris", label: "Favoris", icon: Heart, count: client?.favorites },
            { href: "/compte/coupons", label: "Coupons", icon: Tag, count: client?.coupons },
            { href: "/compte/profil", label: "Profil & sécurité", icon: User },
            { href: "/compte/support", label: "Support", icon: MessageSquare, count: client?.tickets_open || null },
            { href: "/", label: "Retour à la boutique", icon: ShoppingBag, exact: true },
          ],
        },
      ],
    };
  if (variant === "studio")
    return {
      badge: "Studio",
      sections: [
        {
          items: [
            { href: "/studio", label: "Tableau de bord", icon: Home, exact: true },
            { href: "/studio/produits", label: "Mes produits", icon: Box, count: studio?.products, exact: true },
            { href: "/studio/produits/nouveau", label: "Ajouter un produit", icon: Plus },
            { href: "/studio/ventes", label: "Ventes", icon: ShoppingBag },
            { href: "/studio/revenus", label: "Revenus & retraits", icon: Wallet },
            { href: "/studio/clients", label: "Clients", icon: Users },
            { href: "/studio/statistiques", label: "Statistiques", icon: BarChart3 },
            { href: "/studio/coupons", label: "Coupons", icon: Tag },
            { href: "/studio/profil", label: "Profil public", icon: User },
          ],
        },
      ],
    };
  const c = admin?.counts ?? {};
  return {
    badge: "Admin",
    sections: [
      { title: "PILOTAGE", items: [{ href: "/admin", label: "Tableau de bord", icon: Home, exact: true }] },
      {
        title: "CATALOGUE",
        items: [
          { href: "/admin/produits", label: "Produits", icon: Box, count: c.products, danger: true },
          { href: "/admin/categories", label: "Catégories", icon: Grid2x2 },
        ],
      },
      {
        title: "VENTES",
        items: [
          { href: "/admin/commandes", label: "Commandes", icon: ShoppingBag },
          { href: "/admin/paiements", label: "Paiements", icon: CreditCard, count: c.payments, danger: true, adminOnly: true },
          { href: "/admin/remboursements", label: "Remboursements", icon: RefreshCw, count: c.refunds, danger: true, adminOnly: true },
          { href: "/admin/coupons", label: "Coupons", icon: Tag, adminOnly: true },
        ],
      },
      {
        title: "COMMUNAUTÉ",
        items: [
          { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
          { href: "/admin/createurs", label: "Créateurs", icon: Star, count: c.creators, danger: true },
          { href: "/admin/avis", label: "Avis & signalements", icon: MessageSquare, count: c.reports, danger: true },
          { href: "/admin/tickets", label: "Tickets support", icon: MessageSquare, count: c.tickets, danger: true },
        ],
      },
      {
        title: "SYSTÈME",
        items: [
          { href: "/admin/commissions", label: "Commissions", icon: Percent, adminOnly: true },
          { href: "/admin/parametres", label: "Paramètres", icon: SlidersHorizontal, adminOnly: true },
        ],
      },
    ],
  };
}

function Sidebar({ variant, onNavigate }: { variant: Variant; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useMe();
  const router = useRouter();
  const refresh = useRefreshSession();
  const { sections, badge } = useNav(variant);
  const dark = variant === "admin";
  const isAdmin = user?.role === "ADMIN";

  const isActive = (it: NavItem) => (it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(`${it.href}/`));

  return (
    <div className={cn("flex h-full flex-col gap-1 px-4 py-6", dark ? "bg-[#0B0F1A] text-white" : "bg-bg-surface")}>
      <div className="flex items-center gap-2 px-2 pb-5">
        <Logo inverse={dark} />
        {badge && <span className={cn("rounded-full px-2.5 py-0.5 text-label-sm", dark ? "bg-white/10 text-white/80" : "bg-accent-amber text-white")}>{badge}</span>}
      </div>
      {variant === "studio" && user?.seller && (
        <Link href="/studio/profil" className="mb-4 flex items-center gap-3 rounded-lg border border-border-default bg-bg-page px-3 py-2.5" onClick={onNavigate}>
          <Avatar initials={user.initials} size={36} color="#16A34A" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-label text-text-primary">{user.seller.name}</span>
            <span className="truncate text-caption text-brand-primary">
              {user.seller.verified ? "Créateur vérifié" : "Créateur"}
              {user.seller.plan === "PRO" ? " · Pro" : ""}
            </span>
          </span>
          <ChevronDown className="size-4 text-text-tertiary" />
        </Link>
      )}
      <nav className="flex flex-col gap-1" aria-label={variant === "admin" ? "Console admin" : variant === "studio" ? "Studio créateur" : "Mon compte"}>
        {sections.map((s, si) => (
          <div key={si} className="flex flex-col gap-1">
            {s.title && <p className={cn("px-3 pt-3 pb-1.5 text-overline", dark ? "text-white/40" : "text-text-tertiary")}>{s.title}</p>}
            {s.items
              .filter((it) => !it.adminOnly || isAdmin || variant !== "admin")
              .map((it) => {
                const active = isActive(it);
                const Icon = it.icon;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-btn px-3 py-2.5 transition-colors",
                      dark
                        ? active
                          ? "bg-white/10 text-label text-white"
                          : "text-body-medium text-white/70 hover:bg-white/5 hover:text-white"
                        : active
                          ? "bg-brand-subtle text-label text-brand-primary"
                          : "text-body-medium text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
                    )}
                  >
                    <Icon className="size-[18px] shrink-0" />
                    <span className="flex-1">{it.label}</span>
                    {!!it.count && (
                      <span
                        className={cn(
                          "min-w-6 rounded-full px-2 py-0.5 text-center text-label-sm",
                          it.danger ? "bg-danger text-white" : active ? "bg-white text-brand-primary dark:bg-bg-surface" : "bg-bg-subtle text-text-secondary",
                        )}
                      >
                        {it.count}
                      </span>
                    )}
                  </Link>
                );
              })}
          </div>
        ))}
      </nav>
      <div className="flex-1" />
      {variant === "client" && (
        <div className="mt-6 flex flex-col items-start gap-2.5 rounded-cover bg-brand-deep p-4 text-white dark:bg-[#1E1B4B]">
          <CircleHelp className="size-5 text-[#A5B4FC]" />
          <p className="text-label">Besoin d’aide ?</p>
          <p className="text-caption text-[#C7D2FE]">Support WhatsApp 7j/7, réponse en moins de 2 h.</p>
          <Link href="/compte/support" onClick={onNavigate} className="rounded-btn bg-white px-3 py-2 text-label-sm text-[#111827]">
            Contacter
          </Link>
        </div>
      )}
      {variant === "studio" && (
        <Link href={`/createur/${user?.seller?.slug ?? ""}`} className="mt-4 flex items-center gap-2 rounded-btn border border-border-default px-3 py-2.5 text-label text-text-secondary hover:text-text-primary">
          <Store className="size-4" /> Voir ma boutique publique
        </Link>
      )}
      {user && (
        <div className={cn("mt-4 flex items-center gap-2.5 px-2 pt-4", dark ? "border-t border-white/10" : "border-t border-border-default")}>
          <Avatar initials={user.initials} src={user.avatar_url} size={38} color={dark ? "#635BFF" : undefined} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={cn("truncate text-label", dark ? "text-white" : "text-text-primary")}>{user.name}</span>
            <span className={cn("truncate text-caption", dark ? "text-white/50" : "text-text-tertiary")}>{variant === "admin" ? (user.role === "ADMIN" ? "Administrateur" : "Modérateur") : user.email}</span>
          </span>
          <button
            type="button"
            aria-label="Se déconnecter"
            title="Se déconnecter"
            onClick={async () => {
              await api("/auth/logout", { method: "POST" });
              await refresh();
              router.push("/");
            }}
            className={cn("rounded-sm p-1.5", dark ? "text-white/50 hover:bg-white/10 hover:text-white" : "text-text-tertiary hover:bg-bg-subtle hover:text-text-primary")}
          >
            <LogOut className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Coque des espaces connectés : barre latérale 264 px (client / studio / admin sombre) + contenu. */
export function AppShell({ variant, children }: { variant: Variant; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  React.useEffect(() => setOpen(false), [pathname]);
  return (
    <div className="min-h-screen bg-bg-page lg:pl-[264px]">
      <aside className={cn("fixed inset-y-0 left-0 z-30 hidden w-[264px] overflow-y-auto border-r lg:block", variant === "admin" ? "border-[#1F2937]" : "border-border-default")}>
        <Sidebar variant={variant} />
      </aside>
      <div className={cn("sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 lg:hidden", variant === "admin" ? "border-[#1F2937] bg-[#0B0F1A] text-white" : "border-border-default bg-bg-surface")}>
        <button type="button" onClick={() => setOpen(true)} aria-label="Ouvrir le menu" className="-ml-1 rounded-sm p-1.5">
          <Menu className="size-5" />
        </button>
        <Logo inverse={variant === "admin"} size={28} />
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal aria-label="Menu">
          <button type="button" aria-label="Fermer le menu" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[280px] overflow-y-auto shadow-float">
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="absolute top-5 right-3 z-10 rounded-sm p-1 text-text-tertiary">
              <X className="size-5" />
            </button>
            <Sidebar variant={variant} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
      <main id="contenu" className="px-5 pt-6 pb-28 md:px-10 md:pt-8 lg:pb-12">
        {children}
      </main>
      {variant === "studio" && <MobileTabBar variant="studio" />}
      {variant === "client" && <MobileTabBar />}
    </div>
  );
}

/** En-tête de page : titre H1, sous-titre, actions (recherche, cloche, boutons). */
export function PageHeader({ title, subtitle, actions, search, bell = true }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; search?: string; bell?: boolean }) {
  const router = useRouter();
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-start">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2 text-text-primary md:text-[32px] md:leading-10">{title}</h1>
        {subtitle && <p className="text-body-lg text-text-secondary">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {actions}
        {search !== undefined && (
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get("q");
              router.push(`${search}?q=${encodeURIComponent(String(q ?? ""))}`);
            }}
            className="flex h-[42px] w-full items-center gap-2.5 rounded-btn border border-border-default bg-bg-surface px-3.5 focus-within:border-brand-primary sm:w-60"
          >
            <Search className="size-4 text-text-tertiary" />
            <input name="q" placeholder="Rechercher…" aria-label="Rechercher" className="min-w-0 flex-1 bg-transparent text-body-sm outline-none placeholder:text-text-tertiary" />
          </form>
        )}
        {bell && <NotificationBell />}
      </div>
    </div>
  );
}

type Notif = { id: string; kind: string; title: string; body: string | null; url: string | null; read: boolean; created_at: string };

export function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const { data, refetch } = useQuery({ queryKey: ["notifications"], queryFn: () => api<{ data: Notif[]; unread: number }>("/account/notifications"), refetchInterval: 60_000 });
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications${data?.unread ? ` (${data.unread} non lues)` : ""}`}
        aria-expanded={open}
        onClick={async () => {
          setOpen((o) => !o);
          if (!open && data?.unread) {
            await api("/account/notifications/read", { method: "POST" });
            setTimeout(() => refetch(), 2000);
          }
        }}
        className="relative flex size-[42px] items-center justify-center rounded-btn border border-border-default bg-bg-surface text-text-primary hover:bg-bg-subtle"
      >
        <Bell className="size-[18px]" />
        {!!data?.unread && <span className="absolute top-2 right-2.5 size-2 rounded-full bg-danger ring-2 ring-bg-surface" />}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-lg border border-border-default bg-bg-surface shadow-float" onMouseLeave={() => setOpen(false)}>
          <p className="border-b border-border-default px-4 py-3 text-label">Notifications</p>
          <ul className="max-h-96 overflow-y-auto">
            {(data?.data ?? []).length === 0 && <li className="px-4 py-6 text-center text-body-sm text-text-secondary">Aucune notification.</li>}
            {(data?.data ?? []).map((n) => (
              <li key={n.id} className={cn("border-b border-border-default last:border-0", !n.read && "bg-brand-subtle/50")}>
                <Link href={n.url ?? "#"} className="flex flex-col gap-0.5 px-4 py-3 hover:bg-bg-subtle" onClick={() => setOpen(false)}>
                  <span className="text-label-sm text-text-primary">{n.title}</span>
                  {n.body && <span className="line-clamp-2 text-caption text-text-secondary">{n.body}</span>}
                  <span className="text-caption text-text-tertiary">{ago(n.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

