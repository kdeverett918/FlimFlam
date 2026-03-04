import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";

const requireFromHere = createRequire(import.meta.url);
const nextCliPath = requireFromHere.resolve("next/dist/bin/next");

const isWin = process.platform === "win32";
const PNPM_BIN = "pnpm";

const repoRoot = process.cwd();
const hostCwd = path.join(repoRoot, "apps", "host");
const controllerCwd = path.join(repoRoot, "apps", "controller");

const hostPort = process.env.FLIMFLAM_E2E_HOST_PORT ?? "5310";
const controllerPort = process.env.FLIMFLAM_E2E_CONTROLLER_PORT ?? "5311";
const serverPort = process.env.PORT ?? process.env.FLIMFLAM_E2E_COLYSEUS_PORT ?? "5567";
const hostDistDir = process.env.FLIMFLAM_E2E_HOST_DIST_DIR ?? ".next-e2e-host";
const controllerDistDir = process.env.FLIMFLAM_E2E_CONTROLLER_DIST_DIR ?? ".next-e2e-controller";

const hostUrl = process.env.FLIMFLAM_E2E_HOST_URL ?? `http://127.0.0.1:${hostPort}`;
const controllerUrl =
  process.env.FLIMFLAM_E2E_CONTROLLER_URL ?? `http://127.0.0.1:${controllerPort}`;
const serverHealthUrl =
  process.env.FLIMFLAM_E2E_COLYSEUS_HEALTH_URL ?? `http://127.0.0.1:${serverPort}/health`;

const runtimeModeInput = (process.env.FLIMFLAM_E2E_RUNTIME ?? "development").toLowerCase();
const runtimeMode = runtimeModeInput === "production" ? "production" : "development";
const useProductionRuntime = runtimeMode === "production";
const skipServer =
  process.env.FLIMFLAM_E2E_SKIP_SERVER === "1" || process.env.FLIMFLAM_E2E_SKIP_SERVER === "true";
const skipBuild =
  process.env.FLIMFLAM_E2E_SKIP_BUILD === undefined ||
  process.env.FLIMFLAM_E2E_SKIP_BUILD === "1" ||
  process.env.FLIMFLAM_E2E_SKIP_BUILD === "true";
const skipNextClean =
  process.env.FLIMFLAM_SKIP_NEXT_CLEAN === "1" || process.env.FLIMFLAM_SKIP_NEXT_CLEAN === "true";
const reclaimPorts =
  process.env.FLIMFLAM_E2E_RECLAIM_PORTS === undefined ||
  process.env.FLIMFLAM_E2E_RECLAIM_PORTS === "1" ||
  process.env.FLIMFLAM_E2E_RECLAIM_PORTS === "true";
const reclaimRunnersMode = (process.env.FLIMFLAM_E2E_RECLAIM_RUNNERS ?? "0").toLowerCase();
const reclaimRunners = reclaimRunnersMode === "force";
const buildAttemptCountRaw = Number.parseInt(process.env.FLIMFLAM_E2E_BUILD_ATTEMPTS ?? "3", 10);
const buildAttemptCount =
  Number.isFinite(buildAttemptCountRaw) && buildAttemptCountRaw > 0 ? buildAttemptCountRaw : 3;

let shuttingDown = false;
let keepAliveTimer = null;
const children = [];
const managedServicePorts = new Set();

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function reclaimStaleRunners() {
  if (isWin) {
    const result = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        [
          `$current = ${process.pid}`,
          "$procs = Get-CimInstance Win32_Process | Where-Object {",
          `  $_.Name -eq 'node.exe' -and $_.CommandLine -and $_.CommandLine -match 'scripts[\\\\/]e2e-webserver\\.mjs' -and $_.ProcessId -ne $current`,
          "}",
          "foreach ($p in $procs) {",
          "  try {",
          "    Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop",
          "    Write-Output $p.ProcessId",
          "  } catch { }",
          "}",
        ].join("; "),
      ],
      {
        encoding: "utf8",
        shell: false,
        stdio: ["ignore", "pipe", "ignore"],
      },
    );

    if (result.status === 0 && typeof result.stdout === "string") {
      const reclaimed = result.stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => /^\d+$/.test(line));
      if (reclaimed.length > 0) {
        console.warn(`[e2e-webserver] reclaimed stale runner pid(s): ${reclaimed.join(", ")}`);
      }
    }
    return;
  }

  spawnSync("pkill", ["-f", "scripts/e2e-webserver.mjs"], {
    shell: false,
    stdio: "ignore",
  });
}

function spawnPnpm(args, options) {
  if (isWin) {
    return spawn("cmd.exe", ["/d", "/s", "/c", PNPM_BIN, ...args], options);
  }
  return spawn(PNPM_BIN, args, options);
}

function spawnPnpmSync(args, options) {
  if (isWin) {
    return spawnSync("cmd.exe", ["/d", "/s", "/c", PNPM_BIN, ...args], options);
  }
  return spawnSync(PNPM_BIN, args, options);
}

function killTree(pid) {
  if (!pid || pid === process.pid) return;

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
    // ignore
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }

  for (const child of children) {
    killTree(child.pid);
  }
  for (const port of managedServicePorts) {
    for (const pid of getListeningPids(port)) {
      killTree(pid);
    }
  }

  process.exitCode = exitCode;
  setTimeout(() => process.exit(exitCode), isWin ? 250 : 100).unref();
}

function runPnpmStep(label, args, envOverrides = {}, maxAttempts = 1) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const attemptLabel = maxAttempts > 1 ? `${label} (attempt ${attempt}/${maxAttempts})` : label;
    console.log(`[e2e-webserver] ${attemptLabel}: ${PNPM_BIN} ${args.join(" ")}`);
    const result = spawnPnpmSync(args, {
      stdio: "inherit",
      env: {
        ...process.env,
        ...envOverrides,
      },
      shell: false,
    });

    if (typeof result.status === "number" && result.status === 0) {
      return;
    }

    const detail =
      typeof result.status === "number"
        ? `exit code ${result.status}`
        : result.error
          ? String(result.error)
          : "unknown error";

    if (attempt < maxAttempts) {
      console.warn(`[e2e-webserver] ${label} failed (${detail}); retrying...`);
      continue;
    }

    throw new Error(`${label} failed (${detail})`);
  }
}

function launchManagedChild(
  label,
  spawnChild,
  maxRestarts = useProductionRuntime ? 0 : 3,
  options = {},
) {
  const daemonizedPort =
    typeof options.daemonizedPort === "number" && Number.isFinite(options.daemonizedPort)
      ? options.daemonizedPort
      : null;
  let restartCount = 0;

  const launch = () => {
    const child = spawnChild();
    children.push(child);

    const handleUnexpectedExit = (detail, code) => {
      const canRestart = restartCount < maxRestarts;
      if (canRestart) {
        restartCount += 1;
        console.warn(
          `[e2e-webserver] ${label} exited (${detail}); restarting (${restartCount}/${maxRestarts})...`,
        );
        setTimeout(launch, 500).unref();
        return;
      }
      console.error(`[e2e-webserver] ${label} exited (${detail})`);
      shutdown(code ?? 1);
    };

    child.on("exit", (code, signal) => {
      if (shuttingDown) return;
      const detail = signal ? `signal ${signal}` : `code ${code ?? 0}`;
      if (code === 0 && daemonizedPort !== null) {
        void (async () => {
          const daemonizeDeadline = Date.now() + 5_000;
          while (Date.now() < daemonizeDeadline) {
            const listenerPids = getListeningPids(daemonizedPort).filter(
              (pid) => pid !== process.pid,
            );
            if (listenerPids.length > 0) {
              console.warn(
                `[e2e-webserver] ${label} launcher exited (${detail}); listener active on ${daemonizedPort} via pid(s): ${listenerPids.join(", ")}.`,
              );
              return;
            }
            await sleep(200);
          }
          if (shuttingDown) return;
          handleUnexpectedExit(detail, code);
        })();
        return;
      }
      handleUnexpectedExit(detail, code);
    });

    child.on("error", (error) => {
      if (shuttingDown) return;
      const canRestart = restartCount < maxRestarts;
      if (canRestart) {
        restartCount += 1;
        console.warn(
          `[e2e-webserver] ${label} failed to start: ${String(error)}; restarting (${restartCount}/${maxRestarts})...`,
        );
        setTimeout(launch, 500).unref();
        return;
      }
      console.error(`[e2e-webserver] ${label} failed to start: ${String(error)}`);
      shutdown(1);
    });
  };

  launch();
}

function spawnPnpmService(label, args, envOverrides = {}) {
  launchManagedChild(label, () =>
    spawnPnpm(args, {
      stdio: ["ignore", "inherit", "inherit"],
      env: {
        ...process.env,
        ...envOverrides,
      },
      shell: false,
    }),
  );
}

function spawnNextService(label, cwd, command, port, distDir) {
  const numericPort = Number.parseInt(String(port), 10);
  if (Number.isFinite(numericPort)) {
    managedServicePorts.add(numericPort);
  }

  launchManagedChild(
    label,
    () =>
      spawn(
        process.execPath,
        [nextCliPath, command, "--hostname", "127.0.0.1", "--port", String(port)],
        {
          cwd,
          stdio: ["ignore", "inherit", "inherit"],
          env: {
            ...process.env,
            NODE_ENV: useProductionRuntime ? "production" : "development",
            FLIMFLAM_NEXT_DIST_DIR: distDir,
          },
          shell: false,
        },
      ),
    useProductionRuntime ? 0 : 3,
    { daemonizedPort: Number.isFinite(numericPort) ? numericPort : null },
  );
}

function cleanNextArtifacts() {
  if (skipNextClean) {
    console.log("[e2e-webserver] skipping .next cleanup (FLIMFLAM_SKIP_NEXT_CLEAN=1)");
    return;
  }

  const targets = [
    { cwd: hostCwd, distDir: hostDistDir },
    { cwd: controllerCwd, distDir: controllerDistDir },
  ];

  for (const target of targets) {
    const nextDir = path.join(target.cwd, target.distDir);
    try {
      fs.rmSync(nextDir, { recursive: true, force: true });
      console.log(`[e2e-webserver] cleaned ${nextDir}`);
    } catch (error) {
      console.warn(
        `[e2e-webserver] failed to clean ${nextDir}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

function ensureNextBuildExists(appCwd, distDir, appName) {
  const buildIdPath = path.join(appCwd, distDir, "BUILD_ID");
  if (!fs.existsSync(buildIdPath)) {
    throw new Error(`${appName} production build missing at ${buildIdPath}`);
  }
}

async function isPortInUse(port, host = "127.0.0.1") {
  const parsedPort = Number(port);
  if (!Number.isFinite(parsedPort)) return false;

  return await new Promise((resolve) => {
    const socket = net.createConnection({ host, port: parsedPort });
    const done = (inUse) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(inUse);
    };

    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.setTimeout(800);
  });
}

function parsePortFromAddress(address) {
  const match = address.trim().match(/:(\d+)$/);
  if (!match) return null;
  return Number.parseInt(match[1] ?? "", 10);
}

function getListeningPids(port) {
  const targetPort = Number.parseInt(String(port), 10);
  if (!Number.isFinite(targetPort)) return [];

  if (isWin) {
    const result = spawnSync("netstat", ["-ano", "-p", "tcp"], {
      encoding: "utf8",
      shell: false,
      stdio: ["ignore", "pipe", "ignore"],
    });
    if (result.status !== 0 || typeof result.stdout !== "string") return [];

    const pids = new Set();
    const lines = result.stdout.split(/\r?\n/);
    for (const line of lines) {
      if (!/\bLISTENING\b/i.test(line)) continue;
      const match = line.match(/^\s*TCP\s+(\S+)\s+(\S+)\s+LISTENING\s+(\d+)\s*$/i);
      if (!match) continue;
      const localAddress = match[1] ?? "";
      const pid = Number.parseInt(match[3] ?? "", 10);
      const parsedPort = parsePortFromAddress(localAddress);
      if (parsedPort === targetPort && Number.isFinite(pid) && pid > 0) {
        pids.add(pid);
      }
    }
    return [...pids];
  }

  const result = spawnSync("lsof", ["-nP", `-iTCP:${targetPort}`, "-sTCP:LISTEN", "-t"], {
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

async function waitForPortReleased(port, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await isPortInUse(port)) && getListeningPids(port).length === 0) {
      return true;
    }
    await sleep(250);
  }
  return !(await isPortInUse(port)) && getListeningPids(port).length === 0;
}

async function ensurePortAvailable(port, serviceName) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const existingPids = getListeningPids(port).filter((pid) => pid !== process.pid);
    const inUse = existingPids.length > 0 || (await isPortInUse(port));
    if (!inUse) {
      return true;
    }

    if (!reclaimPorts) {
      console.error(
        `[e2e-webserver] ${serviceName} port ${port} is already in use. Stop the existing process or set FLIMFLAM_E2E_RECLAIM_PORTS=1.`,
      );
      return false;
    }

    if (existingPids.length > 0) {
      console.warn(
        `[e2e-webserver] ${serviceName} port ${port} is in use by pid(s): ${existingPids.join(", ")}. Reclaiming...`,
      );
      for (const pid of existingPids) {
        killTree(pid);
      }
    } else {
      console.warn(
        `[e2e-webserver] ${serviceName} port ${port} is in use without visible pid. Waiting for release...`,
      );
    }

    const released = await waitForPortReleased(port, 15_000);
    if (released) {
      return true;
    }
    await sleep(350);
  }

  console.error(
    `[e2e-webserver] ${serviceName} port ${port} could not be reclaimed after retries.`,
  );
  return false;
}

async function ensureRequiredPortsAvailable() {
  let blocked = false;
  if (!skipServer && !(await ensurePortAvailable(serverPort, "server"))) blocked = true;
  if (!(await ensurePortAvailable(hostPort, "host"))) blocked = true;
  if (!(await ensurePortAvailable(controllerPort, "controller"))) blocked = true;
  return !blocked;
}

async function waitForHttpReady(url, label, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { cache: "no-store", redirect: "manual" });
      if (response.status >= 200 && response.status < 500) {
        console.log(`[e2e-webserver] ${label} ready (${response.status}) at ${url}`);
        return;
      }
    } catch {
      // retry
    }
    await sleep(300);
  }
  throw new Error(`Timed out waiting for ${label} at ${url}`);
}

async function prebuildIfNeeded() {
  if (!useProductionRuntime) return;

  if (skipBuild) {
    ensureNextBuildExists(hostCwd, hostDistDir, "host");
    ensureNextBuildExists(controllerCwd, controllerDistDir, "controller");
    return;
  }

  const buildEnv = {
    NEXT_TELEMETRY_DISABLED: "1",
    FLIMFLAM_SKIP_NEXT_CLEAN: process.env.FLIMFLAM_SKIP_NEXT_CLEAN ?? "0",
  };

  runPnpmStep(
    "host build",
    ["--filter", "@flimflam/host", "build"],
    {
      ...buildEnv,
      FLIMFLAM_NEXT_DIST_DIR: hostDistDir,
    },
    buildAttemptCount,
  );
  runPnpmStep(
    "controller build",
    ["--filter", "@flimflam/controller", "build"],
    {
      ...buildEnv,
      FLIMFLAM_NEXT_DIST_DIR: controllerDistDir,
    },
    buildAttemptCount,
  );

  ensureNextBuildExists(hostCwd, hostDistDir, "host");
  ensureNextBuildExists(controllerCwd, controllerDistDir, "controller");
}

function startServerIfNeeded() {
  if (skipServer) {
    console.log("[e2e-webserver] Skipping @flimflam/server (FLIMFLAM_E2E_SKIP_SERVER=1)");
    return;
  }

  spawnPnpmService("server", ["--filter", "@flimflam/server", "start:e2e"], {
    PORT: String(serverPort),
  });
}

function startHost() {
  const command = useProductionRuntime ? "start" : "dev";
  console.log(`[e2e-webserver] launching host via next ${command} on ${hostPort}`);
  spawnNextService("host", hostCwd, command, hostPort, hostDistDir);
}

function startController() {
  const command = useProductionRuntime ? "start" : "dev";
  console.log(`[e2e-webserver] launching controller via next ${command} on ${controllerPort}`);
  spawnNextService("controller", controllerCwd, command, controllerPort, controllerDistDir);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("uncaughtException", (error) => {
  console.error("[e2e-webserver] uncaught exception", error);
  shutdown(1);
});
process.on("unhandledRejection", (error) => {
  console.error("[e2e-webserver] unhandled rejection", error);
  shutdown(1);
});

async function main() {
  fs.mkdirSync(path.join(repoRoot, ".tmp", "playwright-artifacts"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, ".tmp", "playwright-report"), { recursive: true });

  console.log(
    `[e2e-webserver] bootstrap runtime=${runtimeMode} host=${hostPort} controller=${controllerPort} server=${serverPort}`,
  );
  if (runtimeModeInput !== runtimeMode) {
    console.warn(
      `[e2e-webserver] unknown FLIMFLAM_E2E_RUNTIME='${runtimeModeInput}', defaulting to development`,
    );
  }

  if (reclaimRunners) {
    reclaimStaleRunners();
  } else if (reclaimRunnersMode === "1" || reclaimRunnersMode === "true") {
    console.warn(
      "[e2e-webserver] FLIMFLAM_E2E_RECLAIM_RUNNERS=1 is deprecated; use 'force' for cross-runner reclaim.",
    );
  }
  cleanNextArtifacts();

  if (!(await ensureRequiredPortsAvailable())) {
    process.exitCode = 1;
    return;
  }

  await prebuildIfNeeded();

  if (!(await ensureRequiredPortsAvailable())) {
    process.exitCode = 1;
    return;
  }

  startServerIfNeeded();
  startHost();
  startController();

  if (!skipServer) {
    await waitForHttpReady(serverHealthUrl, "server");
  }
  await waitForHttpReady(hostUrl, "host");
  await waitForHttpReady(controllerUrl, "controller");

  console.log(`[e2e-webserver] Ready (runtime=${runtimeMode})`);
  keepAliveTimer = setInterval(() => {}, 1000);
}

void main().catch((error) => {
  console.error(
    `[e2e-webserver] startup failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  shutdown(1);
});
