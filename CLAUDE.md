# FLIMFLAM — AI Party Games Platform

## Project Overview

FLIMFLAM is a Jackbox-style multiplayer party game platform where one person hosts on a shared screen and players join from their phones via room code. It ships with a compilation of games, some AI-powered (via Claude API), some not. All games support scaling complexity (Kids / Standard / Advanced).

## Architecture

**Monorepo with Turborepo + pnpm workspaces**

```
flimflam/
├── apps/
│   ├── host/          # Next.js 15 — the shared screen display
│   └── controller/    # Next.js 15 — the phone PWA (mobile-first)
├── packages/
│   ├── server/        # Colyseus game server (THE core)
│   ├── shared/        # Shared TypeScript types, constants, utils
│   ├── ui/            # Shared UI components (shadcn/ui + Tailwind)
│   ├── game-engine/   # GamePlugin interface + base classes
│   └── ai/            # Claude API wrapper, prompt templates, response parsing
├── games/
│   ├── world-builder/ # AI-heavy: collaborative story game
│   ├── bluff-engine/  # Medium AI: lie detection game
│   ├── quick-draw/    # No AI: drawing/guessing game
│   ├── reality-drift/ # Light AI: trivia with drift
│   └── hot-take/      # No AI: opinion/debate game
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── biome.json
└── CLAUDE.md          # (this file)
```

## Critical Technology Decisions

### Colyseus (NOT raw Socket.IO)
We use **Colyseus** (`colyseus` npm package) as our multiplayer framework. Colyseus provides:
- Built-in room management with automatic state synchronization
- Schema-based state (encoded incrementally, very efficient)
- Built-in matchmaking, reconnection, room lifecycle hooks
- Monitor panel at `/colyseus` for debugging
- Client SDK (`colyseus.js`) for both host and controller apps

**DO NOT** use raw Socket.IO, ws, or any other WebSocket library directly.

### Key Colyseus Patterns
```typescript
// Server: Define rooms with Schema decorators
import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";

class Player extends Schema {
  @type("string") name: string = "";
  @type("number") score: number = 0;
  @type("boolean") ready: boolean = false;
}

class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") phase: string = "lobby";
  @type("number") round: number = 0;
}

// Client: Connect and listen
import { Client } from "colyseus.js";
const client = new Client("ws://localhost:2567");
const room = await client.joinOrCreate("party", { name: "Walker" });
room.state.listen("phase", (value) => { /* react to phase changes */ });
room.state.players.onAdd((player, key) => { /* new player joined */ });
```

### Room Code System
4-character alphanumeric codes stored in room metadata for join flow:
```typescript
const code = generateRoomCode(); // e.g., "AXKM"
this.setMetadata({ code, gameName: "lobby" });
// Players lookup by code via getAvailableRooms
```

### Next.js 15 (App Router)
Both `apps/host` and `apps/controller` use Next.js 15 with App Router. The controller app is a PWA.

### Styling: Tailwind CSS 4 + shadcn/ui
Tailwind CSS 4 uses CSS-first config: `@import "tailwindcss"`, `@theme inline {}`, NO `tailwind.config.js`.

### AI Integration: Anthropic SDK
```typescript
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
// All AI calls go through packages/ai/
// Always request JSON output, always parse with zod
// Always handle timeouts (10s default, retry once)
```

### Testing Stack
- **Vitest** — Unit tests for game logic, AI prompt parsing, scoring
- **Playwright** — E2E tests for join flow, game phases

### Linting & Formatting
- **Biome** — Single tool for linting AND formatting
- Config lives in `biome.json` at project root

## Coding Standards

- TypeScript strict mode everywhere
- Zod for all runtime validation (AI responses, player input, room options)
- No `any` types — use `unknown` and narrow
- All game logic lives in `games/` as GamePlugin implementations
- All AI prompts are template functions in `packages/ai/prompts/`
- Prefer `const` over `let`, never use `var`
- Use barrel exports (`index.ts`) in each package

## Complexity Scaling System

| Aspect           | Kids (8+)     | Standard (13+) | Advanced (16+) |
|------------------|---------------|-----------------|-----------------|
| Timer multiplier | 1.5x          | 1.0x            | 0.75x           |
| Round count      | 3             | 5               | 7               |
| AI tone          | Silly, safe   | Balanced        | Strategic       |
| Social deduction | None          | Light           | Heavy           |

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...        # Required for AI games
NEXT_PUBLIC_COLYSEUS_URL=ws://localhost:2567
NEXT_PUBLIC_HOST_URL=http://localhost:3000
NEXT_PUBLIC_CONTROLLER_URL=http://localhost:3001
NODE_ENV=development
```

## Commands

```bash
pnpm dev           # Start all apps + server in parallel
pnpm build         # Build everything
pnpm test          # Run all Vitest tests
pnpm test:e2e      # Run Playwright E2E tests
pnpm lint          # Biome check
pnpm lint:fix      # Biome check --write
pnpm typecheck     # tsc --noEmit across all packages
```

## Important Notes for AI Agents

- The Colyseus server runs on port 2567 by default
- The host app runs on port 3000
- The controller app runs on port 3001
- When adding a new game, create it in `games/[name]/` and register it in `packages/server/src/rooms/GameRegistry.ts`
- AI prompts must always request JSON-only output
- All AI responses must be validated with Zod schemas before use
- The host screen should be readable from 10+ feet away — large fonts, high contrast
- The controller must be thumb-friendly — 48px minimum touch targets
- tsconfig.base.json MUST set `experimentalDecorators: true` and `useDefineForClassFields: false` for Colyseus `@type()` decorators
