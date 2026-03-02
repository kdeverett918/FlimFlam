"use client";

import { BrainBoardHost } from "@/components/games/BrainBoardHost";
import { LuckyLettersHost } from "@/components/games/LuckyLettersHost";
import { SurveySmashHost } from "@/components/games/SurveySmashHost";
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
    case "brain-board":
      return <BrainBoardHost {...commonProps} />;
    case "lucky-letters":
      return <LuckyLettersHost {...commonProps} />;
    case "survey-smash":
      return <SurveySmashHost {...commonProps} />;
    default:
      return (
        <div className="flex min-h-screen items-center justify-center">
          <p className="font-display text-[48px] text-text-muted">Unknown game: {gameId}</p>
        </div>
      );
  }
}
