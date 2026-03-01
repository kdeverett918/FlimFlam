import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

function findBin(name) {
  const bin = process.platform === "win32" ? name + ".cmd" : name;
  const candidate = resolve("node_modules/.bin", bin);
  return existsSync(candidate) ? candidate : null;
}

const turbo = findBin("turbo");

// Colyseus Cloud may install production-only dependencies. In that case, our
// build tooling (turbo/typescript/etc.) won't be available. Since the server
// runs TypeScript directly via tsx in production (see ecosystem.config.js),
// it's safe to treat the build step as a no-op in that environment.
if (!turbo) {
  console.log("[PartyLine] turbo not found (likely prod-only install). Skipping build step.");
  process.exit(0);
}

console.log(`[PartyLine] Using turbo: ${turbo}`);

const result = spawnSync(
  turbo,
  ["build", "--filter=@partyline/server..."],
  {
    stdio: "inherit",
    // `.cmd` wrappers on Windows require shell invocation.
    shell: process.platform === "win32",
  },
);

if (result.error) {
  console.error("[PartyLine] Build failed to spawn turbo", result.error);
}

process.exit(result.status ?? 1);
