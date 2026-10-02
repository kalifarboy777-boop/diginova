import { expect, test } from "@playwright/test";
import { call, lastSmsCode, login, operatorResponds, PNG, uniqueEmail } from "./helpers";

test("candidature créateur → validation admin → publication → vente", async ({ browser, page }) => {
  test.setTimeout(180_000);
  const email = uniqueEmail("createur");
  const phone = `+22501${String(Date.now()).slice(-8)}`;

  // 1. Inscription « Je veux vendre » + vérification du numéro par code SMS.
  await page.goto("/inscription");
  await page.getByRole("radio", { name: /Je veux vendre/ }).click();
  await page.locator("#name").fill("Awa Test Studio");
  await page.locator("#email").fill(email);
  await page.locator("#phone").fill(phone.slice(4));
  await page.locator("#password").fill("Secret123!");
  await page.getByText("J’accepte les").click();
  await page.getByRole("button", { name: /Créer mon compte/ }).click();
  await page.waitForURL(/\/verification/);
  const code = await lastSmsCode(page, phone);
  for (const [i, d] of [...code].entries()) await page.getByLabel(`Chiffre ${i + 1}`).fill(d);
  await page.waitForURL(/\/studio\/candidature/);

  // 2. Candidature en 4 étapes (champs saisis dans l'interface, fichiers envoyés via l'API).
  await expect(page.getByRole("heading", { name: "Créez votre profil de créateur" })).toBeVisible();
  await page.getByPlaceholder("Abidjan").fill("Abidjan");
  await page.getByRole("button", { name: /Continuer/ }).click();
  await expect(page.getByRole("heading", { name: "Parlez-nous de votre activité" })).toBeVisible();
  await page.getByPlaceholder(/Votre parcours/).fill("Designer graphique depuis 6 ans, je crée des templates Canva pour les commerçants d’Abidjan.");
  await page.getByRole("button", { name: "Design" }).click();
  for (const n of [1, 2]) await call(page, "POST", "/studio/application/files", undefined, { kind: "sample", file: { name: `exemple-${n}.png`, mimeType: "image/png", buffer: PNG } });
  await page.getByRole("button", { name: /Continuer/ }).click();
  await expect(page.getByRole("heading", { name: "Comment voulez-vous être payé ?" })).toBeVisible();
  await page.getByRole("button", { name: /Continuer/ }).click();
  await expect(page.getByRole("heading", { name: "Vérifiez votre identité" })).toBeVisible();
  await call(page, "POST", "/studio/application/files", undefined, { kind: "id", file: { name: "cni.png", mimeType: "image/png", buffer: PNG } });
  await page.reload();
  await page.getByRole("button", { name: /Envoyer ma candidature/ }).click();
  await expect(page.getByRole("heading", { name: "Candidature envoyée" })).toBeVisible();

  // 3. L'administrateur vérifie la pièce d'identité puis approuve.
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await login(admin, "admin@diginova.ci");
  const apps = await call(admin, "GET", "/admin/creators?tab=applications");
  const app = apps.data.find((a: { studio_name: string }) => a.studio_name === "Awa Test Studio");
  await expect(call(admin, "POST", `/admin/applications/${app.id}/decision`, { decision: "approve" })).rejects.toThrow(/422/);
  await call(admin, "POST", `/admin/applications/${app.id}/identity`, { id_status: "VERIFIED" });
  await call(admin, "POST", `/admin/applications/${app.id}/decision`, { decision: "approve" });

  // 4. Le créateur publie un produit (éditeur) et le soumet à la modération.
  await page.goto("/studio/produits/nouveau");
  await page.locator("#pt").fill("Pack Canva boutique de mode — 20 visuels");
  await page.waitForURL(/\/modifier$/, { timeout: 20_000 });
  const id = Number(page.url().match(/produits\/(\d+)/)![1]);
  await call(page, "PATCH", `/studio/products/${id}`, {
    description: "Vingt visuels Canva prêts à personnaliser pour annoncer vos nouveautés, promotions et arrivages sur Instagram et WhatsApp. Polices libres de droits, couleurs modifiables en un clic, guide inclus.",
    price: 5000,
    commercial_enabled: true,
    rights_confirmed: true,
  });
  await call(page, "POST", `/studio/products/${id}/files`, undefined, { file: { name: "pack-canva.zip", mimeType: "application/zip", buffer: Buffer.from("PK\u0005\u0006" + "\u0000".repeat(18)) } });
  for (const n of [1, 2, 3]) await call(page, "POST", `/studio/products/${id}/images`, undefined, { image: { name: `apercu-${n}.png`, mimeType: "image/png", buffer: PNG } });
  await page.waitForTimeout(5_000); // analyse antivirus simulée
  await page.reload();
  await expect(page.getByText("Analyse antivirus OK")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Soumettre à la modération" }).click();
  await page.waitForURL(/\/studio\/produits$/);

  // 5. Modération : refus sans message impossible, puis approbation.
  await expect(call(admin, "POST", `/admin/moderation/${id}/decision`, { decision: "reject" })).rejects.toThrow(/422/);
  await call(admin, "POST", `/admin/moderation/${id}/decision`, { decision: "approve" });

  // 6. Un visiteur achète le produit, le créateur voit la vente en période de garantie.
  const buyerCtx = await browser.newContext();
  const buyer = await buyerCtx.newPage();
  const product = await call(buyer, "GET", `/studio/products/${id}`).catch(() => null);
  expect(product).toBeNull(); // un visiteur n'accède pas au studio
  const slug = (await call(page, "GET", `/studio/products/${id}`)).slug;
  await buyer.goto(`/produit/${slug}`);
  await buyer.getByRole("button", { name: "Acheter maintenant" }).click();
  await buyer.locator("#co-email").fill(uniqueEmail("acheteur"));
  await buyer.locator("#co-phone").fill("0701020309");
  await buyer.getByRole("button", { name: /Payer .* avec Wave/ }).click();
  await buyer.waitForURL(/\/attente$/);
  await operatorResponds(buyer, "confirm");
  await buyer.waitForURL(/\/succes$/, { timeout: 20_000 });

  const earnings = await call(page, "GET", "/studio/earnings");
  expect(earnings.balance.pending).toBe(4250); // 5 000 − 15 % de commission, disponible après 7 jours
  await adminCtx.close();
  await buyerCtx.close();
});

test("retrait créateur confirmé par code SMS", async ({ page }) => {
  await login(page, "jean.kouassi@exemple.ci");
  await page.goto("/studio/revenus");
  await expect(page.getByRole("heading", { name: "Demander un retrait" })).toBeVisible();
  const amount = page.getByRole("textbox").first();
  await amount.fill("10000");
  await page.getByRole("button", { name: "Confirmer le retrait" }).click();
  await expect(page.getByRole("heading", { name: "Confirmez le retrait" })).toBeVisible();
  const code = await lastSmsCode(page, "+2250708421800");
  for (const [i, d] of [...code].entries()) await page.getByLabel(`Chiffre ${i + 1}`).fill(d);
  await expect(page.getByText(/Retrait PO-\d{4}-\d{4} demandé/)).toBeVisible({ timeout: 15_000 });
});
