"use client";

import { GlassPanel } from "@flimflam/ui";
import type React from "react";

import { LetterPicker } from "@/components/controls/LetterPicker";
import { MobileWheel } from "@/components/controls/MobileWheel";
import { TextInput } from "@/components/controls/TextInput";

import type { SpinResultData, SpinSegment } from "../../shared/ll-types";

export function CtrlGuessing({
  phase,
  isMyTurn,
  mobilePuzzle,
  usedLetters,
  roundCash,
  turnPlayerName,
  sharedSpinResult,
  visibleSpinSegment,
  errorNonce,
  onConsonantPick,
  onVowelPick,
  onSolveSubmit,
}: {
  phase: string;
  isMyTurn: boolean;
  mobilePuzzle: React.ReactNode;
  usedLetters: Set<string>;
  roundCash: number;
  turnPlayerName: string;
  sharedSpinResult: SpinResultData | null;
  visibleSpinSegment: SpinSegment | null;
  errorNonce?: number;
  onConsonantPick: (letter: string) => void;
  onVowelPick: (letter: string) => void;
  onSolveSubmit: (text: string) => void;
}) {
  // ── Guess Consonant ──
  if (phase === "guess-consonant") {
    if (isMyTurn) {
      return (
        <div className="flex flex-col gap-3 pb-4 pt-2">
          {mobilePuzzle}
          <LetterPicker mode="consonant" usedLetters={usedLetters} onPick={onConsonantPick} />
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-4 pb-4 pt-4">
        {mobilePuzzle}
        <GlassPanel
          data-testid="controller-context-card"
          className="mx-4 flex flex-col items-center gap-2 px-4 py-3"
        >
          <p className="text-center font-body text-sm text-text-muted">
            {turnPlayerName} is picking a consonant...
          </p>
        </GlassPanel>
      </div>
    );
  }

  // ── Buy Vowel ──
  if (phase === "buy-vowel") {
    if (isMyTurn) {
      return (
        <div className="flex flex-col gap-3 pb-4 pt-2">
          {mobilePuzzle}
          <LetterPicker
            mode="vowel"
            usedLetters={usedLetters}
            onPick={onVowelPick}
            roundCash={roundCash}
          />
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-4 pb-4 pt-4">
        {mobilePuzzle}
        <GlassPanel
          data-testid="controller-context-card"
          className="mx-4 flex flex-col items-center gap-2 px-4 py-3"
        >
          <p className="text-center font-body text-sm text-text-muted">
            {turnPlayerName} is buying a vowel...
          </p>
        </GlassPanel>
      </div>
    );
  }

  // ── Solve Attempt ──
  if (isMyTurn) {
    return (
      <div className="flex flex-col gap-3 pb-4 pt-2">
        {mobilePuzzle}
        <TextInput
          prompt="Solve the puzzle:"
          placeholder="Type the full phrase..."
          onSubmit={onSolveSubmit}
          resetNonce={errorNonce}
        />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4 pb-4 pt-4">
      {mobilePuzzle}
      <MobileWheel
        onSpin={() => {}}
        spinResult={sharedSpinResult ? { angle: sharedSpinResult.angle } : null}
        landedSegment={visibleSpinSegment}
        disabled
      />
      <GlassPanel
        data-testid="controller-context-card"
        className="mx-4 flex flex-col items-center gap-2 px-4 py-3"
      >
        <p className="text-center font-body text-sm text-text-muted">
          {turnPlayerName} is solving...
        </p>
      </GlassPanel>
    </div>
  );
}
