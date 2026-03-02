# Local Development Setup

## Quick start (no AI features)

```bash
pnpm install
pnpm dev
```

- Host:       http://localhost:3000
- Controller: http://localhost:3001
- Server:     ws://localhost:2567

No environment variables needed — all defaults point to localhost.

## Enable AI features locally

Create `packages/server/.env.local` (gitignored):

```
ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE
```

Then start the dev server:

```bash
pnpm dev
```

AI games (World Builder, Bluff Engine, Reality Drift, Hot Take AI mode) will
now work. Without the key they fall back to static content or skip AI steps.

## Run E2E tests against local server

```bash
pnpm test:e2e
```

Builds all apps and starts local server + frontends automatically.
No env setup needed (AI is disabled for E2E: `FLIMFLAM_DISABLE_AI=1`).

## Run E2E tests against production Colyseus server

```bash
npx playwright test --config playwright.production.config.ts
```

Rebuilds Next.js apps pointed at `wss://us-dfw-baad7ee4.colyseus.cloud`,
starts local Next.js only (no local Colyseus server). AI still disabled.
