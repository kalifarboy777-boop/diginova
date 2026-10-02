import { AdminSettings } from "@/components/admin/pages";
import { PageHeader } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/guard";

export const metadata = { title: "Paramètres" };

export default async function Page() {
  await requireUser((u) => u.role === "ADMIN", "/admin");
  return (
    <>
      <PageHeader
        title="Paramètres"
        subtitle="Règles de la plateforme · toute modification est journalisée."
      />
      <AdminSettings />
    </>
  );
}
