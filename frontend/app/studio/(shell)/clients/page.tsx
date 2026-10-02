import { PageHeader } from "@/components/layout/app-shell";
import { CustomersView } from "@/components/studio/extras";

export const metadata = { title: "Clients" };

export default function Page() {
  return (
    <>
      <PageHeader title="Clients" subtitle="Les acheteurs de vos produits." />
      <CustomersView />
    </>
  );
}
