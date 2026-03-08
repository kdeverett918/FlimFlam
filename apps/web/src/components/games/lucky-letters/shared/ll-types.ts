import type { PlayerData } from "@flimflam/shared";

// ─── Props ──────────────────────────────────────────────────────────────────

export interface LuckyLettersGameProps {
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

export interface WheelStanding {
  sessionId: string;
  roundCash: number;
  totalCash: number;
}

export interface SpinSegment {
  type: "cash" | "bust" | "pass" | "wild";
  value: number;
  label: string;
}

export interface WheelGameState {
  phase: string;
  round: number;
  totalRounds: number;
  category: string;
  hint: string;
  puzzleDisplay: string;
  currentTurnSessionId: string | null;
  standings: WheelStanding[];
  consonantsRemaining: string[];
  vowelsRemaining: string[];
  wildActive: boolean;
  lastSpinResult: { segment: SpinSegment } | null;
  bonusPlayerSessionId: string | null;
  bonusSolved: boolean;
  revealedLetters: string[];
  availableCategories?: string[];
  selectedCategories?: string[];
}

export interface LetterResultData {
  letter: string;
  count: number;
  inPuzzle: boolean;
  earned: number;
  puzzleDisplay: string;
  vowelCost?: number;
}

export interface SpinResultData {
  segment: SpinSegment;
  angle: number;
}

export interface RoundResultData {
  winnerId: string | null;
  answer: string;
  category: string;
  roundCashEarned: number;
  solveBonusAwarded?: number;
  standings: WheelStanding[];
}

export interface BonusRevealData {
  solved: boolean;
  answer: string;
  bonusPrize: number;
  bonusPlayerId: string | null;
}

export interface CategoryVoteTally {
  voteCounts: Record<string, number>;
  totalVoters: number;
  votedCount: number;
}
