import { AdminRefunds } from "@/components/admin/pages";
import { PageHeader } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/guard";

export const metadata = { title: "Remboursements" };

export default async function Page() {
  await requireUser((u) => u.role === "ADMIN", "/admin");
  return (
    <>
      <PageHeader
        title="Remboursements"
        subtitle="Demandes sous garantie de 7 jours."
      />
      <AdminRefunds />
    </>
  );
}
