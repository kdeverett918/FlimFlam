# FLIMFLAM — Claude Code Agent Teams Build Prompt

## How to Use This Document

This document contains everything you need to scaffold and build FLIMFLAM using Claude Code with Agent Teams (Opus 4.6). It has three sections:

1. **Setup Instructions** — Run these commands BEFORE starting Claude Code
2. **CLAUDE.md** — Copy this file into your project root for all agents to read
3. **The Prompt** — Paste this into Claude Code to deploy the agent team

---

## PART 1: Setup Instructions

### Prerequisites

```bash
# Ensure Claude Code is up to date
claude update

# Enable Agent Teams (experimental)
claude config set experimental_agent_teams true
# OR add to your settings.json:
# "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": true

# Verify you're on Opus 4.6
claude config set model claude-opus-4-6
```

### Recommended MCP Servers

Install these before starting the build for maximum productivity:

```bash
# GitHub MCP — PR management, issue tracking, CI/CD
claude mcp add --scope user github npx -y @modelcontextprotocol/server-github
# (Set GITHUB_PERSONAL_ACCESS_TOKEN in your env)

# Playwright MCP — Browser testing, E2E automation
claude mcp add --scope project playwright npx -y @anthropic-ai/mcp-playwright

# Sequential Thinking MCP — Better architectural reasoning
claude mcp add --scope user sequential-thinking npx -y @anthropic-ai/mcp-sequential-thinking
```

### Create the Project Directory

```bash
mkdir flimflam && cd flimflam
git init
```

### Copy the CLAUDE.md below into your project root, then paste the prompt.

---

## PART 2: CLAUDE.md

Save the following as `CLAUDE.md` in your project root. Every agent (lead + teammates) will read this automatically.

```markdown
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
We use **Colyseus** (`colyseus` npm package) as our multiplayer framework. This is non-negotiable. Colyseus provides:
- Built-in room management with automatic state synchronization
- Schema-based state (encoded incrementally, very efficient)
- Built-in matchmaking, reconnection, room lifecycle hooks
- Monitor panel at `/colyseus` for debugging
- Client SDK (`colyseus.js`) for both host and controller apps

**DO NOT** use raw Socket.IO, ws, or any other WebSocket library directly. Colyseus handles all of this.

### Key Colyseus Patterns
```typescript
// Server: Define rooms
import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";

// State is defined with Schema decorators
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

class PartyRoom extends Room<GameState> {
  maxClients = 8;
  
  onCreate(options: any) {
    this.setState(new GameState());
    // Register message handlers
    this.onMessage("action", (client, data) => { /* ... */ });
  }
  
  onJoin(client: Client, options: any) {
    const player = new Player();
    player.name = options.name;
    this.state.players.set(client.sessionId, player);
  }
}

// Client: Connect and listen
import { Client } from "colyseus.js";
const client = new Client("ws://localhost:2567");
const room = await client.joinOrCreate("party", { name: "Walker" });

room.state.listen("phase", (value) => { /* react to phase changes */ });
room.state.players.onAdd((player, key) => { /* new player joined */ });
```

### Room Code System
Colyseus uses room IDs internally. We generate a 4-character alphanumeric code stored in room metadata for the Jackbox-style join flow:
```typescript
// On room create, generate code and set as metadata
const code = generateRoomCode(); // e.g., "AXKM"
this.setMetadata({ code, gameName: "lobby" });

// Players join by code via a custom lookup
const rooms = await matchmaker.query({ metadata: { code } });
```

### Next.js 15 (App Router)
Both `apps/host` and `apps/controller` use Next.js 15 with App Router. The controller app must be configured as a PWA.

### Styling: Tailwind CSS 4 + shadcn/ui
Use Tailwind CSS 4 (the new CSS-first config) and shadcn/ui components. The shared `packages/ui` package exports components used by both apps.

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
- **Colyseus Loadtest** — Built-in load testing for rooms

### Linting & Formatting
- **Biome** — Single tool for linting AND formatting (replaces ESLint + Prettier)
- Config lives in `biome.json` at project root
- All agents must run `pnpm biome check --write` before committing

## Coding Standards

- TypeScript strict mode everywhere
- Zod for all runtime validation (AI responses, player input, room options)
- No `any` types — use `unknown` and narrow
- All game logic lives in `games/` as GamePlugin implementations
- All AI prompts are template functions in `packages/ai/prompts/`
- Prefer `const` over `let`, never use `var`
- Use barrel exports (`index.ts`) in each package

## GamePlugin Interface

Every game implements this interface from `packages/game-engine`:

```typescript
interface GamePlugin {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  estimatedMinutes: number;
  aiRequired: boolean;
  
  // Colyseus Schema class for this game's state
  StateClass: typeof Schema;
  
  // Lifecycle hooks called by the room
  onGameStart(room: Room, settings: GameSettings): void;
  onPlayerMessage(room: Room, client: Client, type: string, data: any): void;
  onTick?(room: Room, deltaTime: number): void;
  isGameOver(state: Schema): boolean;
  getScores(state: Schema): Map<string, number>;
}
```

## Complexity Scaling System

All games read a `complexity` setting: `"kids" | "standard" | "advanced"`

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
- AI prompts must always request JSON-only output with a system message: "Respond in valid JSON only. No markdown, no backticks, no preamble."
- All AI responses must be validated with Zod schemas before use
- The host screen should be readable from 10+ feet away — large fonts, high contrast
- The controller must be thumb-friendly — 48px minimum touch targets
```

---

## PART 3: The Agent Teams Prompt

Paste this entire block into Claude Code after navigating to your `flimflam/` directory:

---

```
Create an agent team to build FLIMFLAM, a Jackbox-style AI party games platform. Read CLAUDE.md first — it contains the full architecture, tech decisions, and coding standards.

## Project Scaffold (Lead does this first)

Before spawning teammates, scaffold the monorepo:

1. Initialize Turborepo monorepo with pnpm workspaces
2. Create the directory structure from CLAUDE.md
3. Set up shared configs: tsconfig.base.json, biome.json, turbo.json
4. Install root dependencies: turborepo, typescript, biome
5. Create pnpm-workspace.yaml pointing to apps/*, packages/*, games/*
6. Create packages/shared with TypeScript types for:
   - GamePlugin interface
   - GameSettings (complexity, playerCount, etc.)
   - Room types (RoomState, Player)
   - Message types (all client↔server message schemas)
   - Zod schemas for AI response validation
7. Set up .env.example with all required env vars

## Agent Team — Spawn these 4 teammates:

### Teammate 1: "Server" — Colyseus Game Server
Own: packages/server/, packages/game-engine/, packages/ai/

Tasks:
1. Set up Colyseus server with Express in packages/server/
   - `npm create colyseus-app@latest` as starting point, then restructure
   - Configure with express, @colyseus/monitor
   - Create LobbyRoom that manages room codes (4-char alphanumeric)
   - Create PartyRoom that loads GamePlugin instances dynamically
   - Implement room code generation + lookup via metadata
   - Set maxClients=8, configure reconnection (10s allowance)

2. Build packages/game-engine/
   - GamePlugin interface (from CLAUDE.md)
   - GameRegistry (loads all games from games/ directory)
   - BaseGamePlugin abstract class with common helpers
   - Timer system (phase timers with complexity scaling)
   - Scoring engine (tracks points, bonuses, per-round breakdown)

3. Build packages/ai/
   - Anthropic SDK wrapper with retry logic + timeout (10s)
   - Request queue (max 1 concurrent per room)
   - JSON response parser with Zod validation
   - Prompt template system (template literal functions)
   - Cost tracking (estimate tokens per call)
   - Fallback responses for when API is down

4. Implement ALL 5 games as GamePlugin modules:

   games/world-builder/ — AI-heavy collaborative storytelling:
   - WorldBuilderState Schema: phase, worldState, players with roles, round tracking
   - Phases: generating → role-reveal → action-input → ai-narrating → narration-display → reveal → scores
   - AI prompts: scenario generation, round narration, bonus judging
   - Secret objectives + special abilities per player
   - Conversation history for AI context continuity across rounds
   - Complexity scaling: kids (cooperative, silly) → advanced (betrayal, social deduction)

   games/bluff-engine/ — Medium AI, Fibbage-style:
   - AI generates obscure prompt + real answer each round
   - Players submit fake answers from phones
   - All answers shuffled, players vote on which is real
   - Points: fool others (+100), spot truth (+200), get fooled (-50)
   - AI adapts difficulty based on group accuracy

   games/quick-draw/ — No AI, drawing/guessing:
   - Canvas drawing on phone (finger-draw)
   - Word bank JSON (500+ words, tiered by complexity)
   - One player draws, others type guesses
   - Points for speed of correct guess
   - Host screen shows drawing in real-time via state sync

   games/reality-drift/ — Light AI, trivia with lies:
   - AI generates trivia batches (pre-generate 3 rounds per API call)
   - Starts 100% real, progressively introduces false questions
   - Players answer trivia AND can call "DRIFT" on suspicious questions
   - Points: correct answer (+100), catch drift (+200), false drift call (-150)
   - AI targets topics the group is confident in

   games/hot-take/ — No AI, opinion game:
   - Large JSON bank of age-appropriate prompts (200+)
   - Players rate Strongly Agree ↔ Strongly Disagree on a slider
   - Points for matching majority OR for being lone wolf (alternates)
   - Prompts filtered by complexity level
   - Simple and fun palette cleanser between AI games

5. Write Vitest tests for ALL game logic:
   - State transitions (every phase change)
   - Scoring calculations
   - AI response parsing (with mock responses)
   - Timer expiry behavior
   - Edge cases: empty input, disconnect mid-round, all players same answer

### Teammate 2: "Host" — Host Display App (Next.js)
Own: apps/host/

Tasks:
1. Initialize Next.js 15 app with App Router, Tailwind CSS 4, TypeScript
2. Install colyseus.js client SDK
3. Install shared packages: @flimflam/shared, @flimflam/ui

4. Build pages:
   - / (home) — "Create Room" button, animated logo
   - /room/[code] — Main game screen (lobby → game → results)

5. Build host components:
   - LobbyScreen: giant room code display, QR code (use `qrcode` npm), player list with avatars/colors, game selector carousel, complexity picker, "Start Game" button
   - GameSelector: horizontal scroll of game cards with icons, descriptions, player count range, AI badge, estimated time
   - TypewriterText: animated text reveal for AI narration (char by char, variable speed)
   - Scoreboard: animated score updates, rank changes with transitions
   - Timer: large countdown, urgency colors (green → yellow → red)
   - PhaseTransition: full-screen animated transitions between game phases

6. Build game-specific host views:
   - WorldBuilderHost: setting reveal, action summary, narration display, role reveal sequence
   - BluffEngineHost: prompt display, answer grid, vote results, truth reveal
   - QuickDrawHost: real-time canvas mirror, guess feed, word reveal
   - RealityDriftHost: question display, drift alert animation, truth/lie reveal
   - HotTakeHost: prompt display, opinion spectrum visualization, majority reveal

7. Design system:
   - Dark theme with neon accents (see CLAUDE.md color palette)
   - Display font: "Dela Gothic One" or "Righteous" (Google Fonts)
   - Body font: "DM Sans" (Google Fonts)
   - All text readable from 10+ feet — minimum 24px body, 48px+ headings
   - CSS animations for all transitions (framer-motion for complex ones)
   - Sound effect hooks (optional, use Howler.js) for buzzer, reveal, score

8. Colyseus client integration:
   - useRoom() hook: connect, listen to state changes, send messages
   - Automatic reconnection handling
   - Loading states during AI generation phases
   - Error boundaries for disconnection

### Teammate 3: "Controller" — Phone Controller App (Next.js PWA)
Own: apps/controller/

Tasks:
1. Initialize Next.js 15 app, Tailwind CSS 4, TypeScript
2. Configure as PWA: next-pwa, manifest.json, service worker, meta viewport
3. Install colyseus.js, @flimflam/shared, @flimflam/ui

4. Build pages:
   - / — Join screen: room code input (4 large digit boxes), name input, avatar/color picker
   - /play — In-game controller (dynamic based on game phase)

5. Build controller components:
   - JoinForm: large touch targets, auto-uppercase room code, keyboard-friendly
   - TextInput: for action submissions (World Builder, Bluff Engine)
     - Character counter, max 140 chars
     - Keyboard doesn't block the input
   - VoteGrid: tap to select from multiple options, visual confirmation
   - DrawCanvas: HTML5 Canvas with touch events for Quick Draw
     - Color picker (6 preset colors), brush size toggle, undo, clear
     - Sends canvas data to server efficiently (throttled, delta-based if possible)
   - Slider: horizontal slider for Hot Take (Strongly Disagree → Strongly Agree)
   - RoleCard: displays secret role, objective, ability (World Builder)
   - AbilityButton: one-time-use special ability trigger
   - ScoreBadge: persistent footer showing current score + rank
   - TimerBar: thin progress bar at top, urgency pulse when low

6. Mobile-first design:
   - 48px minimum touch targets
   - Single-column layout, no horizontal scroll
   - Haptic feedback on submit (navigator.vibrate)
   - High contrast for bright room readability
   - Persistent score footer on every screen
   - Loading spinners during AI phases ("The story unfolds...")

7. PWA configuration:
   - manifest.json with app name, icons, theme color
   - Service worker for offline shell caching
   - "Add to Home Screen" prompt
   - Standalone display mode (no browser chrome)

### Teammate 4: "Quality" — Testing, Config, CI, Polish
Own: Root config, tests/, CI, shared packages

Tasks:
1. Configure Turborepo:
   - turbo.json with pipeline: dev, build, test, lint, typecheck
   - Proper dependency graph (server → game-engine → shared, etc.)
   - Development caching

2. Configure Biome:
   - biome.json with opinionated settings
   - Import sorting, consistent formatting
   - TypeScript-aware linting rules
   - Pre-commit hook via lefthook or husky

3. Set up Vitest:
   - vitest.config.ts at root with workspace config
   - Shared test utilities in packages/shared/test-utils
   - Mock factories for Colyseus Room, Client, AI responses
   - Coverage thresholds: 80% for game logic, 60% overall

4. Set up Playwright:
   - E2E tests for the critical user flow:
     a. Host creates room → code appears
     b. Player joins via code → appears on host screen
     c. Host starts game → both screens transition
     d. Player submits input → host reflects it
     e. Game completes → scores displayed
   - Test against local dev servers

5. Write comprehensive tests:
   - Unit tests for every GamePlugin (state transitions, scoring)
   - Unit tests for AI response parsing (valid JSON, malformed JSON, timeout)
   - Unit tests for room code generation (uniqueness, format)
   - Integration tests for Colyseus room lifecycle (create, join, leave, reconnect)
   - E2E tests for full game flow (at least World Builder + Quick Draw)

6. Build packages/ui/:
   - Shared button, input, card, badge, modal components
   - Tailwind-based, responsive, accessible
   - Used by both host and controller apps
   - Export from barrel index.ts

7. Documentation:
   - README.md at root with setup instructions
   - README.md in each game/ folder explaining the game
   - Type documentation for GamePlugin interface

## Coordination Notes

- Server teammate must publish packages/shared types FIRST — other teammates depend on these
- Host and Controller teammates can work in parallel once shared types exist
- Quality teammate should set up the monorepo scaffold early, then focus on tests
- All teammates: run `pnpm biome check --write` before marking tasks complete
- All teammates: ensure `pnpm typecheck` passes in your workspace

## Definition of Done

The project is complete when:
1. `pnpm dev` starts all 3 services (server:2567, host:3000, controller:3001)
2. A host can create a room and see a 4-character code
3. A phone can join by entering the code and a name
4. All 5 games are playable from lobby selection through final scores
5. World Builder generates unique AI scenarios and narrates rounds
6. Quick Draw works with real-time canvas sync
7. Complexity scaling changes timer length, round count, and AI tone
8. `pnpm test` passes with >80% coverage on game logic
9. `pnpm lint` and `pnpm typecheck` pass clean
10. The host screen looks polished and is readable from across a room
```

---

## Quick Reference: Key Packages

| Package | Purpose | Install |
|---------|---------|---------|
| `colyseus` | Multiplayer game server framework | `pnpm add colyseus` |
| `colyseus.js` | Client SDK for browser | `pnpm add colyseus.js` |
| `@colyseus/schema` | State synchronization schemas | `pnpm add @colyseus/schema` |
| `@colyseus/monitor` | Debug panel at /colyseus | `pnpm add @colyseus/monitor` |
| `@anthropic-ai/sdk` | Claude API client | `pnpm add @anthropic-ai/sdk` |
| `zod` | Runtime type validation | `pnpm add zod` |
| `next` | React framework (v15) | `pnpm add next react react-dom` |
| `tailwindcss` | Utility CSS (v4) | `pnpm add tailwindcss` |
| `@biomejs/biome` | Linter + formatter (replaces ESLint+Prettier) | `pnpm add -D @biomejs/biome` |
| `vitest` | Unit testing | `pnpm add -D vitest` |
| `playwright` | E2E testing | `pnpm add -D @playwright/test` |
| `qrcode` | QR code generation for room codes | `pnpm add qrcode` |
| `framer-motion` | Animation library for React | `pnpm add framer-motion` |
| `howler` | Sound effects (optional) | `pnpm add howler` |
| `next-pwa` | PWA support for Next.js | `pnpm add next-pwa` |
| `turborepo` | Monorepo build system | `pnpm add -D turbo` |

## Why Colyseus Over Raw Socket.IO

| Feature | Raw Socket.IO | Colyseus |
|---------|--------------|----------|
| Room management | Build yourself | Built-in with matchmaking |
| State synchronization | Manual event emission | Automatic, incremental, schema-based |
| Reconnection | Build yourself | Built-in with session tokens |
| Monitoring | Nothing | `/colyseus` debug panel |
| Client SDK | Bare events | Typed state listeners, room lifecycle |
| Scalability | Single process | Multi-process with Redis presence |
| Schema validation | Manual | Declarative with decorators |
| Bandwidth | Send full state | Binary delta encoding |
| Room codes / matchmaking | Build yourself | filterBy, metadata queries |
| Load testing | Build yourself | Built-in `npx colyseus-loadtest` |

Colyseus eliminates ~40% of the custom infrastructure we'd have to build with raw Socket.IO. The room lifecycle, state sync, and reconnection handling alone save days of development.
