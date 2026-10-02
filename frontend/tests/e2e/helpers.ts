import { expect, type Page } from "@playwright/test";

/** Simule la réponse de l'opérateur via la page de développement du MockProvider. */
export async function operatorResponds(page: Page, action: "confirm" | "refuse" | "expire" | "bad_signature") {
  const link = page.getByRole("link", { name: /simuler la réponse de l’opérateur/i });
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  const ref = href!.split("/").pop()!;
  const res = await page.request.post(`/api/dev/mock-payments/${ref}`, { data: { action }, headers: { Accept: "application/json" } });
  expect(res.ok()).toBeTruthy();
}

export async function login(page: Page, email: string, password = "password") {
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/(compte|studio|admin)/);
}

export const uniqueEmail = (p = "client") => `${p}.${Date.now()}@exemple.ci`;

/** Appel d'API authentifié avec la session de la page (cookie Sanctum + jeton XSRF). */
export async function call(page: Page, method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", path: string, data?: unknown, multipart?: Record<string, string | { name: string; mimeType: string; buffer: Buffer }>) {
  await page.request.get("/sanctum/csrf-cookie");
  const xsrf = (await page.context().cookies()).find((c) => c.name === "XSRF-TOKEN")?.value ?? "";
  const res = await page.request.fetch(`/api${path}`, {
    method,
    headers: { Accept: "application/json", "X-XSRF-TOKEN": decodeURIComponent(xsrf), Referer: "http://localhost:3000/" },
    ...(multipart ? { multipart } : data !== undefined ? { data } : {}),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok()) throw new Error(`${method} ${path} → ${res.status()} ${JSON.stringify(body).slice(0, 300)}`);
  return body;
}

/** Dernier code SMS simulé (backend en développement). */
export async function lastSmsCode(page: Page, phone: string): Promise<string> {
  const r = await page.request.get(`/api/dev/sms/${phone.replace(/\D/g, "")}`);
  const m = ((await r.json()).message ?? "").match(/(\d{6})/);
  if (!m) throw new Error("Aucun SMS reçu");
  return m[1];
}

/** PNG 1×1 valide pour les aperçus et pièces d'identité de test. */
export const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
