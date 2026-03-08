"use client";

import { WaitingScreen } from "@/components/game/WaitingScreen";
import type { PlayerData } from "@flimflam/shared";
import { ClueResultController } from "../../shared/ClueResultController";
import type { ClueResultData, ClueResultEntry } from "../../shared/bb-types";

export interface CtrlClueResultProps {
  clueResult: ClueResultData | null;
  boardStateClueResult: ClueResultData | null | undefined;
  gameEvents: Record<string, Record<string, unknown>>;
  players: PlayerData[];
  mySessionId: string | null;
}

export function CtrlClueResult({
  clueResult,
  boardStateClueResult,
  gameEvents,
  players,
  mySessionId,
}: CtrlClueResultProps) {
  const clueResultEvent = (gameEvents?.["clue-result"] ?? null) as {
    results?: ClueResultEntry[];
    correctAnswer?: string;
    question?: string;
    value?: number;
    isPowerPlay?: boolean;
  } | null;

  const resolvedClueResult =
    clueResult ??
    boardStateClueResult ??
    (clueResultEvent?.results && clueResultEvent.correctAnswer
      ? {
          results: clueResultEvent.results,
          correctAnswer: clueResultEvent.correctAnswer,
          question: clueResultEvent.question ?? "",
          value: clueResultEvent.value ?? 0,
          isPowerPlay: clueResultEvent.isPowerPlay ?? false,
        }
      : null);

  if (resolvedClueResult) {
    return (
      <ClueResultController
        clueResult={resolvedClueResult}
        players={players}
        mySessionId={mySessionId}
      />
    );
  }

  return <WaitingScreen phase="clue-result" gameId="brain-board" />;
}
