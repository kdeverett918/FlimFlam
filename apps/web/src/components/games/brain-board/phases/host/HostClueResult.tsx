"use client";

import type { PlayerData } from "@flimflam/shared";
import { useMotionFidelity } from "@flimflam/ui";
import { AnswerRevealSequence } from "../../shared/AnswerRevealSequence";
import type { ClueResultData } from "../../shared/bb-types";

interface HostClueResultProps {
  clueResult: ClueResultData;
  players: PlayerData[];
}

export function HostClueResult({ clueResult, players }: HostClueResultProps) {
  const { fidelity } = useMotionFidelity();

  return (
    <AnswerRevealSequence clueResult={clueResult} players={players} motionFidelity={fidelity} />
  );
}
