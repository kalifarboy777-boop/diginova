import { AccountDashboard } from "@/components/account/dashboard";
import { PageHeader } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/guard";

export const metadata = { title: "Tableau de bord" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title={`Bonjour ${user.first_name}`} subtitle="Voici un aperçu de vos achats et téléchargements." search="/compte/bibliotheque" />
      <AccountDashboard />
    </>
  );
}
