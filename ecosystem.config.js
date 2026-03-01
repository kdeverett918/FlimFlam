// Colyseus Cloud runs your app under PM2 and expects an ecosystem file at the
// repository root.
//
// Important: Colyseus forces `wait_ready: true` during post-deploy.
// Running via `interpreter: tsx` can break PM2 IPC readiness in some setups.
// Using `node --import tsx` keeps TypeScript support and preserves PM2 ready
// signaling from `process.send("ready")` in `packages/server/src/index.ts`.

module.exports = {
  apps: [
    {
      name: "partyline",
      cwd: "packages/server",
      script: "src/index.ts",
      interpreter: "node",
      node_args: ["--import", "tsx"],
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
