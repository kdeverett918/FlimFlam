import { defineConfig, devices } from "@playwright/test";

const e2eHostPort = process.env.FLIMFLAM_E2E_HOST_PORT ?? "3300";
const e2eControllerPort = process.env.FLIMFLAM_E2E_CONTROLLER_PORT ?? "3301";
const e2eColyseusPort = process.env.FLIMFLAM_E2E_COLYSEUS_PORT ?? "3567";

const e2eHostUrl = process.env.FLIMFLAM_E2E_HOST_URL ?? `http://127.0.0.1:${e2eHostPort}`;
const e2eControllerUrl =
  process.env.FLIMFLAM_E2E_CONTROLLER_URL ?? `http://127.0.0.1:${e2eControllerPort}`;
const e2eColyseusWsUrl =
  process.env.NEXT_PUBLIC_COLYSEUS_URL ?? `ws://127.0.0.1:${e2eColyseusPort}`;
const e2eColyseusHealthUrl =
  process.env.FLIMFLAM_E2E_COLYSEUS_HEALTH_URL ?? `http://127.0.0.1:${e2eColyseusPort}/health`;

process.env.FLIMFLAM_E2E_HOST_URL = e2eHostUrl;
process.env.FLIMFLAM_E2E_CONTROLLER_URL = e2eControllerUrl;
process.env.FLIMFLAM_E2E_COLYSEUS_HEALTH_URL = e2eColyseusHealthUrl;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  expect: {
    timeout: 20_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: e2eHostUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "pnpm build:all && node scripts/e2e-webserver.mjs",
    url: e2eHostUrl,
    timeout: 360_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      NODE_ENV: "production",
      FLIMFLAM_E2E: "1",
      PORT: e2eColyseusPort,
      NEXT_PUBLIC_COLYSEUS_URL: e2eColyseusWsUrl,
      NEXT_PUBLIC_HOST_URL: process.env.NEXT_PUBLIC_HOST_URL ?? e2eHostUrl,
      NEXT_PUBLIC_CONTROLLER_URL: process.env.NEXT_PUBLIC_CONTROLLER_URL ?? e2eControllerUrl,
      FLIMFLAM_E2E_COLYSEUS_HEALTH_URL: e2eColyseusHealthUrl,
      FLIMFLAM_E2E_HOST_PORT: e2eHostPort,
      FLIMFLAM_E2E_CONTROLLER_PORT: e2eControllerPort,
      FLIMFLAM_E2E_HOST_URL: e2eHostUrl,
      FLIMFLAM_E2E_CONTROLLER_URL: e2eControllerUrl,
      // CI can be slow enough that ultra-aggressive timers race UI rendering.
      FLIMFLAM_TIMER_SCALE: process.env.FLIMFLAM_TIMER_SCALE ?? "0.12",
      FLIMFLAM_DISABLE_AI: process.env.FLIMFLAM_DISABLE_AI ?? "1",
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
