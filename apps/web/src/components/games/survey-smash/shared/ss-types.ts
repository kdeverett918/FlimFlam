import type { PlayerData, ScoreEntry } from "@flimflam/shared";

// ─── Props ──────────────────────────────────────────────────────────────────

export interface SurveySmashGameProps {
  phase: string;
  round: number;
  totalRounds: number;
  players: PlayerData[];
  gamePayload: Record<string, unknown>;
  privateData: Record<string, unknown> | null;
  gameEvents: Record<string, Record<string, unknown>>;
  mySessionId: string | null;
  isHost: boolean;
  timerEndTime: number | null;
  sendMessage: (type: string, data?: Record<string, unknown>) => void;
  room: {
    onMessage: (type: string, cb: (data: Record<string, unknown>) => void) => () => void;
  } | null;
  errorNonce?: number;
}

// ─── Data Models ────────────────────────────────────────────────────────────

export interface TeamData {
  id: string;
  members: string[];
  score: number;
}

export interface RevealedAnswer {
  text: string;
  points: number;
  rank: number;
}

export interface FaceOffEntry {
  sessionId: string;
  answer: string;
  matchedRank: number | null;
}

export interface LightningAnswer {
  question: string;
  answer: string;
  points: number;
  matched: boolean;
}

export interface SurveyAnswer {
  text: string;
  points: number;
  rank: number;
}

export interface FeudGameState {
  phase: string;
  round: number;
  totalRounds: number;
  teamMode: boolean;
  teams: TeamData[];
  question: string;
  answerCount: number;
  revealedAnswers: RevealedAnswer[];
  strikes: number;
  controllingTeamId: string;
  faceOffPlayers: string[];
  faceOffEntries: FaceOffEntry[];
  guessingOrder: string[];
  currentGuesserIndex: number;
  snagTeamId: string;
  lightningPlayerId: string;
  lightningCurrentIndex: number;
  lightningQuestionCount?: number;
  lightningAnswers: LightningAnswer[];
  lightningTotalPoints: number;
  roundGuesses: Array<{
    sessionId: string;
    answer: string;
    source: "face-off" | "guessing" | "steal";
    outcome: "match" | "miss" | "duplicate";
    matchedRank: number | null;
  }>;
  allAnswers: SurveyAnswer[];
  guessAlongSubmissions?: number;
  guessAlongEligible?: number;
  guessAlongPoints?: Array<{ sessionId: string; points: number }>;
  lastGuessAlongWinners?: string[];
  lastGuessAlongAnswer?: string | null;
  leaderboard?: ScoreEntry[];
}

export const TEAM_COLORS: Record<string, { text: string; border: string; bg: string }> = {
  "team-a": {
    text: "oklch(0.72 0.24 25)",
    border: "oklch(0.72 0.24 25 / 0.4)",
    bg: "oklch(0.72 0.24 25 / 0.12)",
  },
  "team-b": {
    text: "oklch(0.72 0.2 250)",
    border: "oklch(0.72 0.2 250 / 0.45)",
    bg: "oklch(0.72 0.2 250 / 0.12)",
  },
};

export const LR_SLOTS = ["lr0", "lr1", "lr2", "lr3", "lr4"];
