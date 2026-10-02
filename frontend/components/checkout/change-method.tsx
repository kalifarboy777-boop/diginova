"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PhoneInput, Field } from "@/components/ui/field";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { PAYMENT_METHODS, PaymentOption } from "@/components/ui/payment";
import { api, ApiError } from "@/lib/api";
import type { PaymentMethod } from "@/lib/types";

/** Relance le paiement d'une commande avec un autre moyen (écrans 22 et 24). */
export function ChangeMethodDialog({ orderId, current, phone, trigger }: { orderId: number; current: PaymentMethod | null; phone: string | null; trigger: React.ReactNode }) {
  const router = useRouter();
  const [method, setMethod] = React.useState<PaymentMethod>(current && current !== "CARD" ? (current === "WAVE" ? "ORANGE_MONEY" : "WAVE") : "WAVE");
  const [tel, setTel] = React.useState(phone ?? "+225");
  const [busy, setBusy] = React.useState(false);
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title="Changer de moyen de paiement" description="Votre commande est conservée ; une nouvelle demande sera envoyée." wide>
        <div className="flex flex-col gap-3">
          {PAYMENT_METHODS.map((pm) => (
            <PaymentOption key={pm.value} name="new-method" method={pm.value} checked={method === pm.value} onSelect={() => setMethod(pm.value)}>
              {pm.value !== "CARD" && (
                <Field label={`Numéro ${pm.label}`}>
                  <PhoneInput value={tel} onChange={setTel} />
                </Field>
              )}
            </PaymentOption>
          ))}
          <Button
            size="lg"
            block
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await api<{ redirect_url: string | null }>(`/orders/${orderId}/retry`, { method: "POST", body: { method, payment_phone: method !== "CARD" ? tel : undefined } });
                if (method === "CARD" && r.redirect_url) window.location.href = `${r.redirect_url}?retour=/checkout/${orderId}/attente`;
                else router.push(`/checkout/${orderId}/attente`);
                router.refresh();
              } catch (e) {
                toast.error(e instanceof ApiError ? e.message : "Impossible de relancer le paiement.");
                setBusy(false);
              }
            }}
          >
            Payer avec {PAYMENT_METHODS.find((x) => x.value === method)!.label}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
