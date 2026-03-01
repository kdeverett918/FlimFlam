"use client";

import { BluffEngineHost } from "@/components/games/BluffEngineHost";
import { HotTakeHost } from "@/components/games/HotTakeHost";
import { QuickDrawHost } from "@/components/games/QuickDrawHost";
import { RealityDriftHost } from "@/components/games/RealityDriftHost";
import { WorldBuilderHost } from "@/components/games/WorldBuilderHost";
import type { PlayerData } from "@flimflam/shared";
import type { Room } from "colyseus.js";

interface GameViewProps {
  gameId: string;
  phase: string;
  round: number;
  totalRounds: number;
  players: PlayerData[];
  gamePayload: Record<string, unknown>;
  timerEndTime: number | null;
  room: Room | null;
}

export function GameView({
  gameId,
  phase,
  round,
  totalRounds,
  players,
  gamePayload,
  timerEndTime,
  room,
}: GameViewProps) {
  const commonProps = {
    phase,
    round,
    totalRounds,
    players,
    payload: gamePayload,
    timerEndTime,
    room,
  };

  switch (gameId) {
    case "world-builder":
      return <WorldBuilderHost {...commonProps} />;
    case "bluff-engine":
      return <BluffEngineHost {...commonProps} />;
    case "quick-draw":
      return <QuickDrawHost {...commonProps} />;
    case "reality-drift":
      return <RealityDriftHost {...commonProps} />;
    case "hot-take":
      return <HotTakeHost {...commonProps} />;
    default:
      return (
        <div className="flex min-h-screen items-center justify-center">
          <p className="font-display text-[48px] text-text-muted">Unknown game: {gameId}</p>
        </div>
      );
  }
}
