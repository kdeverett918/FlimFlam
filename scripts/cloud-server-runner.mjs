import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Prefer tsx in the server's own node_modules; fall back to the workspace root.
function findTsx() {
  const candidates =
    process.platform === "win32"
      ? [resolve("packages/server/node_modules/.bin/tsx.cmd"), resolve("node_modules/.bin/tsx.cmd")]
      : [resolve("packages/server/node_modules/.bin/tsx"), resolve("node_modules/.bin/tsx")];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  const checked = candidates.join(", ");
  console.error(`[FlimFlam] ERROR: tsx binary not found. Checked: ${checked}`);
  process.exit(1);
}

const tsxBinary = findTsx();
console.log(`[FlimFlam] Using tsx: ${tsxBinary}`);

const serverEntry = resolve("packages/server/src/index.ts");
const tsconfigPath = resolve("packages/server/tsconfig.json");
console.log(`[FlimFlam] Server entry: ${serverEntry}`);

const child = spawn(tsxBinary, [serverEntry], {
  env: {
    ...process.env,
    TSX_TSCONFIG_PATH: process.env.TSX_TSCONFIG_PATH ?? tsconfigPath,
  },
  // `.cmd` wrappers on Windows require shell invocation.
  shell: process.platform === "win32",
  stdio: ["inherit", "pipe", "pipe"],
});

let readySent = false;
let stdoutBuffer = "";

function maybeMarkReadyFromStdout(chunkText) {
  stdoutBuffer += chunkText;
  const lines = stdoutBuffer.split(/\r?\n/);
  stdoutBuffer = lines.pop() ?? "";

  for (const line of lines) {
    if (!readySent && line.includes("[FlimFlam] Server listening on port")) {
      readySent = true;
      if (typeof process.send === "function") {
        process.send("ready");
      }
      break;
    }
  }
}

child.stdout.on("data", (chunk) => {
  const text = chunk.toString();
  process.stdout.write(chunk);
  maybeMarkReadyFromStdout(text);
});

child.stderr.on("data", (chunk) => {
  process.stderr.write(chunk);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

process.on("SIGINT", () => {
  child.kill("SIGINT");
});

process.on("SIGTERM", () => {
  child.kill("SIGTERM");
});
