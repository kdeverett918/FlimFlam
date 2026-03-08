"use client";

import { ANIMATION_DURATIONS, ANIMATION_EASINGS, AnimatedCounter } from "@flimflam/ui";
import { fireParticleEffect } from "@flimflam/ui";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { RevealedAnswer, SurveyAnswer } from "./ss-types";

interface AnswerBoardProps {
  totalCount: number;
  revealedAnswers: RevealedAnswer[];
  allAnswers?: SurveyAnswer[];
  showAll?: boolean;
  maxRevealRank?: number;
  revealStep?: number;
  reducedMotion?: boolean;
}

export function AnswerBoard({
  totalCount,
  revealedAnswers,
  allAnswers,
  showAll,
  maxRevealRank,
  revealStep: _revealStep,
  reducedMotion = false,
}: AnswerBoardProps) {
  const revealedRanks = new Set(revealedAnswers.map((a) => a.rank));
  const rows = Array.from({ length: totalCount }, (_, i) => i + 1);
  const [goldenFlashRank, setGoldenFlashRank] = useState<number | null>(null);
  const prevRevealedRef = useRef<Set<number>>(new Set());
  const tileRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Detect newly revealed tiles to fire particles and golden flash
  // biome-ignore lint/correctness/useExhaustiveDependencies: revealedRanks is derived from revealedAnswers each render; we track changes via prevRevealedRef
  useEffect(() => {
    if (reducedMotion) return;
    const prev = prevRevealedRef.current;
    const allRevealed = new Set<number>();

    // Build set of all currently visible ranks
    for (const rank of rows) {
      const isRevealed = revealedRanks.has(rank);
      const fullAnswer = allAnswers?.find((a) => a.rank === rank);
      const canSequentiallyReveal = typeof maxRevealRank === "number";
      const shouldShow =
        isRevealed ||
        (showAll &&
          fullAnswer &&
          (!canSequentiallyReveal || rank <= (maxRevealRank ?? Number.POSITIVE_INFINITY)));
      if (shouldShow) allRevealed.add(rank);
    }

    // Fire effects for newly revealed
    for (const rank of allRevealed) {
      if (!prev.has(rank)) {
        setGoldenFlashRank(rank);
        setTimeout(() => setGoldenFlashRank(null), 500);

        // Fire particle burst at tile position
        const tileEl = tileRefs.current.get(rank);
        if (tileEl) {
          const rect = tileEl.getBoundingClientRect();
          void fireParticleEffect("sparkle-trail", {
            origin: {
              x: (rect.left + rect.width / 2) / window.innerWidth,
              y: (rect.top + rect.height / 2) / window.innerHeight,
            },
            scale: 0.5,
          });
        }
      }
    }

    prevRevealedRef.current = allRevealed;
  }, [revealedRanks, maxRevealRank, showAll, allAnswers, reducedMotion, rows, totalCount]);

  const setTileRef = useCallback((rank: number, el: HTMLDivElement | null) => {
    if (el) {
      tileRefs.current.set(rank, el);
    } else {
      tileRefs.current.delete(rank);
    }
  }, []);

  return (
    <div data-testid="survey-answer-board" className="flex w-full max-w-3xl flex-col gap-2">
      {rows.map((rank) => {
        const revealed = revealedAnswers.find((a) => a.rank === rank);
        const fullAnswer = allAnswers?.find((a) => a.rank === rank);
        const isRevealed = revealedRanks.has(rank);
        const canSequentiallyReveal = typeof maxRevealRank === "number";
        const shouldShow =
          isRevealed ||
          (showAll &&
            fullAnswer &&
            (!canSequentiallyReveal || rank <= (maxRevealRank ?? Number.POSITIVE_INFINITY)));
        const answer = revealed ?? fullAnswer;
        const isGoldenFlash = goldenFlashRank === rank;
        return (
          <motion.div
            key={rank}
            ref={(el) => setTileRef(rank, el)}
            data-testid="survey-answer-tile"
            data-rank={rank}
            className="relative overflow-hidden rounded-lg"
          >
            <AnimatePresence mode="wait">
              {shouldShow && answer ? (
                <motion.div
                  key={`revealed-${rank}`}
                  initial={reducedMotion ? { opacity: 0 } : { rotateX: -90, opacity: 0 }}
                  animate={reducedMotion ? { opacity: 1 } : { rotateX: 0, opacity: 1 }}
                  transition={{
                    duration: reducedMotion
                      ? ANIMATION_DURATIONS.standard
                      : ANIMATION_DURATIONS.cardFlip,
                    ease: ANIMATION_EASINGS.crispOut,
                  }}
                  className="relative flex items-center justify-between rounded-lg border-2 border-accent-surveysmash/40 bg-bg-elevated px-6 py-4"
                  style={
                    isGoldenFlash && !reducedMotion
                      ? {
                          boxShadow:
                            "0 0 24px oklch(0.82 0.18 85 / 0.5), inset 0 0 12px oklch(0.82 0.18 85 / 0.15)",
                        }
                      : undefined
                  }
                >
                  {/* Golden flash overlay */}
                  {isGoldenFlash && !reducedMotion && (
                    <motion.div
                      initial={{ opacity: 0.5 }}
                      animate={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background:
                          "linear-gradient(135deg, oklch(0.82 0.18 85 / 0.3), oklch(0.82 0.18 85 / 0.05))",
                      }}
                    />
                  )}
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full font-display text-sm font-bold"
                      style={
                        isGoldenFlash && !reducedMotion
                          ? {
                              backgroundColor: "oklch(0.82 0.18 85 / 0.3)",
                              color: "oklch(0.82 0.18 85)",
                              boxShadow: "0 0 12px oklch(0.82 0.18 85 / 0.4)",
                            }
                          : {
                              backgroundColor: "oklch(0.68 0.25 25 / 0.2)",
                              color: "oklch(0.68 0.25 25)",
                            }
                      }
                    >
                      {rank}
                    </span>
                    <span className="font-display text-[clamp(18px,2.5vw,28px)] font-bold text-text-primary">
                      {answer.text}
                    </span>
                  </div>
                  <AnimatedCounter
                    value={answer.points}
                    duration={600}
                    className="text-[clamp(20px,2.5vw,28px)] font-bold text-accent-surveysmash"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key={`hidden-${rank}`}
                  className="relative flex items-center justify-between rounded-lg border border-white/12 bg-bg-surface px-6 py-4 overflow-hidden"
                >
                  {/* Shimmer sweep for unrevealed slots */}
                  {!reducedMotion && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          "linear-gradient(135deg, transparent 30%, oklch(1 0 0 / 0.04) 50%, transparent 70%)",
                        animation: "shimmerSweep 3s ease-in-out infinite",
                        animationDelay: `${rank * 0.4}s`,
                      }}
                    />
                  )}
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 font-display text-sm font-bold text-text-muted">
                      {rank}
                    </span>
                    <span className="font-body text-[clamp(16px,2vw,24px)] text-text-dim">
                      ? ? ?
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
      <style>{`
        @keyframes shimmerSweep {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
