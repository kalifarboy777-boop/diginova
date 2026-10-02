import { AdminCoupons } from "@/components/admin/pages";
import { PageHeader } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/guard";

export const metadata = { title: "Coupons" };

export default async function Page() {
  await requireUser((u) => u.role === "ADMIN", "/admin");
  return (
    <>
      <PageHeader
        title="Coupons"
        subtitle="Codes promo de la plateforme et des créateurs."
      />
      <AdminCoupons />
    </>
  );
}
