"use client";

import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import type React from "react";

import { LetterResult as MobileLetterResult } from "@/components/controls/LetterResult";
import { haptics, useReducedMotion } from "@flimflam/ui";

export function CtrlLetterResult({
  mobilePuzzle,
  controllerLetterResult,
  streak,
}: {
  mobilePuzzle: React.ReactNode;
  controllerLetterResult:
    | {
        letter: string;
        count: number;
        inPuzzle: boolean;
        earned: number;
        vowelCost?: number;
        streak?: number;
      }
    | undefined;
  streak: number;
}) {
  const reducedMotion = useReducedMotion();
  const hasReactedRef = useRef(false);

  // Celebration tier haptics on mount based on match count
  useEffect(() => {
    if (!controllerLetterResult || hasReactedRef.current) return;
    hasReactedRef.current = true;

    if (controllerLetterResult.inPuzzle) {
      if (controllerLetterResult.count >= 4) {
        haptics.celebrate();
      } else if (controllerLetterResult.count >= 2) {
        haptics.confirm();
      } else {
        haptics.tap();
      }
    } else {
      haptics.error();
    }
  }, [controllerLetterResult]);

  // Reset reaction ref when letter changes
  const currentLetter = controllerLetterResult?.letter;
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset trigger when letter changes
  useEffect(() => {
    hasReactedRef.current = false;
  }, [currentLetter]);

  const celebrationTier = controllerLetterResult
    ? controllerLetterResult.count >= 4
      ? "full"
      : controllerLetterResult.count >= 2
        ? "medium"
        : "subtle"
    : "subtle";

  return (
    <div className="flex flex-col gap-4 pb-4 pt-4">
      {mobilePuzzle}
      {controllerLetterResult && (
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <MobileLetterResult
            letter={controllerLetterResult.letter}
            count={controllerLetterResult.count}
            inPuzzle={controllerLetterResult.inPuzzle}
            earned={controllerLetterResult.earned}
            vowelCost={controllerLetterResult.vowelCost}
            streak={controllerLetterResult.streak ?? streak}
          />

          {/* Celebration tier feedback badge */}
          {controllerLetterResult.inPuzzle && controllerLetterResult.count >= 2 && (
            <motion.div
              className="mt-2 flex justify-center"
              initial={reducedMotion ? {} : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: 0.3,
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
            >
              <span
                className={`rounded-full px-4 py-1 font-display text-sm font-bold uppercase tracking-wider ${
                  celebrationTier === "full"
                    ? "bg-accent-luckyletters/20 text-accent-luckyletters"
                    : "bg-success/15 text-success"
                }`}
                style={
                  celebrationTier === "full" && !reducedMotion
                    ? { boxShadow: "0 0 12px oklch(0.78 0.2 85 / 0.3)" }
                    : undefined
                }
              >
                {celebrationTier === "full"
                  ? `${controllerLetterResult.count}x Match!`
                  : `${controllerLetterResult.count}x`}
              </span>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
