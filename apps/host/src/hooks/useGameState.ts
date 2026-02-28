"use client";

import type { Complexity, HostViewData, PlayerData, ScoreEntry } from "@partyline/shared";
import { useMemo } from "react";

export type ScreenView = "lobby" | "game" | "results";

export interface GameUIState {
  screenView: ScreenView;
  phase: string;
  selectedGameId: string;
  complexity: Complexity;
  round: number;
  totalRounds: number;
  playerCount: number;
  playerList: PlayerData[];
  scores: ScoreEntry[];
  isTransitioning: boolean;
  timerEndTime: number | null;
  gamePayload: Record<string, unknown>;
}

interface UseGameStateParams {
  state: {
    phase: string;
    selectedGameId: string;
    complexity: Complexity;
    round: number;
    totalRounds: number;
  } | null;
  players: Map<string, PlayerData>;
  gameData: HostViewData | null;
}

const LOBBY_PHASES = new Set(["lobby", ""]);
const RESULTS_PHASES = new Set(["final-scores"]);

function deriveScreenView(phase: string): ScreenView {
  if (LOBBY_PHASES.has(phase)) return "lobby";
  if (RESULTS_PHASES.has(phase)) return "results";
  return "game";
}

export function useGameState({ state, players, gameData }: UseGameStateParams): GameUIState {
  const playerList = useMemo(() => {
    const list: PlayerData[] = [];
    for (const [, player] of players) {
      list.push(player);
    }
    return list.sort((a, b) => b.score - a.score);
  }, [players]);

  const scores: ScoreEntry[] = useMemo(() => {
    return playerList.map((p, i) => ({
      sessionId: p.sessionId,
      name: p.name,
      score: p.score,
      rank: i + 1,
      breakdown: [],
    }));
  }, [playerList]);

  const phase = state?.phase ?? "lobby";
  const screenView = deriveScreenView(phase);

  const timerEndTime = useMemo(() => {
    if (gameData?.timer) {
      return gameData.timer.startedAt + gameData.timer.durationMs;
    }
    return null;
  }, [gameData]);

  const gamePayload = useMemo(() => {
    return gameData?.payload ?? {};
  }, [gameData]);

  return {
    screenView,
    phase,
    selectedGameId: state?.selectedGameId ?? "",
    complexity: state?.complexity ?? "standard",
    round: state?.round ?? 0,
    totalRounds: state?.totalRounds ?? 0,
    playerCount: playerList.length,
    playerList,
    scores,
    isTransitioning: false,
    timerEndTime,
    gamePayload,
  };
}
