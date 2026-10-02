import { AdminTickets } from "@/components/admin/pages";
import { PageHeader } from "@/components/layout/app-shell";

export const metadata = { title: "Tickets support" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Tickets support"
        subtitle="Répondez aux demandes des clients."
      />
      <AdminTickets />
    </>
  );
}
