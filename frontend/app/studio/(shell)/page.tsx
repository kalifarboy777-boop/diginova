import { Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/app-shell";
import { StudioDashboard } from "@/components/studio/dashboard";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/guard";

export const metadata = { title: "Tableau de bord" };

export default async function StudioPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader
        title={`Bonjour ${user.first_name}`}
        actions={
          <Button asChild>
            <Link href="/studio/produits/nouveau">
              <Plus /> Ajouter un produit
            </Link>
          </Button>
        }
      />
      <StudioDashboard />
    </>
  );
}
