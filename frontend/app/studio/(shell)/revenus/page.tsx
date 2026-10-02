import { PageHeader } from "@/components/layout/app-shell";
import { Earnings, ExportStatement } from "@/components/studio/earnings";

export const metadata = { title: "Revenus & retraits" };

export default function EarningsPage() {
  return (
    <>
      <PageHeader title="Revenus & retraits" subtitle="Retraits vers Mobile Money ou banque, versés sous 48 h ouvrées." actions={<ExportStatement />} />
      <Earnings />
    </>
  );
}
