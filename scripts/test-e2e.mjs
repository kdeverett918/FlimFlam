import { spawn, spawnSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const requireFromHere = createRequire(import.meta.url);
const playwrightCliPath = requireFromHere.resolve("@playwright/test/cli");
const cwd = process.cwd();
const isWin = process.platform === "win32";

if (process.env.FORCE_COLOR && process.env.NO_COLOR) {
  process.env.NO_COLOR = undefined;
}

process.env.FLIMFLAM_E2E = process.env.FLIMFLAM_E2E ?? "1";
process.env.NEXT_PUBLIC_FLIMFLAM_E2E = process.env.NEXT_PUBLIC_FLIMFLAM_E2E ?? "1";
process.env.FLIMFLAM_E2E_RUNTIME = process.env.FLIMFLAM_E2E_RUNTIME ?? "production";
process.env.FLIMFLAM_E2E_SKIP_BUILD =
  process.env.FLIMFLAM_E2E_SKIP_BUILD ??
  (process.env.FLIMFLAM_E2E_RUNTIME === "production" ? "0" : "1");

function parsePort(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 65_535 ? parsed : null;
}

function isPortBusy(port) {
  const targetPort = Number.parseInt(String(port ?? ""), 10);
  if (!Number.isFinite(targetPort) || targetPort <= 0) return false;

  if (isWin) {
    const result = spawnSync("netstat", ["-ano", "-p", "tcp"], {
      encoding: "utf8",
      shell: false,
      stdio: ["ignore", "pipe", "ignore"],
    });
    if (result.status !== 0 || typeof result.stdout !== "string") return false;

    for (const rawLine of result.stdout.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line.startsWith("TCP")) continue;
      const columns = line.split(/\s+/);
      if (columns.length < 5) continue;
      const localAddress = columns[1] ?? "";
      const state = columns[3] ?? "";
      const parsedPort = parsePortFromAddress(localAddress);
      if (parsedPort === targetPort && /^(LISTENING|LISTEN)$/i.test(state)) {
        return true;
      }
    }
    return false;
  }

  const result = spawnSync("lsof", ["-nP", `-iTCP:${targetPort}`, "-sTCP:LISTEN", "-t"], {
    encoding: "utf8",
    shell: false,
    stdio: ["ignore", "pipe", "ignore"],
  });

  return (
    result.status === 0 && typeof result.stdout === "string" && result.stdout.trim().length > 0
  );
}

function resolvePortPair() {
  const explicitAppPort = parsePort(process.env.FLIMFLAM_E2E_HOST_PORT);
  const explicitColyseusPort = parsePort(process.env.FLIMFLAM_E2E_COLYSEUS_PORT);

  if (explicitAppPort && explicitColyseusPort) {
    return { appPort: explicitAppPort, colyseusPort: explicitColyseusPort };
  }
  if (explicitAppPort && !explicitColyseusPort) {
    return { appPort: explicitAppPort, colyseusPort: explicitAppPort + 257 };
  }
  if (!explicitAppPort && explicitColyseusPort) {
    const appPortFromServer = explicitColyseusPort - 257;
    if (appPortFromServer > 0) {
      return { appPort: appPortFromServer, colyseusPort: explicitColyseusPort };
    }
  }

  const pidOffset = Math.abs(process.pid % 20) * 20;
  const appCandidates = [5310, 5410, 5510, 5610, 5710, 5810, 5910].map((base) => base + pidOffset);

  for (const appCandidate of appCandidates) {
    const colyseusCandidate = appCandidate + 257;
    if (!isPortBusy(appCandidate) && !isPortBusy(colyseusCandidate)) {
      return { appPort: appCandidate, colyseusPort: colyseusCandidate };
    }
  }

  return { appPort: 5310, colyseusPort: 5567 };
}

const { appPort, colyseusPort } = resolvePortPair();
process.env.FLIMFLAM_E2E_HOST_PORT = String(appPort);
process.env.FLIMFLAM_E2E_COLYSEUS_PORT = String(colyseusPort);

const e2ePorts = [appPort, colyseusPort];

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parsePortFromAddress(address) {
  const match = address.trim().match(/:(\d+)$/);
  if (!match?.[1]) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function getListeningPids(port) {
  if (!Number.isFinite(port)) return [];

  if (isWin) {
    const result = spawnSync("netstat", ["-ano", "-p", "tcp"], {
      encoding: "utf8",
      shell: false,
      stdio: ["ignore", "pipe", "ignore"],
    });
    if (result.status !== 0 || typeof result.stdout !== "string") return [];

    const pids = new Set();
    for (const line of result.stdout.split(/\r?\n/)) {
      if (!/\bLISTENING\b/i.test(line)) continue;
      const match = line.match(/^\s*TCP\s+(\S+)\s+(\S+)\s+LISTENING\s+(\d+)\s*$/i);
      if (!match) continue;
      const localAddress = match[1] ?? "";
      const pid = Number.parseInt(match[3] ?? "", 10);
      const parsedPort = parsePortFromAddress(localAddress);
      if (parsedPort === port && Number.isFinite(pid) && pid > 0) {
        pids.add(pid);
      }
    }
    return [...pids];
  }

  const result = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], {
    encoding: "utf8",
    shell: false,
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (result.status !== 0 || typeof result.stdout !== "string") return [];

  const pids = new Set();
  for (const line of result.stdout.split(/\r?\n/)) {
    const pid = Number.parseInt(line.trim(), 10);
    if (Number.isFinite(pid) && pid > 0) {
      pids.add(pid);
    }
  }
  return [...pids];
}

function killTree(pid) {
  if (!Number.isFinite(pid) || pid <= 0 || pid === process.pid) return;

  if (isWin) {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
      shell: false,
    });
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // best effort
  }
}

function reclaimManagedPorts() {
  if (e2ePorts.length === 0) return;

  for (const port of e2ePorts) {
    for (const pid of getListeningPids(port)) {
      killTree(pid);
    }
  }
}

function reclaimWebserverRunners() {
  if (isWin) {
    const result = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        [
          `$current = ${process.pid}`,
          "$procs = Get-CimInstance Win32_Process | Where-Object {",
          `  $_.Name -match '^node(\\.exe)?$' -and $_.CommandLine -and $_.CommandLine -match 'scripts[\\\\/]e2e-webserver\\.mjs' -and $_.ProcessId -ne $current`,
          "}",
          "$procs | ForEach-Object { $_.ProcessId }",
        ].join("; "),
      ],
      {
        encoding: "utf8",
        shell: false,
        stdio: ["ignore", "pipe", "ignore"],
      },
    );

    if (result.status !== 0 || typeof result.stdout !== "string") {
      return;
    }

    const reclaimed = result.stdout
      .split(/\r?\n/)
      .map((line) => Number.parseInt(line.trim(), 10))
      .filter((pid) => Number.isFinite(pid) && pid > 0);
    if (reclaimed.length === 0) {
      return;
    }

    for (const pid of reclaimed) {
      killTree(pid);
    }
    console.error(`[test:e2e] reclaimed e2e-webserver runner pid(s): ${reclaimed.join(", ")}`);
    return;
  }

  spawnSync("pkill", ["-f", "scripts/e2e-webserver.mjs"], {
    shell: false,
    stdio: "ignore",
  });
}

async function waitForPortFree(port, timeoutMs = 10_000, requiredConsecutive = 1) {
  const deadline = Date.now() + timeoutMs;
  let consecutive = 0;
  while (Date.now() < deadline) {
    if (!isPortBusy(port) && getListeningPids(port).length === 0) {
      consecutive += 1;
      if (consecutive >= requiredConsecutive) {
        return true;
      }
    } else {
      consecutive = 0;
    }
    await sleep(250);
  }
  return false;
}

async function ensureManagedPortsAvailable() {
  if (e2ePorts.length === 0) return;

  for (const port of e2ePorts) {
    const attempts = 3;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      if (!isPortBusy(port) && getListeningPids(port).length === 0) {
        break;
      }

      reclaimManagedPorts();
      const released = await waitForPortFree(port, 15_000);
      if (released) {
        break;
      }

      if (attempt === attempts) {
        throw new Error(`[test:e2e] port ${port} is still in use after reclaim attempts`);
      }
    }
  }
}

async function cleanupManagedPorts() {
  reclaimWebserverRunners();
  for (const port of e2ePorts) {
    let released = false;
    for (let attempt = 1; attempt <= 4 && !released; attempt += 1) {
      reclaimManagedPorts();
      released = await waitForPortFree(port, 5_000, 4);
    }
    if (!released) {
      throw new Error(`[test:e2e] port ${port} remained in use after cleanup`);
    }
  }
}

function toPosixPath(value) {
  return value.replace(/\\/g, "/");
}

function looksLikeSimpleGlobPathArg(arg) {
  if (arg.startsWith("-") || !arg.includes("*")) {
    return false;
  }

  return /[\\/]/.test(arg) || /\.[cm]?[jt]sx?$/.test(arg);
}

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function compileSimpleGlob(pattern) {
  const normalizedPattern = toPosixPath(path.normalize(pattern));
  let source = "";

  for (const char of normalizedPattern) {
    source += char === "*" ? "[^/]*" : escapeRegex(char);
  }

  return new RegExp(`^${source}$`);
}

function isAbsolutePath(value) {
  return path.isAbsolute(value) || /^[A-Za-z]:[\\/]/.test(value);
}

function getSearchRoot(pattern) {
  const normalizedPattern = toPosixPath(path.normalize(pattern));
  const wildcardIndex = normalizedPattern.indexOf("*");
  const beforeWildcard =
    wildcardIndex === -1 ? normalizedPattern : normalizedPattern.slice(0, wildcardIndex);
  const lastSeparatorIndex = beforeWildcard.lastIndexOf("/");
  const root = lastSeparatorIndex === -1 ? "." : beforeWildcard.slice(0, lastSeparatorIndex);
  return path.resolve(root || ".");
}

async function collectFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

async function expandSimpleGlobArg(arg) {
  const matcher = compileSimpleGlob(arg);
  const searchRoot = getSearchRoot(arg);

  try {
    const files = await collectFiles(searchRoot);
    const matches = files
      .map((filePath) => {
        if (isAbsolutePath(arg)) {
          return toPosixPath(path.resolve(filePath));
        }

        return toPosixPath(path.relative(cwd, filePath));
      })
      .filter((candidate) => matcher.test(candidate))
      .sort((left, right) => left.localeCompare(right));

    if (matches.length > 0) {
      return matches;
    }
  } catch {
    // Fall through and let Playwright surface the original error if the pattern cannot be expanded.
  }

  return [arg];
}

async function expandArgs(args) {
  const expandedArgs = [];

  // Expand only file-like glob args so Playwright does not interpret shell-style globs as regex.
  for (const arg of args) {
    if (!looksLikeSimpleGlobPathArg(arg)) {
      expandedArgs.push(arg);
      continue;
    }

    const expanded = await expandSimpleGlobArg(arg);
    if (expanded.length > 1 || expanded[0] !== arg) {
      console.error(`[test:e2e] expanded ${arg} -> ${expanded.join(", ")}`);
    }
    expandedArgs.push(...expanded);
  }

  return expandedArgs;
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const expandedArgs = await expandArgs(rawArgs);
  reclaimWebserverRunners();
  await ensureManagedPortsAvailable();
  let cleanupPromise = null;
  const cleanupOnce = () => {
    if (!cleanupPromise) {
      cleanupPromise = cleanupManagedPorts().catch((error) => {
        console.error(`[test:e2e] cleanup failure: ${String(error)}`);
      });
    }
    return cleanupPromise;
  };

  const child = spawn(process.execPath, [playwrightCliPath, "test", ...expandedArgs], {
    cwd,
    env: process.env,
    stdio: "inherit",
  });
  let finalized = false;
  const finalizeExit = (code = 1, signal = null) => {
    if (finalized) return;
    finalized = true;
    void cleanupOnce().finally(() => {
      if (signal) {
        try {
          process.kill(process.pid, signal);
        } catch {
          process.exit(1);
        }
        return;
      }

      process.exit(code);
    });
  };

  const handleFatal = (label, error) => {
    console.error(`[test:e2e] ${label}: ${String(error)}`);
    finalizeExit(1);
  };

  const forwardSignal = (signal) => {
    try {
      child.kill(signal);
    } catch {
      // best effort
    }
    finalizeExit(1, signal);
  };

  process.on("SIGINT", () => forwardSignal("SIGINT"));
  process.on("SIGTERM", () => forwardSignal("SIGTERM"));
  process.on("uncaughtException", (error) => handleFatal("uncaught exception", error));
  process.on("unhandledRejection", (error) => handleFatal("unhandled rejection", error));

  child.on("error", (error) => {
    console.error(`[test:e2e] failed to start Playwright: ${String(error)}`);
    finalizeExit(1);
  });

  child.on("exit", (code, signal) => {
    finalizeExit(code ?? 1, signal ?? null);
  });
}

void main();
