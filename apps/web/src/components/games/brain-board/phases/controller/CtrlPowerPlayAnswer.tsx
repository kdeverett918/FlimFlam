"use client";

import { TextInput } from "@/components/controls/TextInput";
import { WaitingScreen } from "@/components/game/WaitingScreen";
import { Zap } from "lucide-react";

export interface CtrlPowerPlayAnswerProps {
  isPowerPlayPlayer: boolean;
  clueQuestion: string;
  onSubmit: (answer: string) => void;
  errorNonce?: number;
}

export function CtrlPowerPlayAnswer({
  isPowerPlayPlayer,
  clueQuestion,
  onSubmit,
  errorNonce,
}: CtrlPowerPlayAnswerProps) {
  if (!isPowerPlayPlayer) {
    return <WaitingScreen phase="power-play-answer" gameId="brain-board" />;
  }

  return (
    <div className="flex flex-col gap-4 pb-4 pt-4">
      <div className="mx-4 rounded-2xl border border-amber-400/30 animate-power-play-pulse">
        <div className="flex flex-col items-center gap-2 px-6 py-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5" style={{ color: "oklch(0.82 0.2 85)" }} />
            <p
              className="font-display text-xl font-black uppercase"
              style={{
                color: "oklch(0.82 0.2 85)",
                textShadow: "0 0 24px oklch(0.82 0.2 85 / 0.5)",
              }}
            >
              Power Play!
            </p>
          </div>
          {clueQuestion && (
            <p className="text-center font-body text-sm text-text-primary">{clueQuestion}</p>
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
