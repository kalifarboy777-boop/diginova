import { AdminCommissions } from "@/components/admin/pages";
import { PageHeader } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/guard";

export const metadata = { title: "Commissions" };

export default async function Page() {
  await requireUser((u) => u.role === "ADMIN", "/admin");
  return (
    <>
      <PageHeader
        title="Commissions"
        subtitle="Plans des créateurs et commissions perçues."
      />
      <AdminCommissions />
    </>
  );
}
