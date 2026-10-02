import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { PaymentChips } from "@/components/ui/payment";
import Link from "next/link";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <CheckoutHeader />
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-border-default bg-bg-surface">
        <div className="container-site flex flex-col items-start justify-between gap-4 py-7 pb-28 md:flex-row md:items-center md:pb-7">
          <p className="text-body-sm text-text-tertiary">
            © 2026 DigiNova · <Link href="/cgv">CGV</Link> · <Link href="/aide/categorie/remboursements">Remboursements</Link> · Aide : support@diginova.ci
          </p>
          <PaymentChips />
        </div>
      </footer>
    </div>
  );
}
