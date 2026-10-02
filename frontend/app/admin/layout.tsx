import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/guard";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · DigiNova" }, robots: { index: false } };

/** /admin/* : MODERATOR ou ADMIN (les écrans réservés ADMIN vérifient aussi le rôle). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireUser((u) => u.role === "ADMIN" || u.role === "MODERATOR", "/compte");
  return <AppShell variant="admin">{children}</AppShell>;
}
