import { AdminCategories } from "@/components/admin/pages";
import { PageHeader } from "@/components/layout/app-shell";

export const metadata = { title: "Catégories" };

export default function Page() {
  return (
    <>
      <PageHeader title="Catégories" subtitle="Arborescence de la boutique." />
      <AdminCategories />
    </>
  );
}
