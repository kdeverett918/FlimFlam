"use client";

import { GlassPanel, sounds, useReducedMotion } from "@flimflam/ui";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

interface HostGeneratingBoardProps {
  topicPreview: string[];
}

const SKELETON_CATEGORIES = 6;
const CLUE_VALUES = [200, 400, 600, 800, 1000];

export function HostGeneratingBoard({ topicPreview }: HostGeneratingBoardProps) {
  const reducedMotion = useReducedMotion();
  const [showSkeleton, setShowSkeleton] = useState(reducedMotion);
  const [revealedHeaders, setRevealedHeaders] = useState(reducedMotion ? SKELETON_CATEGORIES : 0);
  const [revealedCells, setRevealedCells] = useState(
    reducedMotion ? SKELETON_CATEGORIES * CLUE_VALUES.length : 0,
  );

  useEffect(() => {
    if (reducedMotion) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Phase 1: Grid skeleton fades in
    timers.push(setTimeout(() => setShowSkeleton(true), 500));

    // Phase 2: Category headers typewriter in
    for (let i = 0; i < SKELETON_CATEGORIES; i++) {
      timers.push(
        setTimeout(
          () => {
            setRevealedHeaders(i + 1);
            sounds.tick();
          },
          1200 + i * 400,
        ),
      );
    }

    // Phase 3: Value cells cascade down
    const cellStartTime = 1200 + SKELETON_CATEGORIES * 400 + 200;
    let cellCount = 0;
    for (let row = 0; row < CLUE_VALUES.length; row++) {
      for (let col = 0; col < SKELETON_CATEGORIES; col++) {
        cellCount++;
        const capturedCount = cellCount;
        timers.push(
          setTimeout(
            () => {
              setRevealedCells(capturedCount);
              if (col === 0) sounds.cardFlip();
            },
            cellStartTime + row * 150 + col * 30,
          ),
        );
      }
    }

    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [reducedMotion]);

  return (
    <div className="flex flex-col items-center justify-center gap-8 p-8">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        className="h-20 w-20 rounded-full border-4 border-accent-brainboard/30 border-t-accent-brainboard"
      />
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-display text-[clamp(36px,5vw,56px)] font-bold text-accent-brainboard"
        style={{ textShadow: "0 0 40px oklch(0.68 0.22 265 / 0.4)" }}
      >
        Building Your Board
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="font-body text-[clamp(18px,2.5vw,28px)] text-text-muted"
      >
        AI is crafting custom trivia from your topics...
      </motion.p>

      {/* Board assembly skeleton */}
      {showSkeleton && (
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-4xl"
        >
          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({ length: SKELETON_CATEGORIES }).map((_, catIdx) => (
              <div key={`cat-${String(catIdx)}`} className="flex flex-col gap-1.5">
                <motion.div
                  initial={reducedMotion ? {} : { opacity: 0, clipPath: "inset(0 100% 0 0)" }}
                  animate={
                    catIdx < revealedHeaders
                      ? { opacity: 1, clipPath: "inset(0 0% 0 0)" }
                      : { opacity: 0, clipPath: "inset(0 100% 0 0)" }
                  }
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex min-h-[40px] items-center justify-center rounded-md border border-accent-brainboard/20 bg-accent-brainboard/10 px-1 py-1.5 text-center font-display text-sm font-bold text-accent-brainboard/50 uppercase leading-tight"
                >
                  ???
                </motion.div>
                {CLUE_VALUES.map((value) => {
                  const rowIdx = CLUE_VALUES.indexOf(value);
                  const cellIndex = rowIdx * SKELETON_CATEGORIES + catIdx;
                  const isRevealed = cellIndex < revealedCells;
                  return (
                    <motion.div
                      key={`cell-${catIdx}-${value}`}
                      initial={reducedMotion ? {} : { opacity: 0, rotateX: -90 }}
                      animate={
                        isRevealed ? { opacity: 1, rotateX: 0 } : { opacity: 0, rotateX: -90 }
                      }
                      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                      style={{ perspective: "600px", transformStyle: "preserve-3d" }}
                      className="flex min-h-[48px] items-center justify-center rounded-lg border border-accent-brainboard/15 bg-accent-brainboard/5 font-mono text-sm font-bold text-accent-3/30"
                    >
                      {isRevealed ? `$${value}` : ""}
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {topicPreview.length > 0 && (
        <GlassPanel className="w-full max-w-3xl px-6 py-4">
          <p className="font-display text-sm font-bold uppercase tracking-wider text-accent-brainboard">
            Building From
          </p>
          <div data-testid="brainboard-topic-chips" className="mt-3 flex flex-wrap gap-2">
            {topicPreview.map((topic) => (
              <span
                key={topic}
                className="rounded-full border border-accent-brainboard/35 bg-accent-brainboard/15 px-3 py-1 font-body text-[clamp(13px,1.5vw,18px)] text-accent-brainboard"
              >
                {topic}
              </span>
            ))}
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
