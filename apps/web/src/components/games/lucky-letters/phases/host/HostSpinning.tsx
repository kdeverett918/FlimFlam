"use client";

import type { PlayerData } from "@flimflam/shared";
import type React from "react";

import { HostPuzzleBoard } from "../../shared/HostPuzzleBoard";
import { HostWheelSpinner } from "../../shared/HostWheelSpinner";
import { PlayerAvatar, getPlayerColor, getPlayerName } from "../../shared/ll-helpers";
import type { SpinResultData, WheelGameState } from "../../shared/ll-types";

export function HostSpinning({
  state,
  players,
  highlightLetters,
  reducedMotion,
  isSpinning,
  spinResult,
  standingsBar,
}: {
  state: WheelGameState;
  players: PlayerData[];
  highlightLetters: Set<string>;
  reducedMotion: boolean;
  isSpinning: boolean;
  spinResult: SpinResultData | null;
  standingsBar: React.ReactNode;
}) {
  const currentName = getPlayerName(players, state.currentTurnSessionId);
  const currentColor = getPlayerColor(players, state.currentTurnSessionId);
  const lastSpin = state.lastSpinResult;
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8">
      <HostPuzzleBoard
        display={state.puzzleDisplay}
        category={state.category}
        highlightLetters={highlightLetters}
        reducedMotion={reducedMotion}
      />
      <div className="flex items-center gap-6 mt-4">
        <HostWheelSpinner
          spinning={isSpinning}
          angle={spinResult?.angle ?? 0}
          landed={
            spinResult?.segment
              ? { type: spinResult.segment.type, label: spinResult.segment.label }
              : !isSpinning && lastSpin
                ? { type: lastSpin.segment.type, label: lastSpin.segment.label }
                : null
          }
        />
        <div className="flex flex-col items-center gap-3">
          <PlayerAvatar name={currentName} color={currentColor} size={72} />
          <span className="font-display text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary">
            {currentName}
          </span>
          {lastSpin && !isSpinning && (
            <span
              data-testid="lucky-prize-label"
              className={`font-display text-[clamp(24px,3vw,36px)] font-bold ${lastSpin.segment.type === "bust" ? "text-accent-6" : lastSpin.segment.type === "pass" ? "text-warning" : lastSpin.segment.type === "wild" ? "text-success" : "text-accent-luckyletters"}`}
            >
              {lastSpin.segment.label}
            </span>
          )}
          {!lastSpin && !isSpinning && (
            <span className="font-body text-[clamp(20px,2.5vw,28px)] text-text-muted">
              Spin, buy a vowel, or solve!
            </span>
          )}
        </div>
      </div>
      {standingsBar}
    </div>
  );
}
