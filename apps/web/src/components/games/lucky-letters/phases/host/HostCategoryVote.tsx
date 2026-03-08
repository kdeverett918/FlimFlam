"use client";

import { GlassPanel, sounds, useReducedMotion } from "@flimflam/ui";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef } from "react";

import type { CategoryVoteTally, WheelGameState } from "../../shared/ll-types";

export function HostCategoryVote({
  state,
  categoryVoteTally,
}: {
  state: WheelGameState;
  categoryVoteTally: CategoryVoteTally | null;
}) {
  const reducedMotion = useReducedMotion();
  const categories = state.availableCategories ?? [];
  const voteCounts = categoryVoteTally?.voteCounts ?? {};
  const votedCount = categoryVoteTally?.votedCount ?? 0;
  const totalVoters = categoryVoteTally?.totalVoters ?? 0;

  // Track the leading category
  const leadingCategory = useMemo(() => {
    let maxVotes = 0;
    let leader: string | null = null;
    for (const cat of categories) {
      const v = voteCounts[cat] ?? 0;
      if (v > maxVotes) {
        maxVotes = v;
        leader = cat;
      }
    }
    return leader;
  }, [categories, voteCounts]);

  // Track previous vote count to play sound on change
  const prevVotedRef = useRef(0);
  useEffect(() => {
    if (votedCount > prevVotedRef.current) {
      sounds.select();
    }
    prevVotedRef.current = votedCount;
  }, [votedCount]);

  // Determine if voting is complete
  const allVoted = totalVoters > 0 && votedCount >= totalVoters;

  return (
    <div className="flex flex-col items-center justify-center gap-8 p-8">
      <motion.h1
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 100 }}
        className="font-display text-[clamp(40px,5.5vw,64px)] font-black text-accent-luckyletters"
        style={{ textShadow: "0 0 30px oklch(0.78 0.2 85 / 0.5)" }}
      >
        Choose Your Categories
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="font-body text-[clamp(18px,2.5vw,28px)] text-text-muted"
      >
        Vote on your phones! ({votedCount}/{totalVoters} voted)
      </motion.p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 max-w-4xl">
        {categories.map((cat, index) => {
          const votes = voteCounts[cat] ?? 0;
          const isLeader = cat === leadingCategory && votes > 0;

          return (
            <motion.div
              key={cat}
              initial={reducedMotion ? {} : { opacity: 0, y: 30 }}
              animate={{
                opacity: allVoted && !isLeader ? 0.3 : 1,
                y: 0,
              }}
              transition={{
                delay: reducedMotion ? 0 : index * 0.1,
                duration: 0.4,
                ease: "easeOut",
              }}
            >
              <GlassPanel
                className={`flex flex-col items-center gap-2 px-6 py-4 transition-all duration-300 ${
                  isLeader
                    ? "border-accent-luckyletters/80"
                    : votes > 0
                      ? "border-accent-luckyletters/40"
                      : ""
                }`}
                style={
                  isLeader && !reducedMotion
                    ? {
                        boxShadow: "0 0 20px oklch(0.78 0.2 85 / 0.3)",
                      }
                    : undefined
                }
              >
                {/* Pulsing gold border for leader */}
                {isLeader && !reducedMotion && (
                  <motion.div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{
                      border: "2px solid oklch(0.82 0.18 85 / 0.6)",
                      borderRadius: "inherit",
                    }}
                    animate={{
                      boxShadow: [
                        "0 0 8px oklch(0.82 0.18 85 / 0.2)",
                        "0 0 20px oklch(0.82 0.18 85 / 0.4)",
                        "0 0 8px oklch(0.82 0.18 85 / 0.2)",
                      ],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                  />
                )}

                {/* Golden sweep animation on winner when all voted */}
                {allVoted && isLeader && !reducedMotion && (
                  <motion.div
                    className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent, oklch(0.82 0.18 85 / 0.15), transparent)",
                      }}
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{
                        duration: 1.5,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                      }}
                    />
                  </motion.div>
                )}

                <span className="font-display text-[clamp(16px,2vw,24px)] font-bold text-text-primary text-center relative z-10">
                  {cat}
                </span>
                <AnimatePresence>
                  {votes > 0 && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="relative z-10 rounded-full bg-accent-luckyletters/20 px-3 py-0.5 font-mono text-sm font-bold text-accent-luckyletters"
                    >
                      {votes} {votes === 1 ? "vote" : "votes"}
                    </motion.span>
                  )}
                </AnimatePresence>
              </GlassPanel>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
