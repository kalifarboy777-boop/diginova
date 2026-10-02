/**
 * Analytics minimal (désactivé par défaut : NEXT_PUBLIC_ANALYTICS=1 pour l'activer).
 * Événements : view_item, add_to_cart, begin_checkout, purchase. Branchez ici Plausible / GA4 / Matomo.
 */
type Event = "view_item" | "add_to_cart" | "begin_checkout" | "purchase";

export function track(event: Event, data: Record<string, unknown> = {}) {
  if (process.env.NEXT_PUBLIC_ANALYTICS !== "1" || typeof window === "undefined") return;
  const w = window as unknown as { dataLayer?: unknown[] };
  (w.dataLayer ??= []).push({ event, ...data });
}
