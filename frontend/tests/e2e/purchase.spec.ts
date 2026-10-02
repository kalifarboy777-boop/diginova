import { expect, test } from "@playwright/test";
import { operatorResponds, uniqueEmail } from "./helpers";

test("visiteur → achat Wave simulé → téléchargement → compte créé", async ({ page }) => {
  await page.goto("/produit/business-plan-pro");
  await expect(page.getByRole("heading", { level: 1, name: /Business Plan Pro/ })).toBeVisible();
  await page.getByRole("button", { name: "Ajouter au panier" }).first().click();
  await expect(page.getByText("Ajouté au panier")).toBeVisible();

  await page.goto("/panier");
  await expect(page.getByRole("heading", { name: "Votre panier" })).toBeVisible();
  await page.getByPlaceholder("Code promo").fill("LANCEMENT");
  await page.getByRole("button", { name: "Appliquer" }).click();
  await expect(page.getByText("LANCEMENT appliqué", { exact: true })).toBeVisible();
  await expect(page.getByText("10 800 FCFA").first()).toBeVisible();
  await page.getByRole("link", { name: /Passer au paiement/ }).click();

  await expect(page.getByRole("heading", { name: "Finaliser ma commande" })).toBeVisible();
  await page.locator("#co-email").fill(uniqueEmail());
  await page.locator("#co-phone").fill("0701020304");
  await page.getByRole("button", { name: /Payer 10 800 FCFA avec Wave/ }).click();

  await page.waitForURL(/\/attente$/);
  await expect(page.getByRole("heading", { name: "Validez le paiement sur votre téléphone" })).toBeVisible();
  await operatorResponds(page, "confirm");

  await page.waitForURL(/\/succes$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: /Paiement confirmé/ })).toBeVisible();
  await expect(page.getByText("Votre compte a été créé")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger" }).first().click();
  expect((await download).suggestedFilename()).toContain("business-plan-pro");
});

test("échec de paiement → panier conservé → nouvel essai réussi", async ({ page }) => {
  await page.goto("/produit/kit-cv-lettre-motivation");
  await page.getByRole("button", { name: "Acheter maintenant" }).click();
  await page.waitForURL(/\/checkout$/);
  await page.locator("#co-email").fill(uniqueEmail("echec"));
  await page.locator("#co-phone").fill("0701020305");
  await page.getByRole("button", { name: /Payer .* avec Wave/ }).click();
  await page.waitForURL(/\/attente$/);
  await operatorResponds(page, "refuse");

  await page.waitForURL(/\/echec$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Le paiement n’a pas abouti" })).toBeVisible();
  await expect(page.getByText("Votre panier est conservé.")).toBeVisible();

  await page.getByRole("button", { name: /Réessayer avec Wave/ }).click();
  await page.waitForURL(/\/attente$/);
  await operatorResponds(page, "confirm");
  await page.waitForURL(/\/succes$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: /Paiement confirmé/ })).toBeVisible();
});

test("une signature de webhook invalide ne livre rien", async ({ page }) => {
  await page.goto("/produit/pack-30-templates-instagram");
  await page.getByRole("button", { name: "Acheter maintenant" }).click();
  await page.locator("#co-email").fill(uniqueEmail("fraude"));
  await page.locator("#co-phone").fill("0701020306");
  await page.getByRole("button", { name: /Payer .* avec Wave/ }).click();
  await page.waitForURL(/\/attente$/);
  await operatorResponds(page, "bad_signature");
  await expect(page.getByRole("heading", { name: "Paiement en cours de vérification" })).toBeVisible({ timeout: 20_000 });
});
