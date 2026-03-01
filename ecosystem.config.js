// Colyseus Cloud runs your app under PM2 and expects an ecosystem file at the
// repository root.
//
// Important: Colyseus post-deploy runs PM2 from `/home/deploy/source` and the
// runtime app `cwd` is effectively root. When using `tsx` from root in this
// monorepo, we must pin the server tsconfig path or decorators may fail at
// runtime.
//
// PM2/Colyseus uses `wait_ready: true`, and the server emits `ready` from
// `packages/server/src/index.ts` after binding the HTTP port.
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
        TSX_TSCONFIG_PATH: "packages/server/tsconfig.json",
      },
    },
  ],
};
