"use client";

import type { PlayerData } from "@flimflam/shared";
import { motion } from "motion/react";
import type React from "react";

import { HostPuzzleBoard } from "../../shared/HostPuzzleBoard";
import { PlayerAvatar, getPlayerColor, getPlayerName } from "../../shared/ll-helpers";
import type { WheelGameState } from "../../shared/ll-types";

export function HostGuessing({
  phase,
  state,
  players,
  reducedMotion,
  standingsBar,
}: {
  phase: string;
  state: WheelGameState;
  players: PlayerData[];
  reducedMotion: boolean;
  standingsBar: React.ReactNode;
}) {
  const currentName = getPlayerName(players, state.currentTurnSessionId);
  const currentColor = getPlayerColor(players, state.currentTurnSessionId);
  const label =
    phase === "guess-consonant"
      ? "Pick a consonant!"
      : phase === "buy-vowel"
        ? "Buying a vowel... ($250)"
        : "Solving the puzzle...";
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8">
      <HostPuzzleBoard
        display={state.puzzleDisplay}
        category={state.category}
        reducedMotion={reducedMotion}
      />
      <div className="flex items-center gap-4 mt-4">
        <PlayerAvatar name={currentName} color={currentColor} size={56} />
        <span className="font-display text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary">
          {currentName}
        </span>
      </div>
      <motion.span
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
        className="font-display text-[clamp(24px,3vw,36px)] text-accent-luckyletters"
      >
        {label}
      </motion.span>
      {phase === "guess-consonant" && state.wildActive && (
        <span className="font-display text-[clamp(20px,2.5vw,28px)] text-success font-bold">
          WILD!
        </span>
      )}
      {standingsBar}
    </div>
  );
}
