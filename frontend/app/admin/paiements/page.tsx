import * as React from "react";
import { AdminOrders } from "@/components/admin/orders";
import { PageHeader } from "@/components/layout/app-shell";

export const metadata = { title: "Commandes & paiements" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Commandes & paiements"
        subtitle="Chaque commande n’est payée qu’après webhook signé et contre-vérification API."
      />
      <React.Suspense>
        <AdminOrders />
      </React.Suspense>
    </>
  );
}
