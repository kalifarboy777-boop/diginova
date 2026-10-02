import { OrdersView } from "@/components/account/orders";
import { PageHeader } from "@/components/layout/app-shell";

export const metadata = { title: "Commandes & factures" };

export default function OrdersPage() {
  return (
    <>
      <PageHeader title="Commandes & factures" subtitle="Historique complet de vos achats et factures téléchargeables." />
      <OrdersView />
    </>
  );
}
