import { Plus } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { PageHeader } from "@/components/layout/app-shell";
import { StudioProducts } from "@/components/studio/products";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Mes produits" };

export default function StudioProductsPage() {
  return (
    <>
      <PageHeader
        title="Mes produits"
        actions={
          <Button asChild>
            <Link href="/studio/produits/nouveau">
              <Plus /> Ajouter un produit
            </Link>
          </Button>
        }
      />
      <React.Suspense>
        <StudioProducts />
      </React.Suspense>
    </>
  );
}
