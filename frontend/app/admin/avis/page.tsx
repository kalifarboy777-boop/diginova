import { AdminReviews } from "@/components/admin/pages";
import { PageHeader } from "@/components/layout/app-shell";

export const metadata = { title: "Avis & signalements" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Avis & signalements"
        subtitle="Modération des avis et des signalements."
      />
      <AdminReviews />
    </>
  );
}
