import { spawn } from "node:child_process";

const isWin = process.platform === "win32";
const pnpm = "pnpm";

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

children.push(spawnService("server", ["--filter", "@partyline/server", "start:e2e"]));
children.push(spawnService("host", ["--filter", "@partyline/host", "start"]));
children.push(spawnService("controller", ["--filter", "@partyline/controller", "start"]));

// Keep this parent process alive for Playwright.
setInterval(() => {}, 1000);
