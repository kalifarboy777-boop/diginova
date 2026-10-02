import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/guard";

export const metadata: Metadata = { title: { default: "Mon compte", template: "%s · Mon compte · DigiNova" }, robots: { index: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <AppShell variant="client">{children}</AppShell>;
}
