import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/guard";

export const metadata: Metadata = { title: { default: "Studio", template: "%s · Studio · DigiNova" }, robots: { index: false } };

/** /studio/* : réservé aux créateurs actifs (sinon → candidature). */
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  await requireUser((u) => u.is_creator, "/studio/candidature");
  return <AppShell variant="studio">{children}</AppShell>;
}
