import type { GameManifest } from "./types/game";
import type { Complexity } from "./types/room";

export const ROOM_CODE_LENGTH = 4;
export const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const MAX_PLAYERS = 8;
export const MIN_PLAYERS = 3;
// 12 chars was causing real player names to be silently truncated in the lobby UI.
// Keep it bounded for layout + abuse prevention, but long enough for typical names/handles.
export const MAX_NAME_LENGTH = 20;

export const COLYSEUS_PORT = 2567;
export const HOST_PORT = 3000;
export const CONTROLLER_PORT = 3001;

// Allow enough time for client-side route transitions and slow devices to reconnect.
// This is also used for the controller join-page -> play-page handoff, which relies on
// Colyseus reconnection tokens.
export const RECONNECTION_TIMEOUT_MS = 45_000;
export const ROOM_IDLE_TIMEOUT_MS = 600_000;

export const COMPLEXITY_TIMER_MULTIPLIERS: Record<Complexity, number> = {
  kids: 1.5,
  standard: 1.0,
  advanced: 0.75,
};

export const COMPLEXITY_ROUND_COUNTS: Record<Complexity, number> = {
  kids: 3,
  standard: 5,
  advanced: 7,
};

export const DEFAULT_PHASE_TIMERS: Record<string, number> = {
  // Jeopardy
  "category-reveal": 5_000,
  "clue-select": 30_000,
  buzzing: 5_000,
  answering: 15_000,
  "daily-double-wager": 20_000,
  "daily-double-answer": 15_000,
  "clue-result": 4_000,
  "final-jeopardy-category": 5_000,
  "final-jeopardy-wager": 30_000,
  "final-jeopardy-answer": 30_000,
  "final-jeopardy-reveal": 8_000,
  // Wheel of Fortune
  "round-intro": 3_000,
  spinning: 5_000,
  "guess-consonant": 15_000,
  "buy-vowel": 15_000,
  "solve-attempt": 20_000,
  "letter-result": 3_000,
  "round-result": 5_000,
  "bonus-round": 10_000,
  "bonus-reveal": 8_000,
  // Family Feud
  "question-reveal": 5_000,
  "face-off": 10_000,
  guessing: 20_000,
  strike: 3_000,
  "steal-chance": 15_000,
  "answer-reveal": 8_000,
  "fast-money": 20_000,
  "fast-money-reveal": 8_000,
};

export const REACTION_EMOJIS = ["😂", "🔥", "👏", "😱", "💀", "🎉", "👀", "💯"] as const;
export const REACTION_COOLDOWN_MS = 2_000;

export const AVATAR_COLORS = [
  "#FF3366", // hot pink
  "#00D4AA", // teal
  "#FFB800", // gold
  "#7B61FF", // purple
  "#FF6B35", // orange
  "#00B4D8", // cyan
  "#FF1493", // deep pink
  "#32CD32", // lime green
] as const;

export const GAME_MANIFESTS: GameManifest[] = [
  {
    id: "jeopardy",
    name: "Jeopardy",
    description:
      "Classic quiz show! Pick clues from the board, buzz in, and answer in the form of a question.",
    minPlayers: 3,
    maxPlayers: 8,
    estimatedMinutes: 15,
    aiRequired: false,
    complexityLevels: ["kids", "standard", "advanced"],
    tags: ["trivia", "buzzer", "classic"],
    icon: "❓",
  },
  {
    id: "wheel-of-fortune",
    name: "Wheel of Fortune",
    description: "Spin the wheel, guess letters, and solve the puzzle! Classic word game fun.",
    minPlayers: 3,
    maxPlayers: 8,
    estimatedMinutes: 12,
    aiRequired: false,
    complexityLevels: ["kids", "standard", "advanced"],
    tags: ["word", "puzzle", "classic"],
    icon: "🎡",
  },
  {
    id: "family-feud",
    name: "Family Feud",
    description:
      "Survey says! Guess the top answers to survey questions. Play in teams or free-for-all!",
    minPlayers: 3,
    maxPlayers: 8,
    estimatedMinutes: 15,
    aiRequired: false,
    complexityLevels: ["kids", "standard", "advanced"],
    tags: ["survey", "teams", "classic"],
    icon: "👨‍👩‍👧‍👦",
  },
];
