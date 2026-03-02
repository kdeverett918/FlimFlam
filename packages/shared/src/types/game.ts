import type { Complexity } from "./room";

export interface GameManifest {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  estimatedMinutes: number;
  aiRequired: boolean;
  complexityLevels: Complexity[];
  tags: string[];
  icon: string;
}

// Phase types for each game
export type JeopardyPhase =
  | "category-reveal"
  | "clue-select"
  | "answering"
  | "daily-double-wager"
  | "daily-double-answer"
  | "clue-result"
  | "round-transition"
  | "final-jeopardy-category"
  | "final-jeopardy-wager"
  | "final-jeopardy-answer"
  | "final-jeopardy-reveal"
  | "final-scores";

export type WheelOfFortunePhase =
  | "round-intro"
  | "spinning"
  | "guess-consonant"
  | "buy-vowel"
  | "solve-attempt"
  | "letter-result"
  | "round-result"
  | "bonus-round"
  | "bonus-reveal"
  | "final-scores";

export type FamilyFeudPhase =
  | "question-reveal"
  | "face-off"
  | "guessing"
  | "strike"
  | "steal-chance"
  | "answer-reveal"
  | "round-result"
  | "fast-money"
  | "fast-money-reveal"
  | "final-scores";

export type GamePhase = JeopardyPhase | WheelOfFortunePhase | FamilyFeudPhase;

export interface TimerConfig {
  durationMs: number;
  startedAt: number;
}

export interface HostViewData {
  gameId: string;
  phase: GamePhase;
  round?: number;
  totalRounds?: number;
  timer?: TimerConfig;
  payload: Record<string, unknown>;
}

export interface PlayerViewData {
  gameId: string;
  phase: GamePhase;
  round?: number;
  totalRounds?: number;
  timer?: TimerConfig;
  inputType?: string;
  payload: Record<string, unknown>;
}

export interface ScoreEntry {
  sessionId: string;
  name: string;
  score: number;
  rank: number;
  breakdown: { label: string; points: number }[];
}
