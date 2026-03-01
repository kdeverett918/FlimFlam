// Colyseus Cloud runs your app under PM2 and expects an ecosystem file at the
// repository root. We run the Colyseus server via `tsx` to avoid TS/ESM
// extension-resolution issues in workspace packages.
//
// Note: Colyseus Cloud infrastructure expects the process to emit `ready`
// when `wait_ready: true` (we do this in packages/server/src/index.ts).
const isWindows = process.platform === "win32";

module.exports = {
  apps: [
    {
      name: "partyline",
      script: "packages/server/src/index.ts",
      interpreter: isWindows ? "node_modules/.bin/tsx.cmd" : "node_modules/.bin/tsx",
      time: true,
      watch: false,
      instances: 1,
      exec_mode: "fork",
      wait_ready: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
