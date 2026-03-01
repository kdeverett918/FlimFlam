// Colyseus Cloud runs your app under PM2 and expects an ecosystem file at the
// repository root.
//
// IMPORTANT: this repo is a pnpm monorepo. Runtime deps (colyseus, tsx, etc.)
// are installed under `packages/server/node_modules`, not at the workspace root.
// Set `cwd` accordingly so Node can resolve dependencies reliably in production.

const path = require("node:path");

module.exports = {
  apps: [
    {
      // New app name avoids inheriting stale PM2 scale state from older failed
      // rollouts that accumulated extra instances.
      name: "partyline-server",
      cwd: path.join(__dirname, "packages/server"),
      // Run TypeScript directly (tsx loader) from the server package cwd.
      // This avoids spawning `.bin/tsx` manually and fixes module resolution
      // in pnpm workspaces on Colyseus Cloud.
      script: "src/index.ts",
      interpreter: "node",
      interpreterArgs: "--import tsx",
      time: true,
      watch: false,
      instances: 1,
      exec_mode: "fork",
      wait_ready: true,
      // tsx JIT-compiles all TypeScript on first start; on a constrained cloud
      // VM this can take 20-40 s. The PM2 default (3 s) is far too short.
      // Give us more headroom for cold starts and rolling restarts.
      listen_timeout: 180000,
      kill_timeout: 5000,
      env: {
        NODE_ENV: "production",
        // Resolve relative to `cwd` above.
        TSX_TSCONFIG_PATH: "tsconfig.json",
      },
    },
  ],
};
