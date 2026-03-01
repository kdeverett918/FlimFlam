// Colyseus Cloud runs your app under PM2 and expects an ecosystem file at the
// repository root.
//
// We run a small Node bootstrap script that launches the TypeScript server via
// `tsx` and emits PM2 `ready` only after the server reports it is listening.
// This avoids tsx/cwd edge cases under Colyseus Cloud post-deploy.

const path = require("node:path");

module.exports = {
  apps: [
    {
      // New app name avoids inheriting stale PM2 scale state from older failed
      // rollouts that accumulated extra instances.
      name: "partyline-server",
      cwd: __dirname,
      script: "scripts/cloud-server-runner.mjs",
      interpreter: "node",
      time: true,
      watch: false,
      instances: 1,
      exec_mode: "fork",
      wait_ready: true,
      // tsx JIT-compiles all TypeScript on first start; on a constrained cloud
      // VM this can take 20-40 s. The PM2 default (3 s) is far too short.
      listen_timeout: 60000,
      kill_timeout: 5000,
      env: {
        NODE_ENV: "production",
        TSX_TSCONFIG_PATH: path.join(__dirname, "packages/server/tsconfig.json"),
      },
    },
  ],
};
