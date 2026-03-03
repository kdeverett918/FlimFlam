"use client";

import { haptics } from "@flimflam/ui";
import { motion } from "motion/react";
import { useEffect } from "react";

interface MobileLetterResultProps {
  letter: string;
  count: number;
  inPuzzle: boolean;
  earned?: number;
  vowelCost?: number;
  streak?: number;
}

export function MobileLetterResult({
  letter,
  count,
  inPuzzle,
  earned = 0,
  vowelCost,
  streak = 0,
}: MobileLetterResultProps) {
  useEffect(() => {
    if (inPuzzle) haptics.celebrate();
    else haptics.error();
  }, [inPuzzle]);

  return (
    <div className="flex flex-col items-center gap-3 px-4 animate-fade-in-up">
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 25 }}
      >
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-xl border-2 font-display text-3xl font-black ${
            inPuzzle
              ? "border-emerald-400 bg-emerald-500/15 text-emerald-400"
              : "border-red-400 bg-red-500/15 text-red-400"
          }`}
        >
          {letter}
        </div>
      </motion.div>

      {inPuzzle ? (
        <div className="flex flex-col items-center gap-1">
          <p className="font-display text-lg font-bold text-emerald-400">
            {count}x! +${earned.toLocaleString()}
          </p>
          {vowelCost && (
            <p className="font-mono text-xs text-red-400">-${vowelCost.toLocaleString()}</p>
          )}
        </div>
      ) : (
        <p className="font-display text-base font-bold text-red-400">Not in the puzzle!</p>
      )}

      {streak >= 2 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="rounded-full bg-accent-luckyletters/15 px-3 py-1 font-display text-xs font-bold text-accent-luckyletters animate-pulse"
        >
          {streak} in a row!
        </motion.span>
      )}
    </div>
  );
}
