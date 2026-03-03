import type { GameManifest, GamePreviewContent } from "./types/game";
import type { Complexity } from "./types/room";

export const ROOM_CODE_LENGTH = 4;
export const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const MAX_PLAYERS = 8;
export const MIN_PLAYERS = 2;
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
  "results-display": 8_000,
  reveal: 15_000,
  // Brain Board
  "clue-select": 30_000,
  "board-reveal": 4_000,
  answering: 15_000,
  "clue-result": 3_000,
  // Lucky Letters
  "bonus-solve": 10_000,
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
    id: "brain-board",
    name: "Brain Board",
    description:
      "Pick clues from the board, outsmart your rivals, and cash in big with Power Plays!",
    minPlayers: 2,
    maxPlayers: 8,
    estimatedMinutes: 15,
    aiRequired: false,
    complexityLevels: ["kids", "standard", "advanced"],
    tags: ["trivia", "buzzer", "classic"],
    icon: "🧠",
  },
  {
    id: "lucky-letters",
    name: "Lucky Letters",
    description: "Spin the wheel, guess the letters, and crack the phrase before anyone else!",
    minPlayers: 2,
    maxPlayers: 8,
    estimatedMinutes: 12,
    aiRequired: false,
    complexityLevels: ["kids", "standard", "advanced"],
    tags: ["word", "puzzle", "classic"],
    icon: "🎡",
  },
  {
    id: "survey-smash",
    name: "Survey Smash",
    description:
      "Guess what the crowd thinks! Match the top answers and snag points from your rivals!",
    minPlayers: 2,
    maxPlayers: 8,
    estimatedMinutes: 15,
    aiRequired: false,
    complexityLevels: ["kids", "standard", "advanced"],
    tags: ["survey", "teams", "classic"],
    icon: "👨‍👩‍👧‍👦",
  },
];

export const GAME_PREVIEW_CONTENT: GamePreviewContent[] = [
  {
    gameId: "brain-board",
    tagline: "Outsmart. Outbuzz. Outplay.",
    fullDescription:
      "A trivia showdown where you pick clues from a giant board, buzz in to answer, and use Power Plays to steal the lead. The board has five categories with clues worth 200 to 1000 points — harder clues, bigger payoffs. Finish with an All-In round where everyone wagers on one final question.",
    howToPlay: [
      "The host reveals 5 categories on the board, each with 5 clues of increasing difficulty.",
      "Players take turns picking a clue — harder clues are worth more points.",
      "Once a clue is revealed, everyone buzzes in on their phone. Fastest finger gets to answer.",
      "Answer correctly to bank the points. Get it wrong and other players can steal.",
      "Earn a Power Play to wager bonus points on a clue you're confident about.",
      "After the board is cleared, the All-In round begins — one final question, everyone wagers.",
      "Highest score at the end wins!",
    ],
    highlights: [
      "5 categories per board",
      "Buzz-in speed matters",
      "Power Play wagers",
      "All-In finale",
    ],
  },
  {
    gameId: "lucky-letters",
    tagline: "Spin. Guess. Solve.",
    fullDescription:
      "A word puzzle game where players spin a wheel, guess letters, and race to solve hidden phrases. Buy vowels, call consonants, and avoid the dreaded Bust. The first player to crack the phrase wins the round — or risk it all in the Bonus Round for a huge payoff.",
    howToPlay: [
      "A hidden phrase is displayed on screen with blanks for each letter.",
      "On your turn, spin the wheel to land on a point value (or Bust/Pass).",
      "Call a consonant — if it's in the phrase, you earn that value for each occurrence.",
      "You can buy a vowel for 250 points to reveal more letters.",
      "Solve the phrase at any time on your turn to win the round's points.",
      "Land on Bust and you lose your turn's earnings. Pass skips to the next player.",
      "The winner of the final round plays a Bonus Round: solve a tough phrase in 30 seconds!",
    ],
    highlights: [
      "Spin the wheel each turn",
      "Buy vowels for 250 pts",
      "Bust loses your turn",
      "Bonus Round finale",
    ],
  },
  {
    gameId: "survey-smash",
    tagline: "Guess What Everyone Thinks.",
    fullDescription:
      "A team-based guessing game where you try to match the most popular survey answers. Two teams face off — one player from each team goes head-to-head, then the winning team tries to guess all the top answers. Miss three and the other team can snag your points. End with a Lightning Round for bonus points.",
    howToPlay: [
      "Players split into two teams. The host reads a survey question with hidden answers.",
      "One player from each team faces off — buzz in with the answer you think is #1.",
      "The team with the higher-ranked answer takes control and tries to guess the remaining answers.",
      "Each wrong guess earns a strike — three strikes and control passes to the other team.",
      "The opposing team gets one chance to snag the points by guessing a remaining answer.",
      "Play through multiple rounds of questions as teams rack up points.",
      "Finish with a Lightning Round: one player answers 5 rapid-fire questions in 30 seconds!",
    ],
    highlights: [
      "Team-based gameplay",
      "Face-off buzzer rounds",
      "Three strikes to lose control",
      "Lightning Round finale",
    ],
  },
];
