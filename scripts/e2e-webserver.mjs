import { spawn } from "node:child_process";

const isWin = process.platform === "win32";
const pnpm = "pnpm";
const hostPort = process.env.PARTYLINE_E2E_HOST_PORT ?? "3300";
const controllerPort = process.env.PARTYLINE_E2E_CONTROLLER_PORT ?? "3301";
const skipServer =
  process.env.PARTYLINE_E2E_SKIP_SERVER === "1" ||
  process.env.PARTYLINE_E2E_SKIP_SERVER === "true";

let shuttingDown = false;
const children = [];

function killTree(pid) {
  if (!pid) return;
  if (isWin) {
    // Ensure child process trees are cleaned up on Windows.
    spawn("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // ignore
    }
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    killTree(child.pid);
  }

  process.exitCode = exitCode;
}

function spawnService(label, args) {
  const child = spawn(pnpm, args, {
    stdio: "inherit",
    env: process.env,
    shell: isWin,
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    // Any service exiting early should fail the webserver.
    const detail = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.error(`[e2e-webserver] ${label} exited (${detail})`);
    shutdown(code ?? 1);
  });

  return child;
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("exit", () => shutdown(0));

if (skipServer) {
  console.log("[e2e-webserver] Skipping @partyline/server (PARTYLINE_E2E_SKIP_SERVER=1)");
} else {
  children.push(spawnService("server", ["--filter", "@partyline/server", "start:e2e"]));
}
children.push(
  spawnService("host", [
    "--filter",
    "@partyline/host",
    "exec",
    "next",
    "start",
    "--port",
    hostPort,
  ]),
);
children.push(
  spawnService("controller", [
    "--filter",
    "@partyline/controller",
    "exec",
    "next",
    "start",
    "--port",
    controllerPort,
  ]),
);

// Keep this parent process alive for Playwright.
setInterval(() => {}, 1000);
