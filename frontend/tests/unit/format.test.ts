import { describe, expect, it } from "vitest";
import { ago, date, discountPercent, fcfa, fcfaShort, fileSize, phone, rating, time } from "@/lib/format";

const NBSP = " ";

describe("montants FCFA", () => {
  it("formate en entiers avec espace insécable", () => {
    expect(fcfa(12000)).toBe(`12${NBSP}000${NBSP}FCFA`);
    expect(fcfa(1840000)).toBe(`1${NBSP}840${NBSP}000${NBSP}FCFA`);
    expect(fcfaShort(8000)).toBe(`8${NBSP}000${NBSP}F`);
    expect(fcfa(0)).toBe(`0${NBSP}FCFA`);
  });
  it("arrondit les valeurs non entières", () => {
    expect(fcfa(10199.6)).toBe(`10${NBSP}200${NBSP}FCFA`);
  });
  it("calcule la réduction affichée", () => {
    expect(discountPercent(12000, 18000)).toBe(33);
    expect(discountPercent(25000, 45000)).toBe(44);
    expect(discountPercent(5000, null)).toBeNull();
  });
});

describe("dates (fuseau Africa/Abidjan)", () => {
  it("affiche « 1 oct. 2026 » et l'heure locale", () => {
    expect(date("2026-10-01T10:12:00Z")).toBe("1 oct. 2026");
    expect(time("2026-10-01T14:02:00Z")).toBe("14:02");
  });
  it("exprime l'ancienneté en français", () => {
    const now = new Date("2026-10-01T12:00:00Z");
    expect(ago("2026-10-01T11:48:00Z", now)).toBe("il y a 12 min");
    expect(ago("2026-09-28T12:00:00Z", now)).toBe("il y a 3 jours");
    expect(ago("2026-09-17T12:00:00Z", now)).toBe("il y a 2 semaines");
  });
});

describe("divers", () => {
  it("note avec virgule, tailles de fichier et téléphone ivoirien", () => {
    expect(rating(4.9)).toBe("4,9");
    expect(fileSize(4404019)).toBe("4,2 Mo");
    expect(phone("+2250708421855")).toBe("+225 07 08 42 18 55");
  });
});
