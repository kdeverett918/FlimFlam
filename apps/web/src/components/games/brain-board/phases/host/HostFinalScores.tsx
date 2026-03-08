"use client";

import { FinalScoresLayout, buildScores } from "@/components/game/FinalScoresLayout";
import type { PlayerData } from "@flimflam/shared";
import { generateAwards } from "@flimflam/shared";

interface HostFinalScoresProps {
  players: PlayerData[];
  room: {
    send: (type: string, data?: Record<string, unknown>) => void;
  } | null;
}

export function HostFinalScores({ players, room }: HostFinalScoresProps) {
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
    "brain-board",
  );

  return (
    <FinalScoresLayout
      scores={scores}
      accentColorClass="text-accent-brainboard"
      gameId="brain-board"
      gameAwards={awards}
      // biome-ignore lint/suspicious/noExplicitAny: FinalScoresLayout expects Room but we pass minimal interface
      room={room as any}
    />
  );
}
