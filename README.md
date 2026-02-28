# PARTYLINE

Jackbox-style multiplayer party game platform.

- Host screen: `apps/host` (Next.js)
- Phone controller: `apps/controller` (Next.js PWA)
- Multiplayer server: `packages/server` (Colyseus)
- Game plugins: `games/*`

## Prerequisites

- Node.js 24+
- pnpm

## Setup

```bash
pnpm install
```

Optional (AI games):

- Copy `.env.example` to `.env`
- Set `ANTHROPIC_API_KEY=...`

## Development

```bash
pnpm dev
```

Services:

- Server: `http://localhost:2567/health`
- Host: `http://localhost:3000`
- Controller: `http://localhost:3001`

## Production Build

```bash
pnpm build
```

## Quality

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## E2E (Playwright)

First-time setup (downloads Chromium):

```bash
pnpm exec playwright install chromium
```

Run:

```bash
pnpm test:e2e
```

## Runtime Protocol

Server -> host:

- `game-data`: `{ gameId, phase, round, totalRounds, payload }`

Server -> controller:

- `private-data`: per-player secrets / options (roles, words, vote options, outcomes)

Host -> server:

- `host:select-game`, `host:set-complexity`, `host:start-game`, `host:skip`, `host:end-game`

Controller -> server:

- `player:ready`, `player:submit`, `player:vote`, `player:draw-stroke`, `player:use-ability`

## Adding A Game

1. Add game package under `games/<game-id>/` implementing a `GamePlugin`.
2. Add the manifest entry to `packages/shared/src/constants.ts`.
3. Register the factory in `packages/server/src/register-games.ts`.
4. Add host view in `apps/host/src/components/games/`.
5. Add controller inputs in `apps/controller/src/components/game/GameController.tsx`.
6. Add unit tests under `games/<game-id>/src/__tests__/`.

## Timer Scaling (Dev/E2E)

Set `PARTYLINE_TIMER_SCALE` (default `1`) to speed up timers:

```bash
set PARTYLINE_TIMER_SCALE=0.05
pnpm dev
```

