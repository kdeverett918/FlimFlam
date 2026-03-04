# Brain Board Upgrade Plan
## Triple-A Enhancement Sprint

**Date**: 2026-03-03
**Status**: PLAN — Awaiting Approval
**Scope**: Bug fixes, UI/UX overhaul, AI-powered features

---

## Executive Summary

This plan covers 4 workstreams that transform Brain Board from a solid trivia game into a next-level, personalized party experience. We fix two bugs (ghost players, name collisions), overhaul the mobile controller with full information parity, add cinematic animations, and build an AI-powered pre-game chat + custom question generation system.

---

## WORKSTREAM 1: Bug Fixes

### Bug 1A — Ghost/Stale Players in Lobby

**Problem**: After a game session ends and players leave, their player entries remain in the room state. When new players join the same room, they see the old (disconnected) players listed. But when a game starts, those ghost players aren't actually there.

**Root Cause**: In `PartyRoom.ts:558-612`, `transitionToBetweenGames()` and `transitionToLobby()` reset player *state fields* (score, ready, role, etc.) but never remove disconnected players. Players with `connected: false` linger in the `players` MapSchema indefinitely.

**Fix** (`packages/server/src/rooms/PartyRoom.ts`):
- In both `transitionToBetweenGames()` and `transitionToLobby()`, after resetting player state, sweep and delete any player where `connected === false`.
- This ensures only actually-connected players remain when returning to lobby.

```typescript
// After the forEach reset loop, add:
const disconnectedIds: string[] = [];
this.state.players.forEach((player, sessionId) => {
  if (!player.connected) disconnectedIds.push(sessionId);
});
for (const id of disconnectedIds) {
  this.state.players.delete(id);
}
```

**Files**: `packages/server/src/rooms/PartyRoom.ts`

### Bug 1B — Name Collision with Departed Players

**Problem**: A player named "Bob" joins, disconnects (or the session ends). They try to rejoin with the same name. The old "Bob" entry still exists (ghost player), so the server assigns them "Bob2". But that original "Bob" isn't actually in the game anymore.

**Root Cause**: The name dedup logic in `onJoin` (line ~430-443) checks ALL players in the MapSchema, including those with `connected: false`. Since ghost players are never cleaned up (see Bug 1A), names stay reserved forever.

**Fix**: Bug 1A's ghost cleanup solves the majority of this. Additionally, in the `_startGame()` method, we should prune disconnected players before locking the room — so a game never starts with ghost player slots.

```typescript
// In _startGame(), before this.lock():
const disconnected: string[] = [];
this.state.players.forEach((p, sid) => {
  if (!p.connected) disconnected.push(sid);
});
for (const sid of disconnected) {
  this.state.players.delete(sid);
}
```

**Files**: `packages/server/src/rooms/PartyRoom.ts`

---

## WORKSTREAM 2: Controller UI — Full Information Parity

The goal: a player looking only at their phone should have all the info they need to play without looking at the TV.

### 2A — Show Other Players' Answers During Clue Result

**Current State**: During `clue-result` phase, the controller just shows a static "Results are in!" card (`GameController.tsx:453-454`). All the rich data (correct answer, each player's answer, who got it right/wrong, score deltas) only appears on the host screen.

**Enhancement**: The server already broadcasts `clue-result` game-data with a full `results` array containing each player's answer, correctness, delta, and judge info. The controller receives this via `gameEvents["clue-result"]`.

**Implementation**:
- Create a new `BrainBoardClueResult` component for the controller
- Shows: correct answer (highlighted), all player answers with check/X marks, score deltas
- Animate each result entry with staggered fade-in (using existing `motion` library)
- Include AI judge explanation when present
- Color-code: green for correct, red for wrong answers

**Files**:
- `apps/controller/src/components/controls/BrainBoardClueResult.tsx` (new)
- `apps/controller/src/components/game/GameController.tsx` (wire into renderBrainBoard)

### 2B — Show Player Scores & Standings on Controller

**Current State**: `ScoreBadge.tsx` shows the player's own score and rank. But there's no way to see other players' scores during gameplay.

**Enhancement**: Add a swipe-up or expandable "Standings" panel accessible from the ScoreBadge. The game-state broadcast already includes `standings` array with all player scores.

**Implementation**:
- Create `BrainBoardStandings` component — mini leaderboard showing all players, scores, rank
- Accessible via tap on the ScoreBadge (expand/collapse) or as a persistent sidebar on tablets
- Each player row: rank badge, avatar color dot, name, score (animated counter)
- Highlight "your" row distinctly
- Update live as scores change

**Files**:
- `apps/controller/src/components/controls/BrainBoardStandings.tsx` (new)
- `apps/controller/src/components/game/GameController.tsx`

### 2C — Show Category Dollar Amounts on Controller

**Current State**: During `clue-select`, non-selector players see "Watch the board while the selector picks" with just category names — no dollar values or grid.

**Enhancement**: Show a read-only mini board on all players' phones during `clue-select`, with greyed-out answered clues. This gives everyone context on what's still available.

**Implementation**:
- Reuse the existing `ClueGrid` component but pass `readOnly={true}` prop (disable tap handlers)
- The game-state broadcast already includes `board` (categories), `revealedClues` (answered), and `currentRound` / `doubleDownValues`
- Show dollar values with revealed clues greyed out
- Highlight the currently selected clue when selector picks

**Files**:
- `apps/controller/src/components/controls/ClueGrid.tsx` (add readOnly prop)
- `apps/controller/src/components/game/GameController.tsx`

### 2D — Countdown Timer on Controller During Answering

**Current State**: The answering phase on controller shows a text input but no visible timer. Players don't know how much time they have left.

**Enhancement**: Add a `TimerBar` component (already exists!) to the answering, power-play, and all-in phases.

**Implementation**:
- The room state `timerEndsAt` is already synced to all clients via Colyseus schema
- The `TimerBar` component already exists at `apps/controller/src/components/game/TimerBar.tsx`
- Wire `timerEndsAt` into the answering phase rendering for Brain Board
- Add timer to: answering, power-play-wager, power-play-answer, all-in-wager, all-in-answer phases
- Haptic warning at <10 seconds remaining (already supported via `haptics.warn()`)

**Files**:
- `apps/controller/src/components/game/GameController.tsx`
- Minimal changes — mostly adding TimerBar to existing JSX

### 2E — Show Current Question on All Phases

**Current State**: During some phases, non-active players see generic "Watch the board" messages with no context about the current question.

**Enhancement**: Always show the current clue question, category, and value as a persistent header when a clue is active.

**Implementation**:
- Extract `currentClueQuestion`, `currentCategoryName`, `currentClueValue` from game-state events
- Display as a sticky header during answering, power-play, and result phases
- Glass panel with category badge + value + question text

**Files**:
- `apps/controller/src/components/game/GameController.tsx`

---

## WORKSTREAM 3: Visual Enhancements — AAA Polish

### 3A — Animated Phase Transitions on Controller

**What**: Cinematic transitions when the game phase changes (e.g., "answering" → "clue-result" → "clue-select").

**Implementation**:
- Use `motion` (already installed, v12.7.3) for entrance/exit animations
- `AnimatePresence` wrapper around the phase content in `renderBrainBoard()`
- Phase-specific entrance variants:
  - `answering`: Slide up from bottom (urgency)
  - `clue-result`: Scale in from center (dramatic reveal)
  - `power-play`: Golden flash + scale (high stakes)
  - `all-in`: Pulse + zoom (final showdown)
- Exit: Fade out + slight scale down

**Files**:
- `apps/controller/src/components/game/GameController.tsx`

### 3B — Score Delta Animations

**What**: When scores change after a clue, show floating "+$600" or "-$400" animations on the controller.

**Current State**: `ScoreBadge.tsx` already has delta animation support (`float-up-fade` CSS class). Enhance with:
- Larger, more dramatic delta displays
- Green glow for gains, red for losses
- Confetti burst on large gains ($800+)
- Screen shake on large losses (via `motion` transform)

**Files**:
- `apps/controller/src/components/game/ScoreBadge.tsx`
- `apps/controller/src/app/globals.css` (new keyframes if needed)

### 3C — Power Play & All-In Dramatic Effects

**What**: Power Play and All-In are the most dramatic moments. Make them feel premium.

**Implementation**:
- **Power Play Entrance**: Gold shimmer border + pulsing glow on the wager/answer card
- **All-In Entrance**: Full-screen overlay with dramatic scale-in, particles, and a bass-drop-style animation
- Use `motion` for spring-based animations
- Add pulsing glow CSS animation for the active wager display
- Screen-edge glow effects during high-stakes moments

**Files**:
- `apps/controller/src/components/game/GameController.tsx`
- `apps/controller/src/app/globals.css`

### 3D — Board Interaction Polish

**What**: Make the ClueGrid on the selector's phone feel more interactive and game-like.

**Implementation**:
- Press effect: Scale down on touch, spring back on release (via `motion.button`)
- Revealed clues: Subtle strikethrough animation (not just static grey)
- Category headers: Slight parallax or tilt on scroll
- Value selection: Ripple effect on tap

**Files**:
- `apps/controller/src/components/controls/ClueGrid.tsx`

### 3E — Answer Submission Feedback

**What**: After submitting an answer, give visceral feedback that it went through.

**Implementation**:
- Submit button: Spring scale + color flash (green pulse)
- Input field: Fade to confirmed state with checkmark
- Haptic: `haptics.confirm()` (already supported)
- Show "Locked in!" text with fade animation
- Progress indicator: "3/4 players answered" (from answeredCount/totalPlayerCount in game-state)

**Files**:
- `apps/controller/src/components/controls/TextInput.tsx` (minor)
- `apps/controller/src/components/game/GameController.tsx`

---

## WORKSTREAM 4: AI-Powered Features

### 4A — Pre-Game Topic Chat Room

**Concept**: Before Brain Board starts, all players enter a shared chat room. An AI host (Claude) prompts the group with fun discovery questions like:
- "What topics should we play tonight? Movies? Sports? Pop culture?"
- "Any inside jokes or niche interests the group shares?"
- "Pick an era: 90s nostalgia, current events, or timeless classics?"
- "Any topics that are OFF limits tonight?"

The AI collects responses and uses them to generate a custom game board.

**Architecture**:

```
[Controller Chat UI]
    → player:chat-message → [PartyRoom]
    → forwards to [BrainBoardPlugin]
    → queues to [AI Service]
    → Claude response broadcast back to all players + host
    → After N messages or timer expiry → generates custom board
```

**Server Implementation** (`games/brain-board/src/index.ts`):
- New phase: `"topic-chat"` — inserted between game start and `category-reveal`
- Chat state: Array of `{ sender: string, message: string, isAI: boolean, timestamp: number }`
- New message handler: `player:chat-message` — validates, stores, broadcasts
- AI integration: After each batch of player messages (debounced 3s), send conversation context to Claude
- Claude responds with follow-up questions, reactions, and topic suggestions
- Timer: 90 seconds (kids), 60 seconds (standard), 45 seconds (advanced)
- On timer expiry or host skip: AI generates custom board from conversation topics

**AI Prompt Strategy**:
- System prompt: "You are a fun, witty game show host preparing a trivia game. Your job is to get the group excited and discover what topics they want to play."
- Include player names in context for personalization
- Limit AI responses to 2-3 sentences max (keep chat flowing)
- Final generation prompt: "Based on this group's interests, generate 6 trivia categories with 5 questions each at [complexity] difficulty."

**Controller UI** (`apps/controller/`):
- New `BrainBoardChat` component — scrollable chat window
- Message input at bottom (reuse TextInput patterns)
- AI messages styled differently (glow border, "AI Host" avatar)
- Player messages show avatar color + name
- Typing indicator when AI is generating
- Topic pills/tags that emerge from the conversation (tappable to "vote" for them)
- Timer bar at top showing time remaining in chat phase

**Host UI** (`apps/host/`):
- Chat messages displayed in a scrolling feed
- Large text for TV readability
- AI messages prominently featured
- Topic word cloud that builds as players suggest things
- Transition animation when chat phase ends → board generation

**Files**:
- `games/brain-board/src/index.ts` (new phase, chat handlers, AI integration)
- `packages/ai/src/prompts/brain-board.ts` (new prompt templates)
- `apps/controller/src/components/controls/BrainBoardChat.tsx` (new)
- `apps/controller/src/components/game/GameController.tsx` (wire chat phase)
- `apps/host/src/components/games/BrainBoardHost.tsx` (chat phase display)

### 4B — AI-Generated Custom Question Boards

**Problem**: The current clue-bank has 11 boards per complexity (33 total). Questions are static and repetitive across sessions.

**Solution**: Use Claude (Opus 4.6) to generate completely custom trivia boards based on the pre-game chat conversation.

**Generation Strategy**:

1. **Topic Extraction**: From the chat, extract 6-8 topic areas the group is interested in
2. **Category Generation**: Pick 6 categories, mix group-suggested topics (3-4) with wildcard/surprise categories (2-3) for variety
3. **Question Quality**: Each question must have:
   - One unambiguous correct answer
   - Clear, concise wording
   - Appropriate difficulty for the complexity level
   - No controversial or offensive content
4. **Validation**: Zod schema validates the entire board structure before use
5. **Fallback**: If AI generation fails (timeout, parse error), fall back to a random static board from clue-bank

**AI Prompt Design** (`packages/ai/src/prompts/brain-board.ts`):

```typescript
export function buildBoardGenerationPrompt(
  topics: string[],
  complexity: "kids" | "standard" | "advanced",
  playerNames: string[],
  avoidCategories?: string[] // categories from previous rounds
): { system: string; user: string } {
  return {
    system: `You are a trivia game designer creating a Jeopardy-style board.
    Generate exactly 6 categories with exactly 5 clues each.
    Difficulty: ${complexity}
    ${complexity === "kids" ? "Questions should be fun, safe, age-appropriate for 8+." : ""}
    ${complexity === "advanced" ? "Questions should challenge knowledgeable adults." : ""}

    RULES:
    - Each clue has a "question" (the clue prompt) and "answer" (the correct response)
    - Answers must be short (1-4 words), unambiguous, and factually correct
    - Questions should progress in difficulty within each category (easiest first)
    - Mix the suggested topics with 1-2 surprise/creative categories
    - Never use offensive, political, or divisive content
    - Make it FUN — witty category names, surprising facts, pop culture

    Output ONLY valid JSON matching this exact structure:`,
    user: `Players: ${playerNames.join(", ")}
    Suggested topics: ${topics.join(", ")}
    ${avoidCategories?.length ? `Avoid repeating these categories: ${avoidCategories.join(", ")}` : ""}

    Generate the board now.`
  };
}
```

**Zod Validation Schema**:
```typescript
const AIBoardSchema = z.object({
  categories: z.array(z.object({
    name: z.string().min(1).max(50),
    clues: z.array(z.object({
      question: z.string().min(10).max(300),
      answer: z.string().min(1).max(100),
      value: z.number() // will be overridden by game logic
    })).length(5)
  })).length(6)
});
```

**Performance**:
- AI board generation: ~5-8 seconds with Opus 4.6
- Show a "Generating your custom board..." animation during generation
- If generation takes >12 seconds, fall back to static board
- Cache generated boards per room to avoid regeneration on restart

**Model Choice**:
- Board generation: `claude-opus-4-6` — highest quality for creative, accurate trivia
- Answer judging: Keep `claude-haiku-4-5-latest` — fast, cheap, sufficient for yes/no judging
- Chat responses: `claude-sonnet-4-5-20250929` — good balance of speed and personality

**Files**:
- `packages/ai/src/prompts/brain-board.ts` (new generation prompt)
- `packages/ai/src/client.ts` (add model override support per-request)
- `games/brain-board/src/index.ts` (AI board generation flow)

### 4C — Creative Ideas for Next-Level AI Features

Beyond the core chat + generation, here are enhancement ideas ranked by impact:

1. **AI Commentary During Reveals** (High Impact, Medium Effort)
   - After each clue result, AI generates a one-liner roasting/praising players
   - "Bob really thought the answer was 'Napoleon'? Bold move, buddy."
   - Displayed on host screen, adds personality and humor

2. **Adaptive Difficulty** (High Impact, Low Effort)
   - Track correct/wrong per player during the game
   - If the group is crushing it, AI generates harder mid-game questions
   - If they're struggling, ease up — keep it fun

3. **Personal Trivia Round** (Medium Impact, High Effort)
   - One round where AI generates questions about the players themselves
   - Based on info shared in the pre-game chat
   - "Which player said they're obsessed with 90s sitcoms?"

4. **AI Bluff Category** (Medium Impact, Medium Effort)
   - One category where answers are AI-generated lies mixed with truth
   - Players must identify the real answer among plausible fakes
   - Blends trivia with social deduction

---

## Implementation Priority & Sequence

### Phase 1 — Foundation (Do First)
| Task | Workstream | Effort |
|------|-----------|--------|
| Ghost player cleanup | 1A | Small |
| Name collision fix | 1B | Small |
| Timer on answering phases | 2D | Small |

### Phase 2 — Information Parity
| Task | Workstream | Effort |
|------|-----------|--------|
| Show clue results on controller | 2A | Medium |
| Player standings panel | 2B | Medium |
| Read-only board on non-selectors | 2C | Small |
| Current question header | 2E | Small |

### Phase 3 — Visual Polish
| Task | Workstream | Effort |
|------|-----------|--------|
| Phase transition animations | 3A | Medium |
| Score delta enhancements | 3B | Small |
| Power Play / All-In effects | 3C | Medium |
| Board interaction polish | 3D | Small |
| Answer submission feedback | 3E | Small |

### Phase 4 — AI Features
| Task | Workstream | Effort |
|------|-----------|--------|
| Pre-game topic chat (server) | 4A | Large |
| Pre-game chat UI (controller) | 4A | Medium |
| Pre-game chat UI (host) | 4A | Medium |
| AI board generation | 4B | Large |
| Board generation prompt engineering | 4B | Medium |
| AI commentary (stretch) | 4C.1 | Medium |

---

## Technical Constraints

- **motion** library (v12.7.3) already installed — use this for all animations, NOT adding GSAP or separate Framer Motion
- **Colyseus schema** for state — chat messages should use broadcast messages, not schema (too dynamic for schema compression)
- **AI queue** — brain-board already uses per-room AI request serialization. Chat and generation must respect this queue
- **Existing test suite** — 658 unit tests + E2E tests. All changes must not break existing tests
- **Mobile-first** — all new UI must work on 375px+ width screens with 48px+ touch targets
- **Reduced motion** — all new animations must respect `prefers-reduced-motion`

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `packages/server/src/rooms/PartyRoom.ts` | Ghost cleanup in transitions + _startGame |
| `games/brain-board/src/index.ts` | New topic-chat phase, AI board generation, chat handlers |
| `packages/ai/src/prompts/brain-board.ts` | New prompt templates (chat, board gen) |
| `packages/ai/src/client.ts` | Model override per-request |
| `apps/controller/src/components/game/GameController.tsx` | Wire all new phases + components |
| `apps/controller/src/components/controls/BrainBoardClueResult.tsx` | NEW — result display |
| `apps/controller/src/components/controls/BrainBoardStandings.tsx` | NEW — standings panel |
| `apps/controller/src/components/controls/BrainBoardChat.tsx` | NEW — pre-game chat |
| `apps/controller/src/components/controls/ClueGrid.tsx` | Add readOnly prop |
| `apps/controller/src/components/game/ScoreBadge.tsx` | Enhanced delta animations |
| `apps/controller/src/app/globals.css` | New keyframes |
| `apps/host/src/components/games/BrainBoardHost.tsx` | Chat phase display, AI generation screen |

---

## Success Criteria

- [ ] No ghost players appear in lobby after session transitions
- [ ] Rejoining with same name works when original player is gone
- [ ] Controller shows clue results with all player answers
- [ ] Controller shows live standings accessible from any phase
- [ ] Timer visible on controller during all timed phases
- [ ] Phase transitions animate smoothly on controller
- [ ] Power Play and All-In feel dramatically different from regular clues
- [ ] Pre-game chat works with 2-8 players
- [ ] AI generates on-topic trivia boards from chat conversation
- [ ] Generated boards pass Zod validation 95%+ of the time
- [ ] Fallback to static boards works when AI fails
- [ ] All new UI works on iPhone SE (375px) through iPad
- [ ] Existing 658 unit tests still pass
- [ ] E2E tests still pass
