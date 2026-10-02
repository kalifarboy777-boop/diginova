import { AdminCatalog } from "@/components/admin/pages";
import { PageHeader } from "@/components/layout/app-shell";

export const metadata = { title: "Catalogue" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Catalogue"
        subtitle="Tous les produits de la plateforme."
      />
      <AdminCatalog />
    </>
  );
}
