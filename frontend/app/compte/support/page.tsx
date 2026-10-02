import { Plus } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { SupportView } from "@/components/account/tickets";
import { PageHeader } from "@/components/layout/app-shell";

export const metadata = { title: "Support" };

export default function SupportPage() {
  return (
    <>
      <PageHeader
        title="Support"
        subtitle="Suivez vos demandes et échangez avec notre équipe."
        actions={
          <Button asChild>
            <Link href="/compte/support?nouveau=1" scroll={false}>
              <Plus /> Nouveau ticket
            </Link>
          </Button>
        }
      />
      <React.Suspense>
        <SupportView />
      </React.Suspense>
    </>
  );
}
