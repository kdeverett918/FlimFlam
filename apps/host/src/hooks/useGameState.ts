"use client";

import type { Complexity, HostViewData, PlayerData } from "@flimflam/shared";
import { useMemo } from "react";

export type ScreenView = "lobby" | "game";

export interface GameUIState {
  screenView: ScreenView;
  phase: string;
  selectedGameId: string;
  complexity: Complexity;
  hotTakePlayerInputEnabled: boolean;
  round: number;
  totalRounds: number;
  playerCount: number;
  playerList: PlayerData[];
  isTransitioning: boolean;
  timerEndTime: number | null;
  gamePayload: Record<string, unknown>;
}

interface UseGameStateParams {
  state: {
    phase: string;
    selectedGameId: string;
    complexity: Complexity;
    hotTakePlayerInputEnabled: boolean;
    round: number;
    totalRounds: number;
    timerEndsAt: number;
  } | null;
  players: Map<string, PlayerData>;
  gameData: HostViewData | null;
}

const LOBBY_PHASES = new Set(["lobby", "", "between-games"]);

function deriveScreenView(phase: string): ScreenView {
  if (LOBBY_PHASES.has(phase)) return "lobby";
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

  const phase = state?.phase ?? "lobby";
  const screenView = deriveScreenView(phase);

  const timerEndTime = useMemo(() => {
    const endsAt = state?.timerEndsAt ?? 0;
    return endsAt > 0 ? endsAt : null;
  }, [state?.timerEndsAt]);

  const gamePayload = useMemo(() => {
    return gameData?.payload ?? {};
  }, [gameData]);

  return {
    screenView,
    phase,
    selectedGameId: state?.selectedGameId ?? "",
    complexity: state?.complexity ?? "standard",
    hotTakePlayerInputEnabled: state?.hotTakePlayerInputEnabled ?? false,
    round: state?.round ?? 0,
    totalRounds: state?.totalRounds ?? 0,
    playerCount: playerList.length,
    playerList,
    isTransitioning: false,
    timerEndTime,
    gamePayload,
  };
}
