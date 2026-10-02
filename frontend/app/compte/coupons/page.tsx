"use client";

import { useQuery } from "@tanstack/react-query";
import { Copy, Tag } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { api } from "@/lib/api";
import { date, fcfa } from "@/lib/format";

type Coupon = { code: string; label: string; scope: string; min_amount: number; expires_at: string | null };

export default function CouponsPage() {
  const { data } = useQuery({ queryKey: ["coupons"], queryFn: () => api<{ data: Coupon[] }>("/account/coupons") });
  return (
    <>
      <PageHeader title="Mes coupons" subtitle="Codes promo à saisir dans votre panier." />
      {!data ? (
        <Skeleton className="h-40 rounded-card" />
      ) : data.data.length === 0 ? (
        <div className="rounded-card border border-border-default bg-bg-surface">
          <EmptyState icon={<Tag />} title="Aucun coupon disponible" text="Inscrivez-vous à la newsletter pour recevoir des codes promo." />
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {data.data.map((c) => (
            <div key={c.code} className="flex items-center gap-4 rounded-card border-2 border-dashed border-border-strong bg-bg-surface p-6">
              <span className="flex size-12 items-center justify-center rounded-md bg-brand-subtle text-brand-primary">
                <Tag className="size-5" />
              </span>
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-h4 text-brand-primary">{c.code}</span>
                <span className="text-body-sm text-text-secondary">
                  {c.label}
                  {c.min_amount > 0 && ` · dès ${fcfa(c.min_amount)}`}
                </span>
                {c.expires_at && <span className="text-caption text-warning">Expire le {date(c.expires_at)}</span>}
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(c.code).then(() => toast.success("Code copié"))}>
                  <Copy /> Copier
                </Button>
                <Button asChild size="sm">
                  <Link href={c.scope === "PACKS" ? "/packs" : "/boutique"}>Utiliser</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
