import { chromium } from "@playwright/test";
const [S, email, ...paths] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto("http://localhost:3000/connexion");
await p.fill("#email", email);
await p.fill("#password", "password");
await p.click("button[type=submit]");
await p.waitForURL(/\/(compte|studio|admin)/);
for (const path of paths) {
  await p.goto(`http://localhost:3000${path}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${S}/${path.replace(/\//g, "_")}.png` });
}
console.log("errors:", errs.slice(0, 5));
await b.close();
