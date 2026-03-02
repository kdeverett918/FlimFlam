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

// Phase types — will be populated as new games are added
export type GamePhase = string;

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
