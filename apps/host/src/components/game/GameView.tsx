"use client";

import type { PlayerData } from "@flimflam/shared";
import type { Room } from "colyseus.js";
import { FamilyFeudHost } from "../games/FamilyFeudHost";
import { JeopardyHost } from "../games/JeopardyHost";
import { WheelOfFortuneHost } from "../games/WheelOfFortuneHost";

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
    case "jeopardy":
      return <JeopardyHost {...commonProps} />;
    case "wheel-of-fortune":
      return <WheelOfFortuneHost {...commonProps} />;
    case "family-feud":
      return <FamilyFeudHost {...commonProps} />;
    default:
      return (
        <div className="flex min-h-screen items-center justify-center">
          <p className="font-display text-[48px] text-text-muted">Unknown game: {gameId}</p>
        </div>
      );
  }
}
