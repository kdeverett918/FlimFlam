"use client";

import type { PlayerData } from "@flimflam/shared";
import { generateAwards } from "@flimflam/shared";
import type { Room } from "colyseus.js";

import { FinalScoresLayout, buildScores } from "@/components/game/FinalScoresLayout";

export function HostFinalScores({
  players,
  room,
}: {
  players: PlayerData[];
  room: {
    onMessage: (type: string, cb: (data: Record<string, unknown>) => void) => () => void;
  } | null;
}) {
  const scores = buildScores(players);
  const awards = generateAwards(
    players
      .filter((p) => !p.isHost)
      .map((p) => ({
        name: p.name,
        sessionId: p.sessionId,
        score: p.score,
        correctCount: p.progressOrCustomInt,
      })),
    "lucky-letters",
  );
  return (
    <FinalScoresLayout
      scores={scores}
      accentColorClass="text-accent-luckyletters"
      gameId="lucky-letters"
      gameAwards={awards}
      room={room as Room | null}
    />
  );
}
