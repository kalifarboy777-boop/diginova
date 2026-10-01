const TZ = "Africa/Abidjan";

const intl = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
/** Séparateur de milliers : espace insécable classique (l'espace fine U+202F n'a pas de chasse dans Inter). */
const nf = { format: (n: number) => intl.format(n).replace(/[\u202f\u00a0]/g, "\u00a0") };

/** 12000 → « 12 000 FCFA » (espace fine insécable, montants entiers XOF). */
export function fcfa(amount: number | null | undefined): string {
  return `${nf.format(Math.round(amount ?? 0))} FCFA`;
}

/** Format dense des tableaux : « 12 000 F ». */
export function fcfaShort(amount: number | null | undefined): string {
  return `${nf.format(Math.round(amount ?? 0))} F`;
}

/** Nombre seul : « 12 000 ». */
export function num(n: number | null | undefined): string {
  return nf.format(Math.round(n ?? 0));
}

/** Note : 4.9 → « 4,9 ». */
export function rating(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Grand nombre compact : 3100 → « 3,1 k ». */
export function compact(n: number): string {
  if (n < 1000) return nf.format(n);
  return `${(n / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k`;
}

/** « 1 oct. 2026 » */
export function date(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: TZ }).format(new Date(iso));
}

/** « 1 oct. » */
export function dayMonth(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: TZ }).format(new Date(iso));
}

/** « 14:02 » */
export function time(iso: string | Date | null | undefined, seconds = false): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    ...(seconds ? { second: "2-digit" } : {}),
    timeZone: TZ,
  }).format(new Date(iso));
}

/** « il y a 3 jours », « il y a 12 min », « maintenant » */
export function ago(iso: string | Date | null | undefined, now: Date = new Date()): string {
  if (!iso) return "";
  const s = Math.round((now.getTime() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "maintenant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `il y a ${d} jour${d > 1 ? "s" : ""}`;
  const w = Math.round(d / 7);
  if (d < 31) return `il y a ${w} semaine${w > 1 ? "s" : ""}`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `il y a ${mo} mois`;
  return `il y a ${Math.round(mo / 12)} an${mo >= 24 ? "s" : ""}`;
}

/** Taille de fichier : 4404019 → « 4,2 Mo ». */
export function fileSize(bytes: number | null | undefined): string {
  const b = bytes ?? 0;
  if (b < 1024) return `${b} o`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} Ko`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
  return `${(b / 1024 / 1024 / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Go`;
}

/** Pourcentage de réduction : (12000, 18000) → 33 */
export function discountPercent(price: number, compareAt?: number | null): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round((1 - price / compareAt) * 100);
}

/** Formate un numéro ivoirien : +2250708421855 → « +225 07 08 42 18 55 ». */
export function phone(p: string | null | undefined): string {
  if (!p) return "";
  const d = p.replace(/\D/g, "");
  const local = d.slice(-10);
  const cc = d.slice(0, d.length - 10);
  return `${cc ? `+${cc} ` : ""}${local.replace(/(\d{2})(?=\d)/g, "$1 ")}`.trim();
}

export function plural(n: number, one: string, many?: string): string {
  return `${num(n)} ${n > 1 ? (many ?? `${one}s`) : one}`;
}
