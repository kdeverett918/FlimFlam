"use client";

import type { PlayerData } from "@flimflam/shared";
import { GlassPanel } from "@flimflam/ui";
import type React from "react";

import { LetterPicker } from "@/components/controls/LetterPicker";
import { TextInput } from "@/components/controls/TextInput";

export function CtrlBonusRound({
  isBonusPlayer,
  bonusPlayerSessionId,
  players,
  mobilePuzzle,
  usedLetters,
  controllerBonusPickConfirmed,
  onBonusPick,
  onBonusSolve,
}: {
  isBonusPlayer: boolean;
  bonusPlayerSessionId: string | null;
  players: PlayerData[];
  mobilePuzzle: React.ReactNode;
  usedLetters: Set<string>;
  controllerBonusPickConfirmed: { letter: string; pickedSoFar: string[] } | undefined;
  onBonusPick: (letter: string) => void;
  onBonusSolve: (text: string) => void;
}) {
  const bonusName = players.find((p) => p.sessionId === bonusPlayerSessionId)?.name ?? "Player";

  if (isBonusPlayer) {
    const pickedLetters = controllerBonusPickConfirmed?.pickedSoFar ?? [];
    return (
      <div className="flex flex-col gap-3 pb-4 pt-2">
        <p
          className="text-center font-display text-xl font-black uppercase"
          style={{
            color: "oklch(0.78 0.2 85)",
            textShadow: "0 0 24px oklch(0.78 0.2 85 / 0.5)",
          }}
        >
          Bonus Round!
        </p>
        {mobilePuzzle}
        {pickedLetters.length > 0 && (
          <div className="flex items-center justify-center gap-1 px-4">
            <span className="font-body text-xs text-text-muted">Picked:</span>
            {pickedLetters.map((l) => (
              <span
                key={l}
                className="flex h-7 w-7 items-center justify-center rounded border border-accent-luckyletters/40 bg-accent-luckyletters/15 font-display text-xs font-bold text-accent-luckyletters"
              >
                {l}
              </span>
            ))}
          </div>
        )}
        <LetterPicker mode="bonus" usedLetters={usedLetters} onPick={onBonusPick} />
        <div className="px-4">
          <TextInput
            prompt="Solve the bonus puzzle:"
            placeholder="Type the full phrase..."
            onSubmit={onBonusSolve}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-4 pt-4">
      <p
        className="text-center font-display text-xl font-black uppercase"
        style={{ color: "oklch(0.78 0.2 85)", textShadow: "0 0 24px oklch(0.78 0.2 85 / 0.5)" }}
      >
        Bonus Round!
      </p>
      {mobilePuzzle}
      <GlassPanel
        data-testid="controller-context-card"
        className="mx-4 flex flex-col items-center gap-2 px-4 py-3"
      >
        <p className="text-center font-body text-sm text-text-muted">
          {bonusName} is playing for $25,000!
        </p>
      </GlassPanel>
    </div>
  );
}
