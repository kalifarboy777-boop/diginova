import { PageHeader } from "@/components/layout/app-shell";
import { StudioCouponsView } from "@/components/studio/extras";

export const metadata = { title: "Coupons" };

export default function Page() {
  return (
    <>
      <PageHeader title="Coupons" subtitle="Codes promo sur vos produits." />
      <StudioCouponsView />
    </>
  );
}
