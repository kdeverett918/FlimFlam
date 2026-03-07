"use client";

import { haptics } from "@flimflam/ui";
import { motion } from "motion/react";
import { useEffect } from "react";

interface LetterResultProps {
  letter: string;
  count: number;
  inPuzzle: boolean;
  earned?: number;
  vowelCost?: number;
  streak?: number;
}

export function LetterResult({
  letter,
  count,
  inPuzzle,
  earned = 0,
  vowelCost,
  streak = 0,
}: LetterResultProps) {
  useEffect(() => {
    if (inPuzzle) haptics.celebrate();
    else haptics.error();
  }, [inPuzzle]);

  return (
    <div className="flex flex-col items-center gap-3 px-4 animate-fade-in-up">
      <motion.div
        data-reveal-style="cinematic-pop"
        initial={{ scale: 0, rotate: -10, y: 18, opacity: 0 }}
        animate={{
          scale: [0.7, 1.14, 1],
          rotate: [-10, 3, 0],
          y: [18, -4, 0],
          opacity: 1,
        }}
        transition={{ type: "spring", stiffness: 420, damping: 22 }}
        className="relative"
      >
        {inPuzzle && (
          <motion.div
            aria-hidden="true"
            className="absolute inset-[-14px] rounded-[22px] bg-emerald-400/25 blur-xl"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.15, 1.5] }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          />
        )}
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
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.25 }}
            className="font-display text-lg font-bold text-emerald-400"
          >
            {count}x! +${earned.toLocaleString()}
          </motion.p>
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
