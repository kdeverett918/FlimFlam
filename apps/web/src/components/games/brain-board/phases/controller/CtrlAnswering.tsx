"use client";

import { TextInput } from "@/components/controls/TextInput";
import { GlassPanel } from "@flimflam/ui";

export interface CtrlAnsweringProps {
  hasAnswered: boolean;
  clueQuestion: string;
  clueCategory: string;
  clueValue: number;
  answeredCount: number;
  totalPlayerCount: number;
  onSubmit: (answer: string) => void;
  errorNonce?: number;
}

export function CtrlAnswering({
  hasAnswered,
  clueQuestion,
  clueCategory,
  clueValue,
  answeredCount,
  totalPlayerCount,
  onSubmit,
  errorNonce,
}: CtrlAnsweringProps) {
  if (hasAnswered) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 pb-4 pt-4">
        <GlassPanel className="flex w-full max-w-sm flex-col items-center gap-3 px-6 py-5">
          <p className="font-display text-lg font-bold text-accent-brainboard">Locked In!</p>
          <p className="text-center font-body text-sm text-text-muted">{clueQuestion}</p>
          {totalPlayerCount > 0 && (
            <div className="mt-2 flex flex-col items-center gap-1">
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-accent-brainboard transition-all duration-500"
                  style={{
                    width: `${totalPlayerCount > 0 ? (answeredCount / totalPlayerCount) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="font-mono text-xs text-text-dim">
                {answeredCount}/{totalPlayerCount} answered
              </p>
            </div>
          )}
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-4 pt-4">
      {clueCategory && (
        <div className="mx-4 flex justify-center">
          <span className="rounded-lg border border-accent-brainboard/30 bg-accent-brainboard/15 px-4 py-2 font-display text-sm font-bold text-accent-brainboard uppercase">
            {clueCategory} — ${clueValue}
          </span>
        </div>
      )}
      {clueQuestion && (
        <div className="px-4">
          <GlassPanel glow glowColor="oklch(0.68 0.22 265 / 0.2)" className="px-4 py-4">
            <p className="text-center font-body text-lg font-medium text-text-primary">
              {clueQuestion}
            </p>
          </GlassPanel>
        </div>
      )}
      <TextInput
        prompt="Your answer:"
        placeholder="Answer..."
        onSubmit={onSubmit}
        resetNonce={errorNonce}
      />
    </div>
  );
}
