"use client";

import { GlassPanel, haptics, useReducedMotion } from "@flimflam/ui";
import { motion } from "motion/react";
import type React from "react";

import { MobileWheel } from "@/components/controls/MobileWheel";
import { SpinResult as MobileSpinResult } from "@/components/controls/SpinResult";

import type { SpinResultData, SpinSegment } from "../../shared/ll-types";

function getSegmentGlowColor(type: string): string {
  switch (type) {
    case "cash":
      return "oklch(0.82 0.18 85 / 0.3)";
    case "bust":
      return "oklch(0.68 0.25 20 / 0.3)";
    case "pass":
      return "oklch(0.75 0.15 70 / 0.2)";
    case "wild":
      return "oklch(0.7 0.25 290 / 0.3)";
    default:
      return "oklch(0.82 0.18 85 / 0.2)";
  }
}

export function CtrlSpinning({
  isMyTurn,
  mobilePuzzle,
  roundCash,
  visibleSpinSegment,
  sharedSpinResult,
  turnPlayerName,
  canBuyVowel,
  onSpin,
  onChooseBuyVowel,
  onChooseSolve,
}: {
  isMyTurn: boolean;
  mobilePuzzle: React.ReactNode;
  roundCash: number;
  visibleSpinSegment: SpinSegment | null;
  sharedSpinResult: SpinResultData | null;
  turnPlayerName: string;
  canBuyVowel: boolean;
  onSpin: () => void;
  onChooseBuyVowel: () => void;
  onChooseSolve: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const safeScrollMarginBottom = "calc(var(--hud-safe-bottom, env(safe-area-inset-bottom)) + 1rem)";

  const handleSpin = () => {
    haptics.tap();
    onSpin();
  };

  if (isMyTurn) {
    return (
      <div
        className="flex flex-col gap-4 px-4 pt-2"
        style={{
          paddingBottom: "calc(var(--hud-safe-bottom, env(safe-area-inset-bottom)) + 0.75rem)",
        }}
      >
        {mobilePuzzle}
        {roundCash > 0 && (
          <motion.div
            className="flex justify-center"
            animate={
              !reducedMotion
                ? {
                    scale: [1, 1.03, 1],
                  }
                : undefined
            }
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          >
            <span className="rounded-full bg-red-500/10 px-3 py-1 font-mono text-xs font-bold text-red-400">
              At Risk: ${roundCash.toLocaleString()}
            </span>
          </motion.div>
        )}
        {visibleSpinSegment && (
          <motion.div
            initial={reducedMotion ? {} : { scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={
              !reducedMotion
                ? {
                    boxShadow: `0 0 20px ${getSegmentGlowColor(visibleSpinSegment.type)}`,
                    borderRadius: 12,
                  }
                : undefined
            }
          >
            <MobileSpinResult
              segment={visibleSpinSegment}
              currentTurnName="You"
              isMyTurn={true}
              roundCashAtRisk={roundCash}
            />
          </motion.div>
        )}
        <MobileWheel
          onSpin={handleSpin}
          spinResult={sharedSpinResult ? { angle: sharedSpinResult.angle } : null}
          landedSegment={visibleSpinSegment}
        />
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          {canBuyVowel && (
            <motion.button
              type="button"
              onClick={() => {
                haptics.tap();
                onChooseBuyVowel();
              }}
              data-testid="lucky-buy-vowel-action"
              className="min-h-[48px] rounded-xl border border-accent-luckyletters/40 bg-accent-luckyletters/15 px-5 py-2 font-display text-sm font-bold text-accent-luckyletters uppercase tracking-wider transition-all active:scale-95"
              style={{ scrollMarginBottom: safeScrollMarginBottom }}
              whileTap={reducedMotion ? {} : { scale: 0.95 }}
            >
              Buy a Vowel ($250)
            </motion.button>
          )}
          <motion.button
            type="button"
            onClick={() => {
              haptics.tap();
              onChooseSolve();
            }}
            data-testid="lucky-solve-action"
            className="min-h-[48px] rounded-xl border border-primary/40 bg-primary/15 px-5 py-2 font-display text-sm font-bold text-primary uppercase tracking-wider transition-all active:scale-95"
            style={{ scrollMarginBottom: safeScrollMarginBottom }}
            whileTap={reducedMotion ? {} : { scale: 0.95 }}
          >
            Solve
          </motion.button>
        </div>
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
          {turnPlayerName}&apos;s turn
        </p>
      </GlassPanel>
      {visibleSpinSegment && (
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <MobileSpinResult
            segment={visibleSpinSegment}
            currentTurnName={turnPlayerName}
            isMyTurn={false}
          />
        </motion.div>
      )}
    </div>
  );
}
