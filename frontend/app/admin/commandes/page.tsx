import * as React from "react";
import { AdminOrders } from "@/components/admin/orders";
import { PageHeader } from "@/components/layout/app-shell";

export const metadata = { title: "Commandes" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Commandes"
        subtitle="Toutes les commandes de la plateforme."
      />
      <React.Suspense>
        <AdminOrders />
      </React.Suspense>
    </>
  );
}
