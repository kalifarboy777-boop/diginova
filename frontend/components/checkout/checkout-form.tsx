"use client";

import { Check, Info, Lock, Mail, Smartphone, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { StickyActionBar } from "@/components/layout/mobile-tab-bar";
import { ProductCover } from "@/components/product/product-cover";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, PhoneInput } from "@/components/ui/field";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { PAYMENT_METHODS, PaymentOption } from "@/components/ui/payment";
import { track } from "@/lib/analytics";
import { api, ApiError } from "@/lib/api";
import { fcfa, fcfaShort } from "@/lib/format";
import { useCart, useMe } from "@/lib/session";
import type { PaymentMethod } from "@/lib/types";
import { CouponBox, Reassurance, Totals } from "./summary";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function Section({ n, title, action, children }: { n: number; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-card border border-border-default bg-bg-surface p-5 md:p-7" aria-labelledby={`step-${n}`}>
      <div className="flex items-center gap-3">
        <span className="flex size-7 items-center justify-center rounded-full bg-brand-primary text-label-sm text-white">{n}</span>
        <h2 id={`step-${n}`} className="flex-1 text-h4 text-text-primary">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Écran 21 (desktop) et 62 (mobile) — coordonnées, moyen de paiement, paiement. */
export function CheckoutForm() {
  const router = useRouter();
  const { user } = useMe();
  const { data: cart, isLoading } = useCart();
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("+225");
  const [method, setMethod] = React.useState<PaymentMethod>("WAVE");
  const [payPhone, setPayPhone] = React.useState("");
  const [terms, setTerms] = React.useState(true);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      setEmail((e) => e || user.email);
      if (user.phone) setPhone((p) => (p === "+225" ? user.phone! : p));
    }
  }, [user]);
  React.useEffect(() => {
    if (cart?.count) track("begin_checkout", { value: cart.total, items: cart.count });
  }, [cart?.count, cart?.total]);

  const phoneOk = phone.replace(/\D/g, "").length >= 11;
  const emailOk = EMAIL_RE.test(email);
  const m = PAYMENT_METHODS.find((x) => x.value === method)!;
  const mobile = method !== "CARD";

  async function pay(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const r = await api<{ order_id: number; redirect_url: string | null; account_created: boolean }>("/checkout", {
        method: "POST",
        body: { email, phone, payment_phone: mobile ? payPhone || phone : undefined, method, accept_terms: terms },
      });
      if (method === "CARD" && r.redirect_url) window.location.href = `${r.redirect_url}?retour=/checkout/${r.order_id}/attente`;
      else router.push(`/checkout/${r.order_id}/attente`);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])));
        toast.error(Object.values(err.errors)[0]?.[0] ?? err.message);
      }
      setBusy(false);
    }
  }

  if (isLoading || !cart)
    return (
      <div className="grid gap-8 lg:grid-cols-[640px_1fr]">
        <Skeleton className="h-[640px] rounded-card" />
        <Skeleton className="h-[560px] rounded-card" />
      </div>
    );
  if (cart.count === 0)
    return (
      <div className="rounded-card border border-border-default bg-bg-surface">
        <EmptyState
          icon={<Lock />}
          title="Votre panier est vide"
          text="Ajoutez un produit pour passer commande."
          action={
            <Button asChild>
              <Link href="/boutique">Explorer la boutique</Link>
            </Button>
          }
        />
      </div>
    );

  return (
    <form onSubmit={pay} className="grid items-start gap-8 lg:grid-cols-[640px_1fr]" noValidate>
      <div className="flex flex-col gap-6">
        <h1 className="text-h2 md:text-h1">Finaliser ma commande</h1>
        <Section
          n={1}
          title="Vos coordonnées"
          action={
            !user && (
              <Link href="/connexion?suite=/checkout" className="text-label-sm text-brand-primary hover:underline">
                Déjà client ? Se connecter
              </Link>
            )
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="co-email" error={errors.email} help="Vos fichiers et votre facture seront envoyés ici.">
              <Input id="co-email" type="email" autoComplete="email" required icon={<Mail />} value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!errors.email} suffix={emailOk ? <Check className="size-[18px] text-success" /> : null} />
            </Field>
            <Field label="Téléphone" htmlFor="co-phone" error={errors.phone}>
              <PhoneInput id="co-phone" value={phone} onChange={setPhone} invalid={!!errors.phone} />
            </Field>
          </div>
          {!user && (
            <p className="flex items-center gap-3 rounded-md bg-brand-subtle px-4 py-3.5 text-body-sm text-brand-primary">
              <UserIcon className="size-[18px] shrink-0" />
              Un compte est créé automatiquement pour retrouver vos achats dans votre bibliothèque.
            </p>
          )}
        </Section>

        <Section n={2} title="Moyen de paiement">
          <div className="flex flex-col gap-3" role="radiogroup" aria-label="Moyen de paiement">
            {PAYMENT_METHODS.map((pm) => (
              <PaymentOption key={pm.value} method={pm.value} checked={method === pm.value} onSelect={() => setMethod(pm.value)}>
                {pm.value !== "CARD" ? (
                  <Field label={`Numéro ${pm.label}`} htmlFor="pay-phone" error={errors.payment_phone} help={`Une demande de paiement de ${fcfa(cart.total)} sera envoyée sur ce numéro.`}>
                    <PhoneInput id="pay-phone" value={payPhone || phone} onChange={setPayPhone} />
                  </Field>
                ) : (
                  <p className="text-body-sm text-text-secondary">Vous serez redirigé vers la page sécurisée 3-D Secure de notre prestataire. Aucune donnée bancaire n’est stockée par DigiNova.</p>
                )}
              </PaymentOption>
            ))}
          </div>
        </Section>

        <div className="flex flex-col gap-1">
          <Checkbox
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            label={
              <>
                J’accepte les{" "}
                <Link href="/cgv" className="underline">
                  CGV
                </Link>{" "}
                et la politique de remboursement. Les fichiers numériques sont livrés immédiatement après paiement.
              </>
            }
          />
          {errors.accept_terms && <p className="text-caption text-danger">{errors.accept_terms}</p>}
        </div>
        <Button type="submit" size="lg" block loading={busy} disabled={!terms} className="max-md:hidden">
          <Lock /> Payer {fcfa(cart.total)} avec {m.label}
        </Button>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
        <div className="flex flex-col gap-4 rounded-card border border-border-default bg-bg-surface p-7">
          <h2 className="text-h4">Récapitulatif</h2>
          <ul className="flex flex-col gap-3">
            {cart.items.map((l) => (
              <li key={l.id} className="flex items-center gap-3.5">
                <span className="h-[50px] w-[62px] shrink-0 overflow-hidden rounded-sm">
                  <ProductCover type={l.product?.cover_type ?? l.bundle!.cover_type} rounded={false} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-label text-text-primary">{(l.product?.title ?? l.bundle!.title).replace(" — modèle complet", "").replace("gestion de stock", "stock")}</span>
                  <span className="text-caption text-text-secondary">{l.bundle ? "Pack" : l.license === "COMMERCIAL" ? "Licence commerciale" : "Licence personnelle"}</span>
                </span>
                <span className="text-label whitespace-nowrap">{fcfaShort(l.price)}</span>
              </li>
            ))}
          </ul>
          <div className="h-px bg-border-default" />
          <CouponBox cart={cart} />
          <Totals cart={cart} />
          <Reassurance />
        </div>
        <p className="flex items-center gap-3 rounded-lg border border-border-default bg-bg-surface px-5 py-4 text-body-sm text-text-secondary">
          <Info className="size-[18px] shrink-0" /> Un souci de paiement ? Support WhatsApp 7j/7 : +225 07 00 00 00 00
        </p>
      </aside>

      <StickyActionBar>
        <div className="flex flex-col">
          <span className="text-caption text-text-tertiary">Total</span>
          <span className="text-price">{fcfa(cart.total)}</span>
        </div>
        <Button type="submit" size="lg" className="flex-1" loading={busy} disabled={!terms}>
          {mobile ? <Smartphone /> : <Lock />} Payer avec {m.label}
        </Button>
      </StickyActionBar>
    </form>
  );
}
