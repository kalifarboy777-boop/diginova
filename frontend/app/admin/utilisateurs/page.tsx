import { AdminUsers } from "@/components/admin/pages";
import { PageHeader } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/guard";

export const metadata = { title: "Utilisateurs" };

export default async function Page() {
  const user = await requireUser();
  return (
    <>
      <PageHeader
        title="Utilisateurs"
        subtitle="Clients, créateurs et équipe."
      />
      <AdminUsers isAdmin={user.role === "ADMIN"} />
    </>
  );
}
