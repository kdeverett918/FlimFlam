"use client";

import { WaitingScreen } from "@/components/game/WaitingScreen";
import type { PlayerData } from "@flimflam/shared";
import { ClueResultController } from "../../shared/ClueResultController";
import type { FinalRevealData } from "../../shared/bb-types";

export interface CtrlAllInRevealProps {
  finalReveal: FinalRevealData | null;
  boardStateAllInReveal: FinalRevealData | null | undefined;
  gameEvents: Record<string, Record<string, unknown>>;
  players: PlayerData[];
  mySessionId: string | null;
}

export function CtrlAllInReveal({
  finalReveal,
  boardStateAllInReveal,
  gameEvents,
  players,
  mySessionId,
}: CtrlAllInRevealProps) {
  const allInRevealEvent = (gameEvents?.["all-in-reveal"] ?? null) as {
    results?: Array<{
      sessionId: string;
      answer: string;
      correct: boolean;
      delta: number;
      wager?: number;
    }>;
    correctAnswer?: string;
    question?: string;
  } | null;

  const resolvedAllInReveal =
    finalReveal ??
    boardStateAllInReveal ??
    (allInRevealEvent?.results && allInRevealEvent.correctAnswer
      ? {
          results: allInRevealEvent.results.map((r) => ({
            ...r,
            wager: r.wager ?? 0,
          })),
          correctAnswer: allInRevealEvent.correctAnswer,
          question: allInRevealEvent.question ?? "",
        }
      : null);

  if (resolvedAllInReveal) {
    return (
      <ClueResultController
        clueResult={{
          results: resolvedAllInReveal.results.map((r) => ({
            ...r,
            judgedBy: undefined,
            judgeExplanation: undefined,
          })),
          correctAnswer: resolvedAllInReveal.correctAnswer,
          question: resolvedAllInReveal.question ?? "",
          value: 0,
          isPowerPlay: false,
        }}
        players={players}
        mySessionId={mySessionId}
      />
    );
  }

  return <WaitingScreen phase="all-in-reveal" gameId="brain-board" />;
}
