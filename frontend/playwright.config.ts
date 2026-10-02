import { defineConfig, devices } from "@playwright/test";

/**
 * Tests e2e : le backend Laravel (port 8000, base seedée) et le frontend (port 3000) doivent tourner.
 *   cd backend && php artisan migrate:fresh --seed && php artisan serve
 *   cd frontend && pnpm dev
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", trace: "retain-on-failure", locale: "fr-FR", timezoneId: "Africa/Abidjan" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
});
