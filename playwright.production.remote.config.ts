/**
 * Playwright config for full production E2E:
 *   Render host + Render controller + live Colyseus Cloud backend.
 *
 *   npx playwright test --config playwright.production.remote.config.ts
 *
 * Override defaults:
 *   FLIMFLAM_E2E_HOST_URL=https://...
 *   FLIMFLAM_E2E_CONTROLLER_URL=https://...
 *   FLIMFLAM_E2E_COLYSEUS_HEALTH_URL=https://.../health
 */
import { defineConfig, devices } from "@playwright/test";

const DEFAULT_HOST_URL = "https://flimflam.gg";
const DEFAULT_CONTROLLER_URL = "https://play.flimflam.gg";
const DEFAULT_COLYSEUS_HEALTH_URL = "https://us-dfw-baad7ee4.colyseus.cloud/health";

const e2eHostUrl = process.env.FLIMFLAM_E2E_HOST_URL ?? DEFAULT_HOST_URL;
const e2eControllerUrl = process.env.FLIMFLAM_E2E_CONTROLLER_URL ?? DEFAULT_CONTROLLER_URL;
const colyseusHealthUrl =
  process.env.FLIMFLAM_E2E_COLYSEUS_HEALTH_URL ?? DEFAULT_COLYSEUS_HEALTH_URL;

// Make URLs visible to test specs (they read process.env at module load).
process.env.FLIMFLAM_E2E_HOST_URL = e2eHostUrl;
process.env.FLIMFLAM_E2E_CONTROLLER_URL = e2eControllerUrl;
process.env.FLIMFLAM_E2E_COLYSEUS_HEALTH_URL = colyseusHealthUrl;

export default defineConfig({
  testDir: "./tests/e2e",
  // Production timers can be much longer than local E2E.
  timeout: 600_000,
  expect: { timeout: 60_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report-production-remote" }],
  ],
  globalSetup: "./tests/e2e/global-setup-production-remote.ts",
  use: {
    baseURL: e2eHostUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
