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
