import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const E2E_RUNTIME = process.env.FLIMFLAM_E2E_RUNTIME ?? "development";
const E2E_SKIP_BUILD =
  process.env.FLIMFLAM_E2E_SKIP_BUILD ?? (E2E_RUNTIME === "production" ? "0" : "1");

function parseAddressPort(address: string): number | null {
  const match = address.match(/[:.](\d+)\]?$/);
  if (!match?.[1]) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePort(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 65_535 ? parsed : null;
}

function isPortBusy(port: number): boolean {
  try {
    const netstatCmd = process.platform === "win32" ? "netstat -ano" : "netstat -an";
    const output = execSync(netstatCmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });

    if (process.platform === "win32") {
      for (const rawLine of output.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line.startsWith("TCP")) continue;
        const columns = line.split(/\s+/);
        if (columns.length < 5) continue;

        const localAddress = columns[1] ?? "";
        const state = columns[3] ?? "";
        const localPort = parseAddressPort(localAddress);
        if (localPort === port && /^(LISTENING|LISTEN)$/i.test(state)) {
          return true;
        }
      }
      return false;
    }

    const escapedPort = String(port).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const listeningPattern = new RegExp(`[:.]${escapedPort}\\b.*\\bLISTEN\\b`, "i");
    return listeningPattern.test(output);
  } catch {
    return false;
  }
}

function resolvePortPair(): { appPort: number; colyseusPort: number } {
  const explicitApp = parsePort(process.env.FLIMFLAM_E2E_HOST_PORT);
  const explicitColyseus = parsePort(process.env.FLIMFLAM_E2E_COLYSEUS_PORT);

  if (explicitApp && explicitColyseus) {
    return {
      appPort: explicitApp,
      colyseusPort: explicitColyseus,
    };
  }

  const pidOffset = Math.abs(process.pid % 20) * 20;
  const appCandidates = [
    5310 + pidOffset,
    5410 + pidOffset,
    5510 + pidOffset,
    5610 + pidOffset,
    5710 + pidOffset,
    5810 + pidOffset,
    5910 + pidOffset,
  ];

  for (const appCandidate of appCandidates) {
    const colyseusCandidate = appCandidate + 257;
    if (!isPortBusy(appCandidate) && !isPortBusy(colyseusCandidate)) {
      return {
        appPort: appCandidate,
        colyseusPort: colyseusCandidate,
      };
    }
  }

  return { appPort: 5310, colyseusPort: 5567 };
}

const { appPort, colyseusPort } = resolvePortPair();
if (!Number.isFinite(appPort) || !Number.isFinite(colyseusPort)) {
  throw new Error("Failed to resolve valid E2E ports for Playwright");
}
const e2eAppPort = String(appPort);
const e2eColyseusPort = String(colyseusPort);

const e2eAppUrl = `http://127.0.0.1:${e2eAppPort}`;
const e2eColyseusWsUrl = `ws://127.0.0.1:${e2eColyseusPort}`;
const e2eColyseusHealthUrl = `http://127.0.0.1:${e2eColyseusPort}/health`;
const e2eAppDistDir = ".next-e2e-host";

const e2eArtifactsDir = path.join(process.cwd(), ".tmp", "playwright-artifacts");
const e2eReportDir = path.join(process.cwd(), ".tmp", "playwright-report");
fs.mkdirSync(e2eArtifactsDir, { recursive: true });
fs.mkdirSync(e2eReportDir, { recursive: true });

process.env.FLIMFLAM_E2E_HOST_URL = e2eAppUrl;
process.env.FLIMFLAM_E2E_COLYSEUS_HEALTH_URL = e2eColyseusHealthUrl;
process.env.FLIMFLAM_E2E_HOST_PORT = e2eAppPort;
process.env.FLIMFLAM_E2E_COLYSEUS_PORT = e2eColyseusPort;
process.env.NEXT_PUBLIC_COLYSEUS_URL = e2eColyseusWsUrl;
process.env.NEXT_PUBLIC_HOST_URL = e2eAppUrl;
process.env.NEXT_PUBLIC_FLIMFLAM_E2E = "1";
process.env.FLIMFLAM_E2E = "1";
process.env.FLIMFLAM_E2E_RUNTIME = E2E_RUNTIME;
process.env.FLIMFLAM_E2E_SKIP_BUILD = E2E_SKIP_BUILD;
process.env.FLIMFLAM_E2E_HOST_DIST_DIR = e2eAppDistDir;

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: e2eArtifactsDir,
  timeout: 90_000,
  expect: {
    timeout: 20_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: e2eReportDir }]],
  use: {
    baseURL: e2eAppUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/e2e-webserver.mjs",
    url: e2eAppUrl,
    timeout: 360_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      FLIMFLAM_E2E: "1",
      NEXT_PUBLIC_FLIMFLAM_E2E: "1",
      PORT: e2eColyseusPort,
      FLIMFLAM_E2E_COLYSEUS_PORT: e2eColyseusPort,
      NEXT_PUBLIC_COLYSEUS_URL: e2eColyseusWsUrl,
      NEXT_PUBLIC_HOST_URL: e2eAppUrl,
      FLIMFLAM_E2E_COLYSEUS_HEALTH_URL: e2eColyseusHealthUrl,
      FLIMFLAM_E2E_HOST_PORT: e2eAppPort,
      FLIMFLAM_E2E_HOST_URL: e2eAppUrl,
      FLIMFLAM_E2E_HOST_DIST_DIR: e2eAppDistDir,
      FLIMFLAM_TIMER_SCALE: process.env.FLIMFLAM_TIMER_SCALE ?? "0.12",
      FLIMFLAM_DISABLE_AI: process.env.FLIMFLAM_DISABLE_AI ?? "1",
      FLIMFLAM_E2E_RUNTIME: E2E_RUNTIME,
      FLIMFLAM_E2E_SKIP_BUILD: E2E_SKIP_BUILD,
      FLIMFLAM_SKIP_NEXT_CLEAN: process.env.FLIMFLAM_SKIP_NEXT_CLEAN ?? "0",
      FLIMFLAM_E2E_RECLAIM_PORTS: process.env.FLIMFLAM_E2E_RECLAIM_PORTS ?? "1",
      FLIMFLAM_E2E_RECLAIM_RUNNERS: process.env.FLIMFLAM_E2E_RECLAIM_RUNNERS ?? "0",
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
