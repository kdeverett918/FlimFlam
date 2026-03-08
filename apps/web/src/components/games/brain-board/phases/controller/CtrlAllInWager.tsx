"use client";

import { NumberInput } from "@/components/controls/NumberInput";
import { WaitingScreen } from "@/components/game/WaitingScreen";

export interface CtrlAllInWagerProps {
  canWagerFinal: boolean;
  score: number;
  allInCategory: string;
  onSubmit: (wager: number) => void;
}

export function CtrlAllInWager({
  canWagerFinal,
  score,
  allInCategory,
  onSubmit,
}: CtrlAllInWagerProps) {
  if (!canWagerFinal) {
    return <WaitingScreen phase="all-in-wager" gameId="brain-board" />;
  }

  return (
    <div className="flex flex-col gap-4 pb-4 pt-4">
      <div className="mx-4 rounded-2xl border border-accent-brainboard/30 animate-all-in-glow">
        <div className="flex flex-col items-center gap-2 px-6 py-5">
          <p
            className="font-display text-2xl font-black uppercase text-accent-brainboard"
            style={{ textShadow: "0 0 24px oklch(0.68 0.22 265 / 0.5)" }}
          >
            All-In Round
          </p>
          {allInCategory && (
            <p className="font-display text-sm font-bold text-accent-brainboard uppercase">
              {allInCategory}
            </p>
          )}
          <p className="font-body text-xs text-text-muted">Risk it all on one final clue</p>
        </div>
      </div>
      <NumberInput min={0} max={score} label="Set your wager:" onSubmit={onSubmit} />
    </div>
  );
}
