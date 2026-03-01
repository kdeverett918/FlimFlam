# PARTYLINE — Production Deployment Plan (Render + Colyseus Cloud)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Render                                                      │
│  ┌─────────────────────┐  ┌─────────────────────────────┐  │
│  │  partyline-host     │  │  partyline-controller       │  │
│  │  (TV screen)        │  │  (phone PWA)                │  │
│  │  apps/host          │  │  apps/controller            │  │
│  │  Node 22 (Starter)  │  │  Node 22 (Starter)          │  │
│  └──────────┬──────────┘  └─────────────┬───────────────┘  │
└─────────────┼───────────────────────────┼───────────────────┘
              │ wss://                     │ wss://
              └──────────┬────────────────┘
                         ▼
              ┌──────────────────────────┐
              │  Colyseus Cloud          │
              │  us-dfw-baad7ee4         │
              │  packages/server         │
              └──────────────────────────┘
```

## Production URLs (Stable If Service Names Match)

- Controller: `https://partyline-controller.onrender.com`
- Host: `https://partyline-host.onrender.com`
- Colyseus (WS): `wss://us-dfw-baad7ee4.colyseus.cloud`
- Colyseus (health): `https://us-dfw-baad7ee4.colyseus.cloud/health`

## What This Repo Already Contains

- [`render.yaml`](../render.yaml) at repo root: Render Blueprint definition for both services.
- `apps/host/.env.production` and `apps/controller/.env.production`: baked `NEXT_PUBLIC_*` runtime config.
- `apps/*/next.config.ts`: production env validation (warn by default; fail with `PARTYLINE_STRICT_ENV=1`).
- `apps/controller/public/icon.svg` plus generated `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`.
- Playwright production configs:
  - `playwright.production.config.ts`: local host/controller talking to prod Colyseus (backend-only validation).
  - `playwright.production.remote.config.ts`: full prod (Render host + Render controller + prod Colyseus).

## One-Time Setup

### 1. Create the Render services from `render.yaml`

Render services are not created automatically just because `render.yaml` exists in git. You must create them once.

1. Render Dashboard: New → Blueprint.
1. Connect GitHub repo `kdeverett918/partyline`, branch `main`.
1. Ensure the service names are exactly:
   - `partyline-controller`
   - `partyline-host`

Those names lock in the stable `*.onrender.com` URLs used by the host QR code.

### 2. Set `ANTHROPIC_API_KEY` in Colyseus Cloud

In the Colyseus Cloud dashboard (Environment Variables), set:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Reference: `deploy/colyseus-cloud-env.txt`.

Without this, World Builder and Reality Drift will not function correctly.

## Deploy / Updates

- Once the Blueprint exists, pushes to `main` auto-deploy the Render services.
- `buildFilter.paths` in `render.yaml` ensures only the affected service rebuilds.

## Post-Deploy Verification

```bash
# Backend
curl https://us-dfw-baad7ee4.colyseus.cloud/health

# Frontends
curl https://partyline-controller.onrender.com/
curl https://partyline-host.onrender.com/

# Full production E2E (Render host/controller → production Colyseus)
npx playwright test --config playwright.production.remote.config.ts
```

## Notes

- If you change Render service names or use custom domains, update:
  - `apps/host/.env.production` (`NEXT_PUBLIC_CONTROLLER_URL`)
- Render CLI v2.7+ can validate `render.yaml`, but Blueprint creation is done via the dashboard.
