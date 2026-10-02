import { AdminDashboard } from "@/components/admin/dashboard";
import { PageHeader } from "@/components/layout/app-shell";

export const metadata = { title: "Pilotage" };

export default function AdminPage() {
  return (
    <>
      <PageHeader title="Pilotage" search="/admin/paiements" />
      <AdminDashboard />
    </>
  );
}
