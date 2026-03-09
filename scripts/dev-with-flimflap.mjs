import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

const run = (command, args, extraEnv = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        ...extraEnv,
      },
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });
  });

const spawnPersistent = (command, args) =>
  spawn(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: true,
  });

await run("pnpm", ["--dir", "../game2", "--filter", "@flimflam/client", "build"], {
  FLIMFLAM_GAME_BASE_PATH: "/flimflap",
});
await run("pnpm", ["--dir", "../game2", "--filter", "@flimflam/server", "build"]);
await run("node", ["scripts/sync-flimflap-client.mjs"]);

const backend = spawnPersistent("pnpm", [
  "--dir",
  "../game2",
  "--filter",
  "@flimflam/server",
  "start",
]);
const web = spawnPersistent("pnpm", ["--filter", "@flimflam/web", "dev"]);

const shutdown = (signal) => {
  backend.kill(signal);
  web.kill(signal);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

await Promise.race([
  new Promise((resolve) => backend.on("exit", resolve)),
  new Promise((resolve) => web.on("exit", resolve)),
]);
