# PARTYLINE — Render Deployment Plan

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Render                                                      │
│  ┌─────────────────────┐  ┌─────────────────────────────┐  │
│  │  partyline-host     │  │  partyline-controller       │  │
│  │  (TV screen)        │  │  (phone PWA)                │  │
│  │  apps/host          │  │  apps/controller            │  │
│  │  Starter plan       │  │  Starter plan               │  │
│  └──────────┬──────────┘  └─────────────┬───────────────┘  │
└─────────────┼───────────────────────────┼───────────────────┘
              │ wss://                     │ wss://
              └──────────┬────────────────┘
                         ▼
              ┌─────────────────────┐
              │  Colyseus Cloud     │
              │  us-dfw-baad7ee4    │
              │  packages/server    │
              │  (already live ✅)  │
              └─────────────────────┘
```

**Fixed URLs (service names are predictable on Render):**
- Controller: `https://partyline-controller.onrender.com`
- Host:        `https://partyline-host.onrender.com`
- Colyseus:    `wss://us-dfw-baad7ee4.colyseus.cloud` (already deployed)

---

## What's Already Done ✅

- `apps/host/.env.production` — committed, baked into host build automatically
- `apps/controller/.env.production` — committed, baked into controller build automatically
- `deploy/colyseus-cloud-env.txt` — reference for what to paste into Colyseus Cloud dashboard
- `deploy/local-dev-setup.md` — local dev instructions
- `playwright.production.config.ts` — E2E against production Colyseus
- Production health + matchmake + all 5 games E2E tested ✅

---

## Changes Required (6 items)

### 1. Fix start scripts — remove hardcoded ports

Render injects `$PORT` (default 10000). `next start` reads it automatically,
but only if `--port` is not hardcoded.

**`apps/host/package.json`** — change:
```json
"start": "next start"
```

**`apps/controller/package.json`** — change:
```json
"start": "next start"
```

(Local `pnpm dev` is unaffected — uses `next dev` via turbo, not the start script.)

---

### 2. Add build-time env validation to next.config.ts

**`apps/host/next.config.ts`:**
```ts
import type { NextConfig } from "next";

function validateEnv() {
  if (process.env.NODE_ENV !== "production") return;

  const colyseusUrl = process.env.NEXT_PUBLIC_COLYSEUS_URL;
  const controllerUrl = process.env.NEXT_PUBLIC_CONTROLLER_URL;
  const errors: string[] = [];

  if (!colyseusUrl || /localhost|127\.0\.0\.1/.test(colyseusUrl)) {
    errors.push(
      `NEXT_PUBLIC_COLYSEUS_URL is ${colyseusUrl ? `"${colyseusUrl}" (localhost)` : "missing"}. ` +
        "Set it to the production Colyseus endpoint.",
    );
  }
  if (!controllerUrl || /localhost|127\.0\.0\.1/.test(controllerUrl)) {
    errors.push(
      `NEXT_PUBLIC_CONTROLLER_URL is ${controllerUrl ? `"${controllerUrl}" (localhost)` : "missing"}. ` +
        "Set it to the deployed controller URL.",
    );
  }

  if (errors.length > 0) {
    const msg = [
      "",
      "=".repeat(70),
      " PARTYLINE — Missing production environment variables",
      "=".repeat(70),
      ...errors.map((e) => `  * ${e}`),
      "=".repeat(70),
      "",
    ].join("\n");
    if (process.env.PARTYLINE_STRICT_ENV === "1") throw new Error(msg);
    console.warn(msg);
  }
}

validateEnv();

const nextConfig: NextConfig = {
  transpilePackages: ["@partyline/shared", "@partyline/ui"],
};

export default nextConfig;
```

**`apps/controller/next.config.ts`:**
```ts
import type { NextConfig } from "next";

function validateEnv() {
  if (process.env.NODE_ENV !== "production") return;

  const colyseusUrl = process.env.NEXT_PUBLIC_COLYSEUS_URL;

  if (!colyseusUrl || /localhost|127\.0\.0\.1/.test(colyseusUrl)) {
    const msg = [
      "",
      "=".repeat(70),
      " PARTYLINE — Missing production environment variable",
      "=".repeat(70),
      `  * NEXT_PUBLIC_COLYSEUS_URL is ${colyseusUrl ? `"${colyseusUrl}" (localhost)` : "missing"}.`,
      "    Set it to the production Colyseus endpoint.",
      "=".repeat(70),
      "",
    ].join("\n");
    if (process.env.PARTYLINE_STRICT_ENV === "1") throw new Error(msg);
    console.warn(msg);
  }
}

validateEnv();

const nextConfig: NextConfig = {
  transpilePackages: ["@partyline/shared", "@partyline/ui"],
};

export default nextConfig;
```

Note: Warn-only by default so E2E tests (`NODE_ENV=production` + localhost URLs) still pass.
Set `PARTYLINE_STRICT_ENV=1` in CI `build` job to make it a hard failure there.

---

### 3. Create render.yaml

```yaml
# Render Infrastructure — PARTYLINE Frontend Services
# Colyseus game server lives on Colyseus Cloud (not here).
#
# Service URLs (set by chosen service names):
#   Controller: https://partyline-controller.onrender.com
#   Host:       https://partyline-host.onrender.com
#
# NEXT_PUBLIC_* env vars are baked in at build time via apps/*/. env.production
# files committed to the repo — no manual env config needed in Render dashboard.

services:
  # ── Controller (phone PWA) — deploy first ──────────────────────────────────
  - type: web
    name: partyline-controller
    runtime: node
    region: oregon
    plan: starter
    buildCommand: >-
      corepack enable &&
      pnpm install --frozen-lockfile &&
      pnpm turbo build --filter=@partyline/controller...
    startCommand: cd apps/controller && npx next start
    healthCheckPath: /
    envVars:
      - key: NODE_VERSION
        value: "22"
      - key: NODE_ENV
        value: production
    buildFilter:
      paths:
        - apps/controller/**
        - packages/shared/**
        - packages/ui/**
        - package.json
        - pnpm-lock.yaml
        - turbo.json

  # ── Host (TV / shared screen) ───────────────────────────────────────────────
  - type: web
    name: partyline-host
    runtime: node
    region: oregon
    plan: starter
    buildCommand: >-
      corepack enable &&
      pnpm install --frozen-lockfile &&
      pnpm turbo build --filter=@partyline/host...
    startCommand: cd apps/host && npx next start
    healthCheckPath: /
    envVars:
      - key: NODE_VERSION
        value: "22"
      - key: NODE_ENV
        value: production
    buildFilter:
      paths:
        - apps/host/**
        - packages/shared/**
        - packages/ui/**
        - package.json
        - pnpm-lock.yaml
        - turbo.json
```

---

### 4. Generate PWA icons

Save this SVG as `apps/controller/public/icon.svg`, then run the generation script.

**SVG source** (`apps/controller/public/icon.svg`):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <filter id="glow-blue" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur"/>
      <feColorMatrix in="blur" type="matrix"
        values="0 0 0 0 0.4  0 0 0 0 0.6  0 0 0 0 1  0 0 0 0.7 0" result="colored"/>
      <feMerge><feMergeNode in="colored"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glow-pink" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
      <feColorMatrix in="blur" type="matrix"
        values="0 0 0 0 0.88  0 0 0 0 0.41  0 0 0 0 0.85  0 0 0 0.6 0" result="colored"/>
      <feMerge><feMergeNode in="colored"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <radialGradient id="bg" cx="50%" cy="45%" r="70%">
      <stop offset="0%" stop-color="#09122a"/>
      <stop offset="100%" stop-color="#010105"/>
    </radialGradient>
    <linearGradient id="bolt" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6698ff"/>
      <stop offset="50%" stop-color="#a07cff"/>
      <stop offset="100%" stop-color="#e068d8"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="108" ry="108" fill="url(#bg)"/>
  <g opacity="0.06" stroke="#6698ff" stroke-width="1">
    <line x1="0" y1="128" x2="512" y2="128"/><line x1="0" y1="256" x2="512" y2="256"/>
    <line x1="0" y1="384" x2="512" y2="384"/><line x1="128" y1="0" x2="128" y2="512"/>
    <line x1="256" y1="0" x2="256" y2="512"/><line x1="384" y1="0" x2="384" y2="512"/>
  </g>
  <circle cx="256" cy="256" r="180" fill="none" stroke="#6698ff" stroke-width="2" opacity="0.15"/>
  <g filter="url(#glow-blue)">
    <path d="M175 100 L200 100 L185 230 L210 230 L180 420 L195 280 L170 280 Z"
          fill="url(#bolt)" opacity="0.95"/>
    <path d="M200 100 L320 100 Q380 100 380 170 Q380 240 320 240 L210 240 L210 230
             L315 230 Q365 230 365 170 Q365 115 315 115 L200 115 Z"
          fill="url(#bolt)" opacity="0.95"/>
  </g>
  <g filter="url(#glow-pink)">
    <polygon points="340,140 355,165 345,165 360,195 340,170 350,170" fill="#e068d8" opacity="0.7"/>
  </g>
  <circle cx="120" cy="140" r="4" fill="#e1a200" opacity="0.6"/>
  <circle cx="400" cy="120" r="3" fill="#00cacb" opacity="0.5"/>
  <circle cx="390" cy="380" r="5" fill="#30bd44" opacity="0.4"/>
  <circle cx="130" cy="400" r="3" fill="#ff2335" opacity="0.5"/>
</svg>
```

**Generation script** (`scripts/generate-icons.mjs`):
Uses `pngjs` (already in node_modules via Playwright deps) as fallback since
sharp is not installed. Generates `icon-192.png`, `icon-512.png`, and
`apple-touch-icon.png`.

---

### 5. Add apple-touch-icon to controller layout metadata

In `apps/controller/src/app/layout.tsx`, add to the `metadata` export:
```ts
icons: {
  apple: "/apple-touch-icon.png",
  icon: "/icon-192.png",
},
```

---

### 6. Set ANTHROPIC_API_KEY in Colyseus Cloud

Go to Colyseus Cloud dashboard → your app → Environment Variables.
Paste exactly:
```
ANTHROPIC_API_KEY=sk-ant-YOUR_REAL_KEY
```

Reference: `deploy/colyseus-cloud-env.txt`

Without this, World Builder and Reality Drift crash; Bluff Engine degrades to
one hardcoded question. Quick Draw and Hot Take (static mode) are unaffected.

---

## Deploy Steps

### First deploy (order matters — controller first)

```bash
# 1. Ensure render.yaml is at repo root and pushed to GitHub
git add render.yaml apps/host/.env.production apps/controller/.env.production \
        apps/host/package.json apps/controller/package.json \
        apps/host/next.config.ts apps/controller/next.config.ts \
        apps/controller/public/ scripts/generate-icons.mjs deploy/
git commit -m "chore: add Render deployment config and production env"
git push origin main

# 2. Connect GitHub repo to Render (one-time, via Render dashboard)
#    Dashboard → New → Blueprint → connect kdeverett918/partyline
#    Render reads render.yaml and creates both services automatically.

# 3. OR deploy via Render CLI:
render blueprint launch
# Follow prompts — it reads render.yaml from the repo root.

# 4. Set ANTHROPIC_API_KEY in Colyseus Cloud dashboard (see deploy/colyseus-cloud-env.txt)
```

### Subsequent deploys (automatic)

Once connected, every push to `main` auto-deploys both services.
`buildFilter.paths` means only relevant services rebuild on each push
(e.g., changing `apps/host/` only triggers host rebuild, not controller).

---

## Post-Deploy Verification

```bash
# Game server (already live)
curl https://us-dfw-baad7ee4.colyseus.cloud/health

# Controller
curl https://partyline-controller.onrender.com/

# Host
curl https://partyline-host.onrender.com/

# Full production E2E (local Next.js → production Colyseus)
npx playwright test --config playwright.production.config.ts
```

---

## Env File Summary

| File | Location | Auto-loaded by | Manual action |
|------|----------|----------------|---------------|
| `apps/host/.env.production` | Committed | `next build` in production | None |
| `apps/controller/.env.production` | Committed | `next build` in production | None |
| `deploy/colyseus-cloud-env.txt` | Reference only | N/A | Paste into Colyseus Cloud dashboard |
| `.env.example` | Committed | N/A | Reference for local dev setup |

**Render dashboard needs zero manual env var config** — everything is in the
committed `.env.production` files. Only `ANTHROPIC_API_KEY` requires manual
entry (Colyseus Cloud dashboard only; never committed to git).

---

## Notes on Merge vs Keep Separate

Research recommends a future merge of host + controller into a single Next.js
app (`apps/partyline`) to eliminate the `NEXT_PUBLIC_CONTROLLER_URL` build
dependency and reduce to one Render service. However:

- The `.env.production` approach already solves the URL problem cleanly
- Merging requires CSS animation conflict resolution, route restructuring,
  PWA scope scoping — meaningful refactoring with no player-visible benefit
- Recommended as a future improvement, not a blocker for launch

---

## Plan vs Future Improvements

**This plan (launch blockers):**
- [x] Env files configured
- [ ] Fix start scripts (remove --port)
- [ ] Add env validation to next.config.ts
- [ ] Create render.yaml
- [ ] Generate PWA icons
- [ ] Add apple-touch-icon to controller layout
- [ ] Deploy both services to Render
- [ ] Set ANTHROPIC_API_KEY in Colyseus Cloud

**Future (post-launch):**
- Fix service worker: exclude /api from cache, add cache size limits
- Add offline fallback page to controller
- Merge host + controller into single app
- Add PARTYLINE_STRICT_ENV=1 to CI build job
- Add host app public/ directory with favicon
