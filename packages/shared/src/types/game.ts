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

export interface GamePreviewContent {
  gameId: string;
  tagline: string;
  fullDescription: string;
  howToPlay: string[];
  highlights: string[];
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

export type HotTakePhase =
  | "topic-setup"
  | "ai-generating"
  | "showing-prompt"
  | "voting"
  | "results"
  | "final-scores";

export type BrainBattlePhase =
  | "topic-submit"
  | "board-generating"
  | "board-reveal"
  | "clue-select"
  | "buzzing"
  | "answering"
  | "appeal-window"
  | "appeal-judging"
  | "appeal-result"
  | "clue-result"
  | "final-scores";

export type GamePhase =
  | WorldBuilderPhase
  | BluffEnginePhase
  | QuickDrawPhase
  | RealityDriftPhase
  | HotTakePhase
  | BrainBattlePhase;

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
