# 🎮 FLIMFLAM — AI Party Games Platform

## Full Technical Specification v1.0

---

## Table of Contents

1. [Platform Vision](#1-platform-vision)
2. [Platform Architecture](#2-platform-architecture)
3. [Core Infrastructure — The Lobby System](#3-core-infrastructure--the-lobby-system)
4. [Game 1: WORLD BUILDER (Flagship — Full Spec)](#4-game-1-world-builder)
5. [Game Compilation — Other Game Slots](#5-game-compilation--other-game-slots)
6. [Scaling Complexity System](#6-scaling-complexity-system)
7. [UI/UX Design System](#7-uiux-design-system)
8. [API & AI Integration Layer](#8-api--ai-integration-layer)
9. [Deployment & Hosting](#9-deployment--hosting)
10. [Build Order for Claude Code](#10-build-order-for-claude-code)

---

## 1. Platform Vision

**FLIMFLAM** is a Jackbox-style party game platform — a compilation of games playable on any device via browser. One person hosts on a shared screen (TV/laptop), everyone else joins from their phones by entering a room code.

### Core Principles

- **All ages, scaling complexity.** A 10-year-old and a 30-year-old can play the same game. Complexity scales UP based on group settings, not down from a default adult experience.
- **AI where it matters.** Not every game needs to be AI-heavy. Some games use AI as the engine (World Builder). Others use it lightly (dynamic prompt generation). Some don't use it at all (pure social deduction). The AI is a tool, not a gimmick.
- **Never the same twice.** Even games without AI should have enough randomization, procedural generation, and player-driven chaos that no two sessions feel identical.
- **Zero install.** Browser-only. PWA-capable for phone controllers. No app store.

### Platform Name Options (pick one)

- **FLIMFLAM** (recommended — implies connection + communication)
- **LIVEWIRE**
- **WAVELENGTH**
- **SIGNAL**

---

## 2. Platform Architecture

### Tech Stack

```
Frontend (Host Display):    Next.js 14+ (React) / Tailwind CSS
Frontend (Phone Controller): React PWA (lightweight, mobile-first)
Backend/Server:             Node.js + Express
Real-time:                  Socket.IO (WebSocket with fallback)
AI Layer:                   Anthropic Claude API (claude-sonnet-4-5-20250929)
Database:                   Redis (game state, sessions) + SQLite (optional persistence)
Hosting:                    Vercel (frontend) + Railway/Fly.io (WebSocket server)
```

### System Diagram

```
┌──────────────────────────────────────────────────────────┐
│                      HOST DEVICE                         │
│              (TV / Laptop / Projector)                    │
│                                                          │
│   ┌─────────────────────────────────────────────┐        │
│   │          HOST DISPLAY (Next.js)              │        │
│   │  - Game visuals, narration, scoreboard       │        │
│   │  - Lobby screen with room code               │        │
│   │  - Animations, transitions, AI output        │        │
│   └──────────────────┬──────────────────────────┘        │
│                      │ Socket.IO                         │
└──────────────────────┼───────────────────────────────────┘
                       │
              ┌────────┴────────┐
              │   GAME SERVER   │
              │   (Node.js)     │
              │                 │
              │  - Room manager │
              │  - Game state   │
              │  - Turn logic   │
              │  - AI calls     │
              │  - Score engine │
              └────────┬────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
    ┌────┴────┐   ┌────┴────┐   ┌────┴────┐
    │ Phone 1 │   │ Phone 2 │   │ Phone 3 │   ... up to 8 players
    │ (PWA)   │   │ (PWA)   │   │ (PWA)   │
    │         │   │         │   │         │
    │ Input   │   │ Input   │   │ Input   │
    │ Submit  │   │ Submit  │   │ Submit  │
    │ Vote    │   │ Vote    │   │ Vote    │
    └─────────┘   └─────────┘   └─────────┘
```

---

## 3. Core Infrastructure — The Lobby System

This is the **reusable foundation** that every game plugs into. Build this FIRST.

### 3.1 Room Creation & Join Flow

**Host flow:**
1. Host opens `flimflam.app` on shared screen
2. Clicks "Create Room"
3. Server generates a 4-character alphanumeric room code (e.g., `AXKM`)
4. Host screen shows the code prominently + a QR code that links to `flimflam.app/join?code=AXKM`
5. Host sees players appear as they join
6. Host selects a game from the compilation menu
7. Host sets complexity level (Kids / Standard / Advanced)
8. Host clicks "Start Game"

**Player flow:**
1. Player opens `flimflam.app` on phone
2. Enters room code
3. Enters display name (max 12 characters)
4. Optionally picks an avatar/color from a preset grid
5. Sees "Waiting for host to start..." with a list of who's in the room
6. Game begins — phone becomes the controller

### 3.2 Server-Side Room Manager

```
RoomManager
├── createRoom() → { roomCode, hostSocketId }
├── joinRoom(code, playerName) → { playerId, playerList }
├── startGame(roomCode, gameId, settings) → void
├── getRoom(roomCode) → RoomState
├── removePlayer(roomCode, playerId) → void
├── destroyRoom(roomCode) → void
│
└── RoomState {
      roomCode: string
      hostId: string
      players: Player[]
      currentGame: GameInstance | null
      settings: {
        complexity: "kids" | "standard" | "advanced"
        maxPlayers: number (3-8)
        roundCount: number
      }
      createdAt: timestamp
      status: "lobby" | "in-game" | "between-games" | "finished"
    }
```

### 3.3 Socket Events (Shared Across All Games)

```
── Server → Host ──
room:created          { roomCode }
room:player-joined    { player }
room:player-left      { playerId }
game:state-update     { gameState }    // main game render data
game:phase-change     { phase, data }  // transitions between game phases
game:end              { scores, winner }

── Server → Player Phone ──
game:your-turn        { prompt, inputType, options, timeLimit }
game:wait             { message }
game:results          { roundResults }
game:scores           { scoreboard }

── Player Phone → Server ──
player:submit         { playerId, response }
player:vote           { playerId, voteFor }
player:ready          { playerId }

── Host → Server ──
host:start-game       { gameId, settings }
host:next-round       { }
host:skip             { }
host:end-game         { }
```

### 3.4 Game Plugin Interface

Every game is a module that implements this interface:

```typescript
interface GamePlugin {
  id: string;                          // "world-builder"
  name: string;                        // "World Builder"
  description: string;                 // shown in game select menu
  minPlayers: number;                  // 3
  maxPlayers: number;                  // 8
  estimatedMinutes: number;            // 15-25
  complexityLevels: ComplexityLevel[]; // which levels this game supports
  aiRequired: boolean;                 // does this game need API calls?
  tags: string[];                      // ["story", "creative", "ai"]

  // Lifecycle
  initialize(room: RoomState, settings: GameSettings): GameState;
  handlePlayerInput(gameState: GameState, playerId: string, input: any): GameState;
  handleVote(gameState: GameState, playerId: string, vote: any): GameState;
  advancePhase(gameState: GameState): GameState;
  getHostView(gameState: GameState): HostViewData;
  getPlayerView(gameState: GameState, playerId: string): PlayerViewData;
  isGameOver(gameState: GameState): boolean;
  getFinalScores(gameState: GameState): ScoreData;
}
```

---

## 4. Game 1: WORLD BUILDER

### Overview

**World Builder** is a collaborative/competitive storytelling game where the AI generates a living scenario and players submit actions that shape the narrative in real time. The AI acts as a dynamic game master — narrating consequences, introducing twists, and keeping the story moving.

Every player has a **secret objective** they're trying to accomplish. The fun comes from the emergent chaos of everyone pursuing hidden agendas simultaneously while the AI weaves it all together.

### 4.1 Game Flow (Per Session)

```
PHASE 1: SCENARIO SETUP        (10 seconds, AI generates)
PHASE 2: ROLE ASSIGNMENT        (15 seconds, players read roles)
PHASE 3: ACTION ROUNDS ×5      (45-60 sec each)
   ├── Players submit actions from phone
   ├── AI narrates results on host screen
   ├── World state updates
   └── New situation revealed
PHASE 4: FINAL ROUND            (60 sec, dramatic climax)
PHASE 5: REVEAL & SCORING       (show objectives, calculate scores)
```

**Total estimated time: 8-15 minutes per session**

### 4.2 Scenario Generation

At game start, the server sends a prompt to Claude to generate the scenario. The prompt adapts based on complexity level.

**AI Prompt Template — Scenario Generation:**

```
You are the game master for a multiplayer storytelling game.

Generate a scenario with the following structure. Respond ONLY in valid JSON.

Complexity level: {complexity}
Number of players: {playerCount}

{
  "setting": "A vivid 2-sentence description of the setting",
  "situation": "A 2-sentence description of the current crisis or situation",
  "world_state": {
    "location": "string",
    "time_pressure": "none | low | medium | high | critical",
    "key_resources": ["resource1", "resource2", "resource3"],
    "npcs": [
      { "name": "string", "role": "string", "disposition": "friendly | neutral | hostile" }
    ],
    "threats": ["threat1", "threat2"],
    "opportunities": ["opportunity1"]
  },
  "roles": [
    {
      "role_name": "The Captain",
      "public_identity": "What everyone knows about this role",
      "secret_objective": "What only this player knows they need to accomplish",
      "special_ability": "One unique action only this role can take",
      "scoring_criteria": "How points are earned for this role"
    }
    // ... one per player
  ],
  "tone": "comedic | dramatic | mysterious | absurd"
}

COMPLEXITY RULES:
- "kids": Simple setting (school, space station, zoo). Objectives are cooperative
  (save the animals, fix the ship). No deception. Everyone wins or loses together.
  Tone is always comedic or absurd. Abilities are simple and clear.

- "standard": Interesting setting with mild conflict. Some objectives may conflict.
  One role might have a secret twist (but nothing mean-spirited). Mix of cooperative
  and individual goals. Tone varies.

- "advanced": Complex setting with competing agendas. At least one hidden antagonist
  role. Objectives actively conflict. Alliances and betrayal are possible. Social
  deduction elements. Tone can be dramatic or mysterious.
```

**Example output (Standard complexity, 4 players):**

```json
{
  "setting": "A luxury cruise ship has run aground on an uncharted island in the Pacific. The ship is slowly taking on water and the radio is dead.",
  "situation": "Passengers have discovered an abandoned research facility on the island. Strange sounds come from deeper inside. The lifeboat fits everyone — but someone needs to stay behind to operate the winch.",
  "world_state": {
    "location": "Uncharted Pacific Island — Beached Cruise Ship",
    "time_pressure": "medium",
    "key_resources": ["emergency flare kit", "research facility generator", "lifeboat"],
    "npcs": [
      { "name": "Dr. Vasquez", "role": "Ship's doctor", "disposition": "friendly" },
      { "name": "The Captain", "role": "Unconscious in the medical bay", "disposition": "neutral" }
    ],
    "threats": ["rising water level", "unknown sounds from the facility"],
    "opportunities": ["the facility might have a working radio"]
  },
  "roles": [
    {
      "role_name": "The Engineer",
      "public_identity": "The ship's chief engineer — everyone's best hope for repairs",
      "secret_objective": "Get the facility's generator running. You recognized the research company's logo — they owe you a fortune.",
      "special_ability": "Can attempt to repair any broken mechanical system",
      "scoring_criteria": "+200 if generator is running by end. +100 if you escape the island. +50 for each system you repair."
    }
  ]
}
```

### 4.3 Action Round System

Each round follows this cycle:

```
1. HOST SCREEN shows current situation narrative + world state summary
2. PHONE SCREEN shows each player:
   - Their role name and secret objective (persistent)
   - The current situation (synced with host)
   - A text input: "What do you do?" (max 140 characters)
   - Their special ability as a button: "Use: [ability name]"
   - A 45-second countdown timer
3. All players submit simultaneously (or timer expires)
4. Server collects all actions
5. Server sends actions to AI for narration
6. AI returns narrated results + updated world state
7. HOST SCREEN displays narration (typewriter effect, dramatic)
8. Loop to next round
```

**AI Prompt Template — Round Narration:**

```
You are the game master. Here is the current game state:

SETTING: {setting}
CURRENT SITUATION: {currentSituation}
WORLD STATE: {JSON world_state}
ROUND: {roundNumber} of {totalRounds}

PLAYER ACTIONS THIS ROUND:
{for each player:}
- {player.publicRoleName}: "{player.submittedAction}"
  (Secret objective: {player.secretObjective})
  (Used special ability: {yes/no})

COMPLEXITY: {complexity}

Generate the round results. Respond ONLY in valid JSON:

{
  "narration": "A dramatic 3-5 sentence narration of what happens when all
    these actions play out simultaneously. Reference each player's action and
    its consequences. Create emergent interactions between actions. Use the
    players' role names, not their real names.",
  "world_state_updates": {
    "time_pressure": "updated level",
    "key_resources": ["updated list"],
    "npcs": [/* updated NPC states */],
    "threats": ["updated"],
    "opportunities": ["updated"],
    "new_developments": ["anything new that emerged from player actions"]
  },
  "player_outcomes": [
    {
      "role_name": "The Engineer",
      "outcome": "Brief description of what happened to this player specifically",
      "objective_progress": 0-100,
      "points_earned_this_round": number,
      "points_reason": "why they earned/lost points"
    }
  ],
  "next_situation": "2-sentence setup for the next round. End on a cliffhanger
    or decision point if possible.",
  "twist": null | "An optional dramatic twist the AI introduces (new threat,
    NPC betrayal, discovery). Use sparingly — max 1-2 per game."
}

NARRATION RULES:
- "kids": Keep it silly and fun. No one gets hurt. Consequences are goofy.
  Every action has SOME positive outcome. Encourage cooperation.
- "standard": Actions have real consequences. Some things can go wrong.
  Balance humor with stakes. Reward creative thinking.
- "advanced": Actions can backfire. NPCs have agendas. The world pushes back.
  Reward strategic play and clever deception. Punish reckless actions.

CRITICAL: The narration must acknowledge EVERY player's action. No one should
feel ignored. Even failed actions should be narrated dramatically.
```

### 4.4 Final Round

Round 5 (or the final round) has special behavior:

- Timer extends to 60 seconds
- Players see: "FINAL ROUND — Last chance to complete your objective"
- AI is prompted to create a dramatic climax that forces tough choices
- AI narration is longer and more dramatic
- After narration, transition directly to reveal phase

### 4.5 Reveal & Scoring Phase

```
HOST SCREEN SEQUENCE:
1. "The story has ended. But the truth hasn't."
2. One by one, reveal each player's SECRET OBJECTIVE
   - Show: Role name → Secret objective → Objective progress bar → Points
   - Dramatic pause between each reveal
3. Show "Plot Twist" bonus points:
   - "Best Action" (AI picks the most creative/effective action across all rounds): +150
   - "Chaos Agent" (player whose actions caused the most narrative twists): +100
   - "Survivor" (player who maintained highest objective progress throughout): +100
4. Final scoreboard with rankings
5. "Play Again?" button (generates entirely new scenario)
```

**AI Prompt — Bonus Point Judging:**

```
Review the complete game history and determine bonus awards.
Respond in JSON:

{
  "best_action": {
    "player_role": "string",
    "round": number,
    "action": "the action they took",
    "reason": "1-sentence explanation of why this was brilliant/hilarious"
  },
  "chaos_agent": {
    "player_role": "string",
    "reason": "1-sentence explanation"
  },
  "mvp_narrative_moment": "The single best moment of the entire game, described
    in one dramatic sentence (shown on host screen as a 'highlight reel' moment)"
}
```

### 4.6 World Builder — Complete State Machine

```
                    ┌──────────────┐
                    │   LOBBY      │
                    │ (host picks  │
                    │  game +      │
                    │  settings)   │
                    └──────┬───────┘
                           │ host:start-game
                    ┌──────▼───────┐
                    │  GENERATING  │ ← AI creates scenario (2-4 sec)
                    │  SCENARIO    │   Loading animation on host screen
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   ROLE       │ Players see their role + objective
                    │   REVEAL     │ on phone. Host shows setting.
                    │   (15 sec)   │ Countdown timer.
                    └──────┬───────┘
                           │
               ┌───────────▼───────────┐
               │                       │
               │    ACTION ROUND       │◄──────────────────┐
               │                       │                    │
               │  Phone: text input    │                    │
               │  Host: current scene  │                    │
               │  Timer: 45 sec        │                    │
               │                       │                    │
               └───────────┬───────────┘                    │
                           │ all submitted / timer up       │
               ┌───────────▼───────────┐                    │
               │                       │                    │
               │   AI NARRATING        │  Loading anim      │
               │   (2-5 sec)           │                    │
               │                       │                    │
               └───────────┬───────────┘                    │
                           │                                │
               ┌───────────▼───────────┐                    │
               │                       │  if round < max ───┘
               │   NARRATION DISPLAY   │
               │                       │  Typewriter effect
               │   Host: story text    │  on host screen
               │   Phone: your outcome │
               │   (10-15 sec)         │
               │                       │
               └───────────┬───────────┘
                           │ if final round
               ┌───────────▼───────────┐
               │                       │
               │   REVEAL PHASE        │  Sequential reveals
               │                       │  with animations
               └───────────┬───────────┘
                           │
               ┌───────────▼───────────┐
               │                       │
               │   FINAL SCORES        │
               │                       │
               │   "Play Again?"       │
               │   "Back to Lobby?"    │
               │                       │
               └───────────────────────┘
```

### 4.7 Data Models

```typescript
// ── World Builder Game State ──

interface WorldBuilderState {
  gameId: "world-builder";
  phase: "generating" | "role-reveal" | "action-input" | "ai-narrating" |
         "narration-display" | "reveal" | "final-scores";
  complexity: "kids" | "standard" | "advanced";

  // Scenario (set once at start)
  scenario: {
    setting: string;
    situation: string;
    tone: "comedic" | "dramatic" | "mysterious" | "absurd";
  };

  // Dynamic world
  worldState: {
    location: string;
    timePressure: "none" | "low" | "medium" | "high" | "critical";
    keyResources: string[];
    npcs: NPC[];
    threats: string[];
    opportunities: string[];
    newDevelopments: string[];
  };

  // Players + roles
  players: WorldBuilderPlayer[];

  // Round tracking
  currentRound: number;
  totalRounds: number;  // 5 for standard, 3 for kids, 7 for advanced
  roundHistory: RoundResult[];

  // Timing
  phaseStartedAt: number;
  phaseTimeLimit: number;  // seconds

  // AI conversation history (for context continuity)
  aiConversationHistory: { role: string; content: string }[];
}

interface WorldBuilderPlayer {
  playerId: string;
  displayName: string;
  roleName: string;
  publicIdentity: string;
  secretObjective: string;
  specialAbility: string;
  scoringCriteria: string;
  abilityUsed: boolean;

  // Per-round
  currentAction: string | null;
  hasSubmitted: boolean;

  // Scoring
  objectiveProgress: number;  // 0-100
  totalPoints: number;
  pointsBreakdown: { round: number; points: number; reason: string }[];
}

interface RoundResult {
  roundNumber: number;
  actions: { playerId: string; roleName: string; action: string }[];
  narration: string;
  playerOutcomes: PlayerOutcome[];
  worldStateAfter: WorldState;
  twist: string | null;
}

interface NPC {
  name: string;
  role: string;
  disposition: "friendly" | "neutral" | "hostile";
  status: string;  // "alive", "unconscious", "missing", etc.
}
```

### 4.8 Phone Controller UI — World Builder

The phone UI changes based on game phase:

**During Role Reveal:**
```
┌──────────────────────────┐
│                          │
│  You are...              │
│                          │
│  ┌────────────────────┐  │
│  │  🔧 THE ENGINEER   │  │
│  │                    │  │
│  │  Everyone knows:   │  │
│  │  "The ship's chief │  │
│  │   engineer"        │  │
│  │                    │  │
│  │  ── SECRET ──      │  │
│  │  Your objective:   │  │
│  │  "Get the facility │  │
│  │   generator running│  │
│  │   — they owe you   │  │
│  │   a fortune"       │  │
│  │                    │  │
│  │  Special ability:  │  │
│  │  Repair any broken │  │
│  │  mechanical system │  │
│  └────────────────────┘  │
│                          │
│  [ Game starts in 12s ]  │
│                          │
└──────────────────────────┘
```

**During Action Input:**
```
┌──────────────────────────┐
│  Round 3 of 5    ⏱ 0:34  │
│──────────────────────────│
│                          │
│  The facility generator  │
│  is sparking. Dr. Vasquez│
│  is arguing with someone │
│  outside. Water rising.  │
│                          │
│  ┌────────────────────┐  │
│  │ What do you do?    │  │
│  │                    │  │
│  │ [                ] │  │
│  │                    │  │
│  └────────────────────┘  │
│                          │
│  ┌────────────────────┐  │
│  │ ⚡ USE ABILITY:    │  │
│  │ "Repair System"    │  │
│  │ (one-time use)     │  │
│  └────────────────────┘  │
│                          │
│  [ SUBMIT ACTION ]       │
│                          │
│  ── Your Objective ──    │
│  Get generator running   │
│  Progress: ████░░ 60%    │
│                          │
└──────────────────────────┘
```

**During Narration (read-only on phone):**
```
┌──────────────────────────┐
│  Round 3 Results         │
│──────────────────────────│
│                          │
│  Your outcome:           │
│  "The generator roars to │
│   life under your hands, │
│   but the power surge    │
│   triggers an alarm..."  │
│                          │
│  +75 points              │
│  "Generator operational" │
│                          │
│  Progress: █████░ 85%    │
│                          │
│  ── Scoreboard ──        │
│  1. The Engineer   325   │
│  2. The Doctor     280   │
│  3. The Stowaway   210  │
│  4. The Reporter   195   │
│                          │
└──────────────────────────┘
```

---

## 5. Game Compilation — Other Game Slots

The platform should ship with 3-5 games. World Builder is the flagship. Here are lighter-weight games that round out the compilation. These are INTENTIONALLY simpler — not every game needs heavy AI.

### Game 2: BLUFF ENGINE (Medium AI)

Quick summary: AI generates obscure prompts. Players write fake answers. Vote on which is real. (See original concept — straightforward to build with the existing infrastructure.)

AI usage: Generates prompts + the "real" answer each round. Light API calls.

### Game 3: QUICK DRAW (No AI)

A drawing/guessing game. One player gets a word on their phone, draws with their finger, others guess. Uses HTML Canvas on the phone controller. Pure client-side — no AI needed.

Why include it: It's a proven party game format that's fun for all ages, gives the platform variety, and works as a palette cleanser between AI-heavy games.

### Game 4: REALITY DRIFT (Light AI)

Trivia where the AI slowly starts lying. Players call out "DRIFT" when they spot fake questions. AI generates trivia questions and strategically introduces false ones. (See original concept.)

AI usage: Generates trivia batches. Can pre-generate several rounds' worth in one API call to minimize latency.

### Game 5: HOT TAKE (No AI)

A debate/opinion game. The host screen shows a spicy (but age-appropriate) "Would you rather" or "Hot take" prompt. Players rank from Strongly Agree to Strongly Disagree. Points awarded for matching with the majority OR for being the lone wolf (depending on the round type). Prompts can be pulled from a large static JSON bank — no AI needed.

### Game Slot System

```
/games/
├── world-builder/
│   ├── index.ts          (GamePlugin implementation)
│   ├── ai-prompts.ts     (all Claude prompt templates)
│   ├── state.ts          (WorldBuilderState type + helpers)
│   └── scoring.ts        (point calculation logic)
├── bluff-engine/
│   ├── index.ts
│   ├── ai-prompts.ts
│   └── state.ts
├── quick-draw/
│   ├── index.ts
│   ├── word-bank.json
│   └── state.ts
├── reality-drift/
│   ├── index.ts
│   ├── ai-prompts.ts
│   └── state.ts
└── hot-take/
    ├── index.ts
    ├── prompts.json
    └── state.ts
```

---

## 6. Scaling Complexity System

This is a PLATFORM-LEVEL system, not per-game. The host selects complexity before starting any game, and each game adapts.

### Complexity Levels

| Aspect | 🟢 Kids (Ages 8+) | 🟡 Standard (Ages 13+) | 🔴 Advanced (Ages 16+) |
|--------|-------------------|------------------------|------------------------|
| **Timer** | 60 seconds | 45 seconds | 30 seconds |
| **Rounds** | 3 | 5 | 7 |
| **Tone** | Silly, cooperative | Balanced, light conflict | Strategic, competitive |
| **AI Vocabulary** | Simple words, short sentences | Normal | Complex, literary |
| **Hidden roles** | None — all objectives visible | 1 player may have a twist | Multiple conflicting objectives, hidden antagonist |
| **Content filter** | Strict — no conflict, no scary themes | Moderate — mild tension okay | Light — dramatic stakes, betrayal themes |
| **Scoring** | Everyone earns points, no negatives | Standard scoring with bonuses | Aggressive scoring, penalties for failures |
| **Social deduction** | None | Light | Heavy |

### Implementation

The complexity level is passed into every AI prompt as a parameter. The prompt templates include complexity-specific instructions (shown in the World Builder prompts above). Non-AI games read the complexity setting to adjust timers, word difficulty, prompt edginess, etc.

```typescript
interface GameSettings {
  complexity: "kids" | "standard" | "advanced";
  playerCount: number;
  customRounds?: number;  // override default round count
  customTimer?: number;   // override default timer
}

// Each game reads settings and adapts
function getTimerForPhase(phase: string, settings: GameSettings): number {
  const base = TIMER_DEFAULTS[phase];
  const multipliers = { kids: 1.5, standard: 1.0, advanced: 0.75 };
  return Math.round(base * multipliers[settings.complexity]);
}
```

---

## 7. UI/UX Design System

### Brand Identity

- **Aesthetic:** Retro-arcade meets modern minimalism. Think bold geometric shapes, saturated neon accents on dark backgrounds, chunky rounded typography.
- **Font pairing:** A bold display font (like "Dela Gothic One" or "Righteous") for game titles + a clean readable font (like "DM Sans" or "Outfit") for body text.
- **Color palette:**

```css
:root {
  --bg-dark:      #0a0a0f;
  --bg-card:      #16161f;
  --accent-1:     #ff3366;    /* hot pink — primary actions */
  --accent-2:     #00e5ff;    /* electric cyan — info/highlights */
  --accent-3:     #ffcc00;    /* gold — scores/achievements */
  --accent-4:     #7c4dff;    /* purple — AI-generated content */
  --text-primary: #f0f0f5;
  --text-muted:   #8888aa;
  --success:      #00e676;
  --danger:       #ff1744;
}
```

### Host Screen Design Principles

- **Large text** — readable from across a room
- **Animations** — typewriter effects for AI narration, slide-in transitions for scores, particle effects for big moments
- **Minimal clutter** — one focal point per screen state
- **Game-specific theming** — each game has a color accent and icon

### Phone Controller Design Principles

- **Thumb-friendly** — all tap targets 48px+ minimum
- **Single-scroll** — no horizontal scrolling, no hidden content
- **High contrast** — readable in a bright room
- **Haptic feedback** on submit (if supported)
- **Persistent footer** — always shows current score and timer

---

## 8. API & AI Integration Layer

### AI Service Wrapper

```typescript
// services/ai.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

interface AIResponse {
  raw: string;
  parsed: any;
  tokensUsed: number;
  latencyMs: number;
}

async function generateScenario(
  playerCount: number,
  complexity: string
): Promise<AIResponse> {
  const start = Date.now();

  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2000,
    system: "You are a game master for a multiplayer party game. Always respond in valid JSON only. No markdown, no backticks, no preamble.",
    messages: [{
      role: "user",
      content: buildScenarioPrompt(playerCount, complexity)
    }]
  });

  const text = response.content[0].type === 'text'
    ? response.content[0].text : '';

  return {
    raw: text,
    parsed: JSON.parse(text),
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    latencyMs: Date.now() - start
  };
}

async function narrateRound(
  gameState: WorldBuilderState,
  actions: PlayerAction[]
): Promise<AIResponse> {
  // Build conversation history for context continuity
  const messages = [
    ...gameState.aiConversationHistory,
    {
      role: "user" as const,
      content: buildNarrationPrompt(gameState, actions)
    }
  ];

  const start = Date.now();

  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1500,
    system: "You are a game master. Respond in valid JSON only.",
    messages
  });

  const text = response.content[0].type === 'text'
    ? response.content[0].text : '';

  return {
    raw: text,
    parsed: JSON.parse(text),
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    latencyMs: Date.now() - start
  };
}
```

### Rate Limiting & Cost Management

```
Estimated API costs per World Builder session:
- Scenario generation:     ~2,000 tokens  ($0.006)
- Per round narration ×5:  ~1,500 tokens × 5 = 7,500 tokens  ($0.023)
- Bonus judging:           ~1,000 tokens  ($0.003)
- TOTAL per game:          ~10,500 tokens ($0.032)

At $0.03/game, 1000 games/day = $30/day.
```

Implement:
- Request queuing (max 1 concurrent AI request per room)
- Response caching for identical scenarios (unlikely but possible)
- Timeout handling: if AI takes >10 seconds, show "The story unfolds..." loading screen and retry once
- Fallback: pre-generated scenario bank for if the API is down

---

## 9. Deployment & Hosting

### Recommended Setup

```
Vercel (Free tier works for MVP)
├── Next.js frontend (host display)
├── React PWA (phone controller)
└── Serverless API routes (non-realtime)

Railway or Fly.io ($5-20/mo)
├── Node.js WebSocket server
├── Redis (game state)
└── Socket.IO

Anthropic API
├── claude-sonnet-4-5-20250929
├── API key in environment variables
└── ~$0.03 per game session
```

### Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...
REDIS_URL=redis://...
NEXT_PUBLIC_WS_URL=wss://your-server.fly.dev
NEXT_PUBLIC_APP_URL=https://flimflam.app
NODE_ENV=production
```

---

## 10. Build Order for Claude Code

This is the recommended sequence for building the platform incrementally. Each phase produces a working, testable artifact.

### Phase 1: Skeleton (Day 1)

```
Goal: A host screen and a phone that can connect to the same room.

Build:
1. Node.js + Express + Socket.IO server
2. Room creation + join with 4-char codes
3. Basic Next.js host page showing room code + player list
4. Basic React phone page with code input + name entry
5. Real-time player list updates

Test: Open host on laptop, join from phone, see name appear.
```

### Phase 2: Game Framework (Day 2)

```
Goal: The GamePlugin interface works. A dummy game runs.

Build:
1. GamePlugin interface + game registry
2. Game selection menu on host screen
3. Phase management system (advance through phases, timers)
4. Phone input system (text input, multiple choice, vote)
5. A "test game" that just cycles through phases

Test: Select test game, see phases advance, submit input from phone.
```

### Phase 3: World Builder — Core (Day 3-4)

```
Goal: World Builder plays from start to finish.

Build:
1. AI service wrapper with Claude API calls
2. Scenario generation prompt + parsing
3. Role assignment + phone display
4. Action input phase with timer
5. AI narration + world state updates
6. Round loop (5 rounds)
7. Reveal + final scoring

Test: Full game with 2-3 people. AI generates scenario, actions produce
narrated results, scores calculated at end.
```

### Phase 4: Polish & UX (Day 5)

```
Goal: It looks and feels like a real game.

Build:
1. Host screen animations (typewriter narration, score reveals)
2. Phone UI polish (timer urgency, haptic, transitions)
3. Sound effects (optional — buzzer, reveal sting, etc.)
4. Error handling (disconnects, AI timeouts, edge cases)
5. Loading states and fallbacks
6. Complexity level selector + adaptation

Test: Play with friends. Does it feel fun? Is the pacing right?
```

### Phase 5: Additional Games (Day 6-7)

```
Goal: At least 2 more games in the compilation.

Build:
1. Quick Draw (no AI — Canvas drawing + guessing)
2. Bluff Engine or Hot Take (pick one)
3. Game selection carousel on host screen
4. "Back to lobby" flow between games
5. Session-level scoring (optional — track across games)

Test: Play a full "game night" — multiple games in sequence.
```

### Phase 6: Deploy (Day 8)

```
Goal: Playable on the internet.

Build:
1. Deploy WebSocket server to Railway/Fly.io
2. Deploy frontend to Vercel
3. Environment variables + API key
4. Domain setup (optional)
5. Basic analytics (games played, avg duration)

Test: Have someone in a different location join and play.
```

---

## Appendix A: File Structure

```
flimflam/
├── server/
│   ├── index.ts                 # Express + Socket.IO entry
│   ├── rooms/
│   │   ├── RoomManager.ts       # Room CRUD + player management
│   │   └── types.ts             # RoomState, Player types
│   ├── games/
│   │   ├── GamePlugin.ts        # Interface definition
│   │   ├── GameRegistry.ts      # Game loader + router
│   │   ├── world-builder/
│   │   │   ├── index.ts         # GamePlugin implementation
│   │   │   ├── ai-prompts.ts    # Prompt templates
│   │   │   ├── state.ts         # Types + state helpers
│   │   │   └── scoring.ts       # Point calculation
│   │   ├── bluff-engine/
│   │   │   └── ...
│   │   ├── quick-draw/
│   │   │   └── ...
│   │   └── hot-take/
│   │       └── ...
│   └── services/
│       ├── ai.ts                # Anthropic API wrapper
│       └── redis.ts             # Redis connection + helpers
│
├── host/                        # Next.js app (host display)
│   ├── app/
│   │   ├── page.tsx             # Home / create room
│   │   ├── room/[code]/
│   │   │   └── page.tsx         # Lobby + game display
│   │   └── layout.tsx
│   ├── components/
│   │   ├── Lobby.tsx
│   │   ├── GameSelector.tsx
│   │   ├── Scoreboard.tsx
│   │   ├── TypewriterText.tsx   # Animated narration
│   │   └── games/
│   │       ├── WorldBuilderHost.tsx
│   │       └── ...
│   └── hooks/
│       └── useSocket.ts
│
├── controller/                  # React PWA (phone)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── JoinRoom.tsx
│   │   │   └── InGame.tsx
│   │   ├── components/
│   │   │   ├── TextInput.tsx
│   │   │   ├── VoteGrid.tsx
│   │   │   ├── DrawCanvas.tsx
│   │   │   ├── RoleCard.tsx
│   │   │   └── Timer.tsx
│   │   └── hooks/
│   │       └── useSocket.ts
│   └── public/
│       └── manifest.json        # PWA manifest
│
├── shared/                      # Shared types
│   └── types.ts
│
├── package.json
└── README.md
```

---

## Appendix B: Key Prompt Templates (Copy-Paste Ready)

All AI prompt templates are included in section 4 above. They should be stored as template literal functions in `server/games/world-builder/ai-prompts.ts` and injected with game state variables at runtime.

---

## Appendix C: Edge Cases & Error Handling

| Scenario | Handling |
|----------|----------|
| Player disconnects mid-game | Mark as "disconnected." AI skips their action. They can rejoin with same name. |
| AI returns invalid JSON | Retry once. If still invalid, use a generic narration fallback. |
| AI takes > 10 seconds | Show dramatic loading animation. Timeout at 15s, retry once, then fallback. |
| Host disconnects | Game pauses. 60-second reconnect window. If no reconnect, game ends. |
| All players submit before timer | Skip remaining timer, advance immediately. |
| Player submits empty action | Auto-fill with "[Character name] hesitates and does nothing." |
| Room idle > 10 minutes | Auto-destroy room, free resources. |
| Profanity in player input | Client-side filter on phone. AI prompt includes instruction to not repeat profanity. |

---

*This spec is designed to be handed directly to Claude Code for implementation. Each section is self-contained and buildable in sequence. Start with Phase 1 and iterate.*
