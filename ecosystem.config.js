// Colyseus Cloud runs your app under PM2 and expects an ecosystem file at the
// repository root.
//
// IMPORTANT: Colyseus Cloud runs `colyseus-post-deploy` which triggers the
// `@colyseus/tools` PM2 module. That module **overwrites** `cwd` to the repo
// root when starting your app.
//
// Therefore:
// - `script` must be a path relative to the repository root.
// - any preloaded runtime (e.g. `node_args: --import tsx`) must be resolvable
//   from the repository root `node_modules/`.

module.exports = {
  apps: [
    {
      // Keep a stable PM2 app name so Colyseus Cloud's post-deploy can reliably
      // reload/replace the already-running process.
      name: "partyline",
      // Run TypeScript directly (tsx loader).
      script: "packages/server/src/index.ts",
      interpreter: "node",
      node_args: "--import tsx",
      time: true,
      watch: false,
      instances: 1,
      exec_mode: "fork",
      wait_ready: true,
      // tsx JIT-compiles all TypeScript on first start; on a constrained cloud
      // VM this can take 20-40 s. The PM2 default (3 s) is far too short.
      // Give us more headroom for cold starts and rolling restarts.
      listen_timeout: 180000,
      // Align with server shutdown timeout (packages/server/src/index.ts forces exit after 15s).
      kill_timeout: 20000,
      env: {
        NODE_ENV: "production",
        // When running through `node --import tsx` from the repo root, tsx
        // won't automatically find the package tsconfig. Without it, decorators
        // are compiled using the new proposal semantics and Colyseus schema
        // decorators (`@type()`) crash at runtime.
        TSX_TSCONFIG_PATH: "packages/server/tsconfig.json",
      },
    },
  ],
};
