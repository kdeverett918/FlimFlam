import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Usage: node scripts/next-with-prod-env.mjs <next-command> [args...]");
  process.exit(1);
}

if (command === "build") {
  const skipNextClean =
    process.env.FLIMFLAM_SKIP_NEXT_CLEAN === "1" || process.env.FLIMFLAM_SKIP_NEXT_CLEAN === "true";

  if (!skipNextClean) {
    const nextDir = path.join(process.cwd(), ".next");
    try {
      rmSync(nextDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors; next build will surface actionable failures.
    }
  }
}

const requireFromCwd = createRequire(path.join(process.cwd(), "package.json"));
const nextCliPath = requireFromCwd.resolve("next/dist/bin/next");

const result = spawnSync(process.execPath, [nextCliPath, command, ...args], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "production",
  },
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

if (result.error) {
  console.error(result.error);
}

process.exit(1);
