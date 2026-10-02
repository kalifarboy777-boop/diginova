import { PageHeader } from "@/components/layout/app-shell";
import { StatsView } from "@/components/studio/extras";

export const metadata = { title: "Statistiques" };

export default function Page() {
  return (
    <>
      <PageHeader title="Statistiques" subtitle="Vues, ventes, conversion et avis." />
      <StatsView />
    </>
  );
}
