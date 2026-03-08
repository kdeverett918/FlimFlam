import type { PlayerData } from "@flimflam/shared";

// ─── Props ──────────────────────────────────────────────────────────────────

export interface BrainBoardGameProps {
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
    send: (type: string, data?: Record<string, unknown>) => void;
  } | null;
  errorNonce?: number;
}

// ─── Data Models ────────────────────────────────────────────────────────────

export interface BoardCategory {
  name: string;
  clues: { value: number }[];
}

export interface Standing {
  sessionId: string;
  score: number;
}

export interface ClueResultEntry {
  sessionId: string;
  answer: string;
  correct: boolean;
  delta: number;
  judgedBy?: "local" | "ai" | "fallback";
  judgeExplanation?: string;
  speedBonus?: number;
  responseTimeMs?: number;
  streak?: number;
}

export interface ClueResultData {
  correctAnswer: string;
  question: string;
  value: number;
  isPowerPlay: boolean;
  results: ClueResultEntry[];
  anyCorrect?: boolean;
  correctCount?: number;
  correct?: boolean;
}

export interface FinalRevealResult {
  sessionId: string;
  answer: string;
  correct: boolean;
  wager: number;
  delta: number;
  judgedBy?: "local" | "ai" | "fallback";
  judgeExplanation?: string;
}

export interface FinalRevealData {
  correctAnswer: string;
  question: string;
  results: FinalRevealResult[];
}

export interface BrainBoardGameState {
  phase: string;
  board: BoardCategory[];
  revealedClues: string[];
  selectorSessionId: string | null;
  currentClueValue: number | null;
  currentClueQuestion: string | null;
  currentCategoryName: string;
  isPowerPlay: boolean;
  standings: Standing[];
  allInCategory: string | null;
  allInQuestion: string | null;
  answeredCount: number;
  totalPlayerCount: number;
  currentRound: number;
  doubleDownValues: boolean;
  chatMessages?: Array<{
    id: string;
    sender: string;
    senderSessionId: string;
    message: string;
    isAI: boolean;
    timestamp: number;
  }>;
  serverTimeOffset?: number;
  timerEndsAt?: number;
  submissions?: Record<string, { name: string; submitted: boolean; categories?: string[] }>;
  clueResult?: ClueResultData | null;
  allInReveal?: FinalRevealData | null;
  personalizationStatus?: "pending" | "ai" | "curated";
  personalizationMessage?: string | null;
  personalizationTopics?: string[];
}
