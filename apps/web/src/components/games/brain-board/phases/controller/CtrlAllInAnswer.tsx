"use client";

import { TextInput } from "@/components/controls/TextInput";
import { WaitingScreen } from "@/components/game/WaitingScreen";

export interface CtrlAllInAnswerProps {
  canAnswerFinal: boolean;
  allInCategory: string;
  allInQuestion: string;
  onSubmit: (answer: string) => void;
  errorNonce?: number;
}

export function CtrlAllInAnswer({
  canAnswerFinal,
  allInCategory,
  allInQuestion,
  onSubmit,
  errorNonce,
}: CtrlAllInAnswerProps) {
  if (!canAnswerFinal) {
    return <WaitingScreen phase="all-in-answer" gameId="brain-board" />;
  }

  return (
    <div className="flex flex-col gap-4 pb-4 pt-4">
      <div className="mx-4 rounded-2xl border border-accent-brainboard/30 animate-all-in-glow">
        <div className="flex flex-col items-center gap-2 px-6 py-4">
          <p
            className="font-display text-xl font-black uppercase text-accent-brainboard"
            style={{ textShadow: "0 0 24px oklch(0.68 0.22 265 / 0.5)" }}
          >
            All-In Round
          </p>
          {allInCategory && (
            <p className="font-display text-xs font-bold text-accent-brainboard uppercase">
              {allInCategory}
            </p>
          )}
          {allInQuestion && (
            <p className="text-center font-body text-sm text-text-primary">{allInQuestion}</p>
          )}
        </div>
      </div>
      <TextInput
        prompt="Your answer:"
        placeholder="Answer..."
        onSubmit={onSubmit}
        resetNonce={errorNonce}
      />
    </div>
  );
}
