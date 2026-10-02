import { PageHeader } from "@/components/layout/app-shell";
import { SalesView } from "@/components/studio/extras";

export const metadata = { title: "Ventes" };

export default function Page() {
  return (
    <>
      <PageHeader title="Ventes" subtitle="Toutes vos ventes confirmées, commission déduite." />
      <SalesView />
    </>
  );
}
