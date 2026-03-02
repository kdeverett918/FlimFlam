"use client";

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
  phase: _phase,
  round: _round,
  totalRounds: _totalRounds,
  players: _players,
  gamePayload: _gamePayload,
  timerEndTime: _timerEndTime,
  room: _room,
}: GameViewProps) {
  // Game host views will be added here as new games are implemented.
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="font-display text-[48px] text-text-muted">Unknown game: {gameId}</p>
    </div>
  );
}
