// Colyseus Cloud runs your app under PM2 and expects an ecosystem file at the
// repository root.
//
// We run a small Node bootstrap script that launches the TypeScript server via
// `tsx` and emits PM2 `ready` only after the server reports it is listening.
// This avoids tsx/cwd edge cases under Colyseus Cloud post-deploy.

module.exports = {
  apps: [
    {
      // New app name avoids inheriting stale PM2 scale state from older failed
      // rollouts that accumulated extra instances.
      name: "partyline-server",
      script: "scripts/cloud-server-runner.mjs",
      interpreter: "node",
      time: true,
      watch: false,
      instances: 1,
      exec_mode: "fork",
      wait_ready: true,
      env: {
        NODE_ENV: "production",
        TSX_TSCONFIG_PATH: "packages/server/tsconfig.json",
      },
    },
  ],
};
