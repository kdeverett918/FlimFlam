/**
 * Playwright config for running E2E tests against the live Colyseus Cloud server.
 *
 * Next.js host/controller run locally; all WebSocket traffic goes to production.
 *
 *   npx playwright test --config playwright.production.config.ts
 */
import { defineConfig, devices } from "@playwright/test";

const PRODUCTION_COLYSEUS_WS = "wss://us-dfw-baad7ee4.colyseus.cloud";
const PRODUCTION_COLYSEUS_HTTP = "https://us-dfw-baad7ee4.colyseus.cloud";

const e2eHostPort = process.env.PARTYLINE_E2E_HOST_PORT ?? "3302";
const e2eControllerPort = process.env.PARTYLINE_E2E_CONTROLLER_PORT ?? "3303";

const e2eHostUrl = `http://127.0.0.1:${e2eHostPort}`;
const e2eControllerUrl = `http://127.0.0.1:${e2eControllerPort}`;

// Make the production health URL visible to test specs (they read process.env at module load).
process.env.PARTYLINE_E2E_HOST_URL = e2eHostUrl;
process.env.PARTYLINE_E2E_CONTROLLER_URL = e2eControllerUrl;
process.env.PARTYLINE_E2E_COLYSEUS_HEALTH_URL = `${PRODUCTION_COLYSEUS_HTTP}/health`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-production" }]],
  use: {
    baseURL: e2eHostUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    // Rebuild Next.js apps baked with the production Colyseus URL, then start only
    // host + controller (PARTYLINE_E2E_SKIP_SERVER=1 skips the local Colyseus process).
    command: "pnpm build:all && node scripts/e2e-webserver.mjs",
    url: e2eHostUrl,
    timeout: 480_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      NODE_ENV: "production",
      // Bake production Colyseus URL into the Next.js bundle at build time.
      NEXT_PUBLIC_COLYSEUS_URL: PRODUCTION_COLYSEUS_WS,
      NEXT_PUBLIC_HOST_URL: e2eHostUrl,
      NEXT_PUBLIC_CONTROLLER_URL: e2eControllerUrl,
      PARTYLINE_E2E_HOST_PORT: e2eHostPort,
      PARTYLINE_E2E_CONTROLLER_PORT: e2eControllerPort,
      PARTYLINE_E2E_HOST_URL: e2eHostUrl,
      PARTYLINE_E2E_CONTROLLER_URL: e2eControllerUrl,
      // Skip spawning a local Colyseus server; tests connect to production instead.
      PARTYLINE_E2E_SKIP_SERVER: "1",
      // Point the in-test health poll at the production server.
      PARTYLINE_E2E_COLYSEUS_HEALTH_URL: `${PRODUCTION_COLYSEUS_HTTP}/health`,
      PARTYLINE_TIMER_SCALE: process.env.PARTYLINE_TIMER_SCALE ?? "0.2",
      PARTYLINE_DISABLE_AI: process.env.PARTYLINE_DISABLE_AI ?? "1",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
