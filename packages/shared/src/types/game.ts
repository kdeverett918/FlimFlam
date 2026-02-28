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
export type WorldBuilderPhase =
  | "generating"
  | "role-reveal"
  | "action-input"
  | "ai-narrating"
  | "narration-display"
  | "reveal"
  | "final-scores";

export type BluffEnginePhase =
  | "generating-prompt"
  | "answer-input"
  | "voting"
  | "results"
  | "final-scores";

export type QuickDrawPhase =
  | "picking-drawer"
  | "drawing"
  | "guessing"
  | "word-reveal"
  | "final-scores";

export type RealityDriftPhase =
  | "generating-questions"
  | "answering"
  | "drift-check"
  | "results"
  | "final-scores";

export type HotTakePhase = "showing-prompt" | "voting" | "results" | "final-scores";

export type GamePhase =
  | WorldBuilderPhase
  | BluffEnginePhase
  | QuickDrawPhase
  | RealityDriftPhase
  | HotTakePhase;

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
