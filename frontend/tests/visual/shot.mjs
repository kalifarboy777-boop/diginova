// Capture d'écran pour la comparaison visuelle avec le Figma.
// Usage : node tests/visual/shot.mjs <chemin> <sortie.png> [largeur] [cookie-de-session]
import { chromium } from "@playwright/test";

const [, , path = "/", out = "shot.png", width = "1440", cookie] = process.argv;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: Number(width), height: 900 }, deviceScaleFactor: 1 });
if (cookie) {
  const [name, value] = cookie.split("=");
  await ctx.addCookies([{ name, value, domain: "localhost", path: "/" }]);
}
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(`http://localhost:3000${path}`, { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(600);
await page.screenshot({ path: out, fullPage: true });
if (errors.length) console.log("ERREURS:", errors.slice(0, 5).join("\n"));
await browser.close();
