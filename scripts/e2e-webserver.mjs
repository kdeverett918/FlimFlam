import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";

const requireFromHere = createRequire(import.meta.url);
const tsxCliPath = path.join(
  path.dirname(requireFromHere.resolve("tsx/package.json")),
  "dist",
  "cli.mjs",
);

const isWin = process.platform === "win32";
const PNPM_BIN = "pnpm";

if (process.env.FORCE_COLOR && process.env.NO_COLOR) {
  process.env.NO_COLOR = undefined;
}

const repoRoot = process.cwd();
const webCwd = path.join(repoRoot, "apps", "web");
const serverCwd = path.join(repoRoot, "packages", "server");

const appPort = process.env.FLIMFLAM_E2E_HOST_PORT ?? "5310";
const serverPort = process.env.PORT ?? process.env.FLIMFLAM_E2E_COLYSEUS_PORT ?? "5567";
const configuredDistDir = process.env.FLIMFLAM_E2E_HOST_DIST_DIR?.trim();
const legacyDistDirName = `.next-e2e-host-${appPort}`;
const appDistDir =
  configuredDistDir && configuredDistDir.length > 0 && configuredDistDir !== legacyDistDirName
    ? configuredDistDir
    : `${legacyDistDirName}-${process.pid}`;
const configuredTsconfigPath = process.env.FLIMFLAM_NEXT_TSCONFIG_PATH?.trim();
const appTsconfigPath =
  configuredTsconfigPath && configuredTsconfigPath.length > 0
    ? configuredTsconfigPath
    : `tsconfig.e2e-${appPort}.json`;

const appUrl = process.env.FLIMFLAM_E2E_HOST_URL ?? `http://127.0.0.1:${appPort}`;
const serverHealthUrl =
  process.env.FLIMFLAM_E2E_COLYSEUS_HEALTH_URL ?? `http://127.0.0.1:${serverPort}/health`;

const runtimeModeInput = (process.env.FLIMFLAM_E2E_RUNTIME ?? "production").toLowerCase();
const runtimeMode = runtimeModeInput === "development" ? "development" : "production";
const useProductionRuntime = runtimeMode === "production";
const skipServer =
  process.env.FLIMFLAM_E2E_SKIP_SERVER === "1" || process.env.FLIMFLAM_E2E_SKIP_SERVER === "true";
const skipBuildRaw = process.env.FLIMFLAM_E2E_SKIP_BUILD;
const skipBuild =
  skipBuildRaw === undefined
    ? !useProductionRuntime
    : skipBuildRaw === "1" || skipBuildRaw === "true";
const skipNextClean =
  process.env.FLIMFLAM_SKIP_NEXT_CLEAN === "1" || process.env.FLIMFLAM_SKIP_NEXT_CLEAN === "true";
const reclaimPorts =
  process.env.FLIMFLAM_E2E_RECLAIM_PORTS === undefined ||
  process.env.FLIMFLAM_E2E_RECLAIM_PORTS === "1" ||
  process.env.FLIMFLAM_E2E_RECLAIM_PORTS === "true";
const reclaimRunnersMode = (
  process.env.FLIMFLAM_E2E_RECLAIM_RUNNERS ?? (isWin ? "force" : "0")
).toLowerCase();
const reclaimRunnerLockOwners = reclaimRunnersMode === "force" || reclaimRunnersMode === "sweep";
const sweepStaleRunners = reclaimRunnersMode === "sweep";
const buildAttemptCountRaw = Number.parseInt(process.env.FLIMFLAM_E2E_BUILD_ATTEMPTS ?? "3", 10);
const buildAttemptCount =
  Number.isFinite(buildAttemptCountRaw) && buildAttemptCountRaw > 0 ? buildAttemptCountRaw : 3;
const lockDir = path.join(repoRoot, ".tmp", "e2e-webserver-locks");
const lockName = `e2e-runner-${appPort}-${serverPort}`.replace(/[^a-zA-Z0-9_.-]/g, "_");
const lockPath = path.join(lockDir, `${lockName}.json`);

let shuttingDown = false;
let keepAliveTimer = null;
const children = [];
const managedServicePorts = new Set();
let lockHeld = false;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function ensureE2eTsconfig() {
  const resolvedTsconfigPath = path.isAbsolute(appTsconfigPath)
    ? appTsconfigPath
    : path.join(webCwd, appTsconfigPath);
  const relativeBaseTsconfigPath = path
    .relative(path.dirname(resolvedTsconfigPath), path.join(webCwd, "tsconfig.json"))
    .replaceAll("\\", "/");
  const extendsPath =
    relativeBaseTsconfigPath.startsWith(".") || relativeBaseTsconfigPath.startsWith("/")
      ? relativeBaseTsconfigPath
      : `./${relativeBaseTsconfigPath}`;
  const relativeBaseUrl = path.relative(path.dirname(resolvedTsconfigPath), webCwd).replaceAll("\\", "/");
  const baseUrl =
    relativeBaseUrl.length === 0
      ? "."
      : relativeBaseUrl.startsWith(".") || relativeBaseUrl.startsWith("/")
        ? relativeBaseUrl
        : `./${relativeBaseUrl}`;
  fs.mkdirSync(path.dirname(resolvedTsconfigPath), { recursive: true });
  fs.writeFileSync(
    resolvedTsconfigPath,
    `${JSON.stringify(
      {
        extends: extendsPath,
        compilerOptions: {
          baseUrl,
          paths: {
            "@/*": ["./src/*"],
          },
        },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
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

function isPidAlive(pid) {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error && typeof error === "object" && "code" in error && error.code === "EPERM";
  }
}

function isRunnerPid(pid) {
  if (!Number.isFinite(pid) || pid <= 0) return false;

  if (isWin) {
    const result = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        [
          `$pid = ${pid}`,
          '$p = Get-CimInstance Win32_Process -Filter ("ProcessId = " + $pid)',
          "if (-not $p) { exit 1 }",
          "if (-not $p.Name -or $p.Name -notmatch '^node(\\.exe)?$') { exit 1 }",
          "if (-not $p.CommandLine -or $p.CommandLine -notmatch 'scripts[\\\\/]e2e-webserver\\.mjs') { exit 1 }",
          "exit 0",
        ].join("; "),
      ],
      {
        encoding: "utf8",
        shell: false,
        stdio: ["ignore", "ignore", "ignore"],
      },
    );
    return result.status === 0;
  }

  try {
    const cmdline = fs.readFileSync(`/proc/${pid}/cmdline`, "utf8");
    return /scripts[\\/]+e2e-webserver\.mjs/.test(cmdline);
  } catch {
    return false;
  }
}

function readLockRecord() {
  try {
    const raw = fs.readFileSync(lockPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const pid = Number.parseInt(String(parsed.pid ?? ""), 10);
    const createdAt = typeof parsed.createdAt === "string" ? parsed.createdAt : "";
    return {
      pid: Number.isFinite(pid) ? pid : null,
      createdAt,
    };
  } catch {
    return null;
  }
}

async function acquireRunnerLock() {
  fs.mkdirSync(lockDir, { recursive: true });

  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      fs.writeFileSync(
        lockPath,
        JSON.stringify(
          {
            pid: process.pid,
            createdAt: new Date().toISOString(),
            distDir: appDistDir,
            appPort: String(appPort),
          },
          null,
          2,
        ),
        { flag: "wx", encoding: "utf8" },
      );
      lockHeld = true;
      console.log(`[e2e-webserver] acquired runner lock ${lockPath}`);
      return;
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null;
      if (code !== "EEXIST") {
        throw error;
      }

      const record = readLockRecord();
      const lockPid = record?.pid ?? null;
      if (lockPid && lockPid !== process.pid && isPidAlive(lockPid)) {
        if (isRunnerPid(lockPid)) {
          if (!reclaimRunnerLockOwners) {
            throw new Error(
              `runner lock already held by active pid ${lockPid}; set FLIMFLAM_E2E_RECLAIM_RUNNERS=force to reclaim`,
            );
          }
          console.warn(
            `[e2e-webserver] reclaiming runner lock held by pid ${lockPid} (created ${record?.createdAt || "unknown"})`,
          );
          killTree(lockPid);
          await sleep(400);
        } else {
          console.warn(
            `[e2e-webserver] lock pid ${lockPid} is active but not an e2e-webserver runner; treating lock as stale`,
          );
        }
      }

      try {
        fs.rmSync(lockPath, { force: true });
      } catch {
        // retry
      }
      await sleep(200);
    }
  }

  throw new Error(`failed to acquire runner lock at ${lockPath}`);
}

function releaseRunnerLock() {
  if (!lockHeld) return;
  lockHeld = false;
  try {
    fs.rmSync(lockPath, { force: true });
    console.log(`[e2e-webserver] released runner lock ${lockPath}`);
  } catch {
    // best effort
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
  releaseRunnerLock();

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
  const treatActiveListenerAsHealthy = options.treatActiveListenerAsHealthy !== false;
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
      if (daemonizedPort !== null && treatActiveListenerAsHealthy) {
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

function spawnPnpmService(label, args, envOverrides = {}, options = {}) {
  launchManagedChild(
    label,
    () =>
      spawnPnpm(args, {
        stdio: ["ignore", "inherit", "inherit"],
        env: {
          ...process.env,
          ...envOverrides,
        },
        shell: false,
      }),
    useProductionRuntime ? 0 : 3,
    options,
  );
}

async function removeDirWithRetries(nextDir, maxAttempts = isWin ? 10 : 5) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      fs.rmSync(nextDir, { recursive: true, force: true });
      if (!fs.existsSync(nextDir)) {
        console.log(`[e2e-webserver] cleaned ${nextDir}`);
        return;
      }
      lastError = new Error(`Directory still exists after cleanup attempt ${attempt}`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < maxAttempts) {
      await sleep(isWin ? 500 : 250);
    }
  }

  const detail =
    lastError instanceof Error
      ? lastError.message
      : lastError
        ? String(lastError)
        : "unknown error";
  throw new Error(`failed to clean ${nextDir}: ${detail}`);
}

async function cleanNextArtifacts() {
  if (skipNextClean) {
    console.log("[e2e-webserver] skipping .next cleanup (FLIMFLAM_SKIP_NEXT_CLEAN=1)");
    return;
  }

  const targets = [{ cwd: webCwd, distDir: appDistDir }];

  for (const target of targets) {
    const nextDir = path.join(target.cwd, target.distDir);
    await removeDirWithRetries(nextDir);
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
  if (!(await ensurePortAvailable(appPort, "app"))) blocked = true;
  return !blocked;
}

function isHttpReadyStatus(status) {
  return status >= 200 && status < 400;
}

async function waitForHttpReady(
  url,
  label,
  { timeoutMs = 120_000, pollMs = 300, requiredConsecutive = 1 } = {},
) {
  const deadline = Date.now() + timeoutMs;
  let consecutive = 0;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { cache: "no-store", redirect: "manual" });
      if (isHttpReadyStatus(response.status)) {
        consecutive += 1;
      } else {
        consecutive = 0;
      }
      if (consecutive >= requiredConsecutive) {
        console.log(
          `[e2e-webserver] ${label} ready (${response.status}) at ${url} after ${consecutive} stable checks`,
        );
        return;
      }
    } catch {
      consecutive = 0;
    }
    await sleep(pollMs);
  }
  throw new Error(`Timed out waiting for ${label} at ${url}`);
}

async function prebuildIfNeeded() {
  if (!useProductionRuntime) return;

  if (skipBuild) {
    ensureNextBuildExists(webCwd, appDistDir, "web");
    return;
  }

  const buildEnv = {
    NEXT_TELEMETRY_DISABLED: "1",
    FLIMFLAM_SKIP_NEXT_CLEAN: process.env.FLIMFLAM_SKIP_NEXT_CLEAN ?? "0",
    FLIMFLAM_E2E: process.env.FLIMFLAM_E2E ?? "1",
    NEXT_PUBLIC_FLIMFLAM_E2E: process.env.NEXT_PUBLIC_FLIMFLAM_E2E ?? "1",
    FLIMFLAM_NEXT_TSCONFIG_PATH: appTsconfigPath,
  };

  runPnpmStep(
    "web build",
    ["--filter", "@flimflam/web", "build"],
    {
      ...buildEnv,
      FLIMFLAM_NEXT_DIST_DIR: appDistDir,
    },
    buildAttemptCount,
  );

  ensureNextBuildExists(webCwd, appDistDir, "web");
}

function startServerIfNeeded() {
  if (skipServer) {
    console.log("[e2e-webserver] Skipping @flimflam/server (FLIMFLAM_E2E_SKIP_SERVER=1)");
    return;
  }
  const serverPortNumber = Number.parseInt(String(serverPort), 10);
  if (Number.isFinite(serverPortNumber)) {
    managedServicePorts.add(serverPortNumber);
  }

  launchManagedChild(
    "server",
    () =>
      spawn(process.execPath, [tsxCliPath, "src/index.ts"], {
        cwd: serverCwd,
        stdio: ["ignore", "inherit", "inherit"],
        env: {
          ...process.env,
          FLIMFLAM_E2E: process.env.FLIMFLAM_E2E ?? "1",
          NEXT_PUBLIC_FLIMFLAM_E2E: process.env.NEXT_PUBLIC_FLIMFLAM_E2E ?? "1",
          FLIMFLAM_TIMER_SCALE: process.env.FLIMFLAM_TIMER_SCALE ?? "0.12",
          FLIMFLAM_DISABLE_AI: process.env.FLIMFLAM_DISABLE_AI ?? "1",
          FLIMFLAM_E2E_RUNTIME: runtimeMode,
          PORT: String(serverPort),
        },
        shell: false,
      }),
    useProductionRuntime ? 0 : 3,
    {
      daemonizedPort: serverPortNumber,
    },
  );
}

function startApp() {
  const command = useProductionRuntime ? "start" : "dev";
  console.log(`[e2e-webserver] launching web app via pnpm ${command} on ${appPort}`);
  const appPortNumber = Number.parseInt(String(appPort), 10);
  spawnPnpmService(
    "web",
    ["--filter", "@flimflam/web", command, "--hostname", "127.0.0.1", "--port", String(appPort)],
    {
      FLIMFLAM_E2E: process.env.FLIMFLAM_E2E ?? "1",
      NEXT_PUBLIC_FLIMFLAM_E2E: process.env.NEXT_PUBLIC_FLIMFLAM_E2E ?? "1",
      FLIMFLAM_TIMER_SCALE: process.env.FLIMFLAM_TIMER_SCALE ?? "0.12",
      FLIMFLAM_DISABLE_AI: process.env.FLIMFLAM_DISABLE_AI ?? "1",
      FLIMFLAM_E2E_RUNTIME: runtimeMode,
      FLIMFLAM_NEXT_DIST_DIR: appDistDir,
      FLIMFLAM_NEXT_TSCONFIG_PATH: appTsconfigPath,
    },
    {
      daemonizedPort: Number.isFinite(appPortNumber) ? appPortNumber : null,
    },
  );
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("exit", () => releaseRunnerLock());
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
  await acquireRunnerLock();

  console.log(
    `[e2e-webserver] bootstrap runtime=${runtimeMode} app=${appPort} server=${serverPort}`,
  );
  if (runtimeModeInput !== runtimeMode) {
    console.warn(
      `[e2e-webserver] unknown FLIMFLAM_E2E_RUNTIME='${runtimeModeInput}', defaulting to production`,
    );
  }

  if (sweepStaleRunners) {
    reclaimStaleRunners();
  } else if (reclaimRunnersMode === "1" || reclaimRunnersMode === "true") {
    console.warn(
      "[e2e-webserver] FLIMFLAM_E2E_RECLAIM_RUNNERS=1 is deprecated; use 'force' (lock reclaim) or 'sweep' (lock reclaim + process sweep).",
    );
  }
  await cleanNextArtifacts();
  ensureE2eTsconfig();

  if (!(await ensureRequiredPortsAvailable())) {
    throw new Error("required ports unavailable before startup");
  }

  await prebuildIfNeeded();

  if (!(await ensureRequiredPortsAvailable())) {
    throw new Error("required ports unavailable after prebuild");
  }

  startServerIfNeeded();
  startApp();

  if (!skipServer) {
    await waitForHttpReady(serverHealthUrl, "server");
  }
  await waitForHttpReady(appUrl, "web app", { requiredConsecutive: 3 });
  const prewarmRoomNewUrl = new URL("/room/new", appUrl).toString();
  await waitForHttpReady(prewarmRoomNewUrl, "web app prewarm /room/new", {
    requiredConsecutive: 3,
  });

  console.log(`[e2e-webserver] Ready (runtime=${runtimeMode})`);
  keepAliveTimer = setInterval(() => {}, 1000);
}

void main().catch((error) => {
  console.error(
    `[e2e-webserver] startup failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  shutdown(1);
});
