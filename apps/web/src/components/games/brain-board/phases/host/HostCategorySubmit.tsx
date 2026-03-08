"use client";

import { ConfettiBurst, GlassPanel, sounds } from "@flimflam/ui";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { BrainBoardGameState } from "../../shared/bb-types";

interface HostCategorySubmitProps {
  submissions: NonNullable<BrainBoardGameState["submissions"]>;
}

export function HostCategorySubmit({ submissions }: HostCategorySubmitProps) {
  const submittedCount = Object.values(submissions).filter((s) => s.submitted).length;
  const totalCount = Object.keys(submissions).length;
  const prevSubmittedRef = useRef(0);
  const [allDone, setAllDone] = useState(false);

  useEffect(() => {
    if (submittedCount > prevSubmittedRef.current && submittedCount > 0) {
      sounds.cardFlip();
    }
    if (submittedCount === totalCount && totalCount > 0 && !allDone) {
      setAllDone(true);
      sounds.reveal();
    }
    prevSubmittedRef.current = submittedCount;
  }, [submittedCount, totalCount, allDone]);

  return (
    <div className="flex flex-col items-center justify-center gap-8 p-8">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-[clamp(36px,5vw,56px)] font-bold text-accent-brainboard"
        style={{ textShadow: "0 0 40px oklch(0.68 0.22 265 / 0.4)" }}
      >
        Pick Your Categories
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="font-body text-[clamp(18px,2.5vw,28px)] text-text-muted"
      >
        {submittedCount}/{totalCount} players submitted
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex w-full max-w-3xl flex-wrap justify-center gap-4"
        style={{ perspective: "800px" }}
      >
        {Object.entries(submissions).map(([sid, info]) => (
          <motion.div
            key={sid}
            animate={info.submitted ? { rotateY: [0, 0] } : {}}
            style={{ transformStyle: "preserve-3d" }}
          >
            <GlassPanel
              glow={info.submitted}
              glowColor={info.submitted ? "oklch(0.68 0.22 265 / 0.2)" : undefined}
              className={`px-6 py-4 ${info.submitted ? "border border-accent-brainboard/30" : ""}`}
            >
              <p className="font-display text-sm font-bold uppercase tracking-wider text-text-muted">
                {info.name}
              </p>
              {info.submitted && info.categories ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {info.categories.map((c) => (
                    <motion.span
                      key={c}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="rounded-full bg-accent-brainboard/20 px-3 py-1 font-body text-[clamp(14px,1.5vw,20px)] text-accent-brainboard"
                    >
                      {c}
                    </motion.span>
                  ))}
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-white/20 animate-pulse" />
                  <span className="font-body text-[clamp(14px,1.5vw,20px)] text-text-dim">
                    Thinking...
                  </span>
                </div>
              )}
            </GlassPanel>
          </motion.div>
        ))}
      </motion.div>
      <ConfettiBurst trigger={allDone} preset="correct" />
    </div>
  );
}
