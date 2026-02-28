import type { GameManifest } from "./types/game.js";
import type { Complexity } from "./types/room.js";

export const ROOM_CODE_LENGTH = 4;
export const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const MAX_PLAYERS = 8;
export const MIN_PLAYERS = 3;
export const MAX_NAME_LENGTH = 12;

export const COLYSEUS_PORT = 2567;
export const HOST_PORT = 3000;
export const CONTROLLER_PORT = 3001;

export const RECONNECTION_TIMEOUT_MS = 10_000;
export const ROOM_IDLE_TIMEOUT_MS = 600_000;

export const AI_REQUEST_TIMEOUT_MS = 10_000;
export const AI_MAX_RETRIES = 1;

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
  "role-reveal": 15_000,
  "action-input": 45_000,
  "narration-display": 12_000,
  "answer-input": 30_000,
  voting: 20_000,
  drawing: 60_000,
  guessing: 60_000,
  "trivia-answer": 15_000,
  rating: 20_000,
  "results-display": 8_000,
  reveal: 15_000,
};

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
    id: "world-builder",
    name: "World Builder",
    description:
      "AI-powered collaborative storytelling. Take on secret roles and shape the narrative!",
    minPlayers: 3,
    maxPlayers: 8,
    estimatedMinutes: 15,
    aiRequired: true,
    complexityLevels: ["kids", "standard", "advanced"],
    tags: ["ai", "storytelling", "roles"],
    icon: "🌍",
  },
  {
    id: "bluff-engine",
    name: "Bluff Engine",
    description:
      "Fibbage-style bluffing. Write fake answers to obscure trivia and fool your friends!",
    minPlayers: 3,
    maxPlayers: 8,
    estimatedMinutes: 12,
    aiRequired: true,
    complexityLevels: ["kids", "standard", "advanced"],
    tags: ["ai", "trivia", "bluffing"],
    icon: "🎭",
  },
  {
    id: "quick-draw",
    name: "Quick Draw",
    description: "Draw and guess! One player draws, everyone else races to guess the word.",
    minPlayers: 3,
    maxPlayers: 8,
    estimatedMinutes: 10,
    aiRequired: false,
    complexityLevels: ["kids", "standard", "advanced"],
    tags: ["drawing", "guessing", "speed"],
    icon: "✏️",
  },
  {
    id: "reality-drift",
    name: "Reality Drift",
    description:
      "Trivia with a twist — some questions are completely made up. Can you spot the drift?",
    minPlayers: 3,
    maxPlayers: 8,
    estimatedMinutes: 10,
    aiRequired: true,
    complexityLevels: ["kids", "standard", "advanced"],
    tags: ["ai", "trivia", "deception"],
    icon: "🌀",
  },
  {
    id: "hot-take",
    name: "Hot Take",
    description: "Rate opinion statements and score by matching the group — or standing alone!",
    minPlayers: 3,
    maxPlayers: 8,
    estimatedMinutes: 8,
    aiRequired: false,
    complexityLevels: ["kids", "standard", "advanced"],
    tags: ["opinions", "social", "debate"],
    icon: "🔥",
  },
];
