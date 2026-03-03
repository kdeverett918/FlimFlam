"use client";

import type { ScoreEntry } from "@flimflam/shared";
import { AVATAR_COLORS } from "@flimflam/shared";
import { ConfettiBurst, GlassPanel, ScoreReveal } from "@flimflam/ui";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface ScoreboardProps {
  scores: ScoreEntry[];
  previousScores?: ScoreEntry[];
}

const PODIUM_COLORS: Record<number, { text: string; glow: string }> = {
  1: { text: "text-accent-3", glow: "0 0 24px oklch(0.78 0.18 85 / 0.5)" },
  2: { text: "text-text-muted", glow: "0 0 24px oklch(0.7 0.02 270 / 0.3)" },
  3: { text: "text-[oklch(0.65_0.15_70)]", glow: "0 0 24px oklch(0.65 0.15 70 / 0.4)" },
};

function getRankChange(
  current: number,
  previous: number | undefined,
): { direction: "up" | "down"; delta: number } | null {
  if (previous === undefined) return null;
  if (current < previous) return { direction: "up", delta: previous - current };
  if (current > previous) return { direction: "down", delta: current - previous };
  return null;
}

export function Scoreboard({ scores, previousScores }: ScoreboardProps) {
  const previousRanks = useRef<Map<string, number>>(new Map());
  const [revealedCount, setRevealedCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Reset reveal animation when scores array identity changes
  const scoresRef = useRef(scores);
  if (scoresRef.current !== scores) {
    scoresRef.current = scores;
    if (revealedCount !== 0) setRevealedCount(0);
    if (showConfetti) setShowConfetti(false);
  }

  useEffect(() => {
    if (previousScores) {
      const map = new Map<string, number>();
      for (const s of previousScores) {
        map.set(s.sessionId, s.rank);
      }
      previousRanks.current = map;
    }
  }, [previousScores]);

  // Stagger reveal from bottom to top
  useEffect(() => {
    if (revealedCount < scores.length) {
      const timer = setTimeout(() => {
        const nextCount = revealedCount + 1;
        setRevealedCount(nextCount);
        // Confetti for #1
        if (nextCount === scores.length) {
          setShowConfetti(true);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [revealedCount, scores.length]);

  // Reverse order for reveal (bottom-to-top)
  const reversedScores = [...scores].reverse();

  return (
    <div className="flex flex-col gap-4">
      <ConfettiBurst trigger={showConfetti} preset="win" />
      <AnimatePresence mode="popLayout">
        {reversedScores.map((entry, revIdx) => {
          const originalIndex = scores.length - 1 - revIdx;
          const isRevealed = revIdx < revealedCount;
          if (!isRevealed) return null;

          const rankChange = getRankChange(entry.rank, previousRanks.current.get(entry.sessionId));
          const colorIndex = originalIndex % AVATAR_COLORS.length;
          const avatarColor = AVATAR_COLORS[colorIndex];
          const podium = PODIUM_COLORS[entry.rank];
          const prevScore = previousScores?.find((s) => s.sessionId === entry.sessionId)?.score;

          return (
            <motion.div
              key={entry.sessionId}
              layoutId={entry.sessionId}
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: "spring", stiffness: 200, damping: 25, delay: revIdx * 0.08 }}
            >
              <GlassPanel
                glow={entry.rank <= 3}
                glowColor={podium?.glow}
                rounded="2xl"
                className="flex items-center gap-6 px-8 py-5"
              >
                {/* Rank */}
                <div className="flex w-[60px] items-center justify-center">
                  <span
                    className={`font-display text-[42px] font-bold ${
                      podium?.text ?? "text-text-muted"
                    }`}
                  >
                    {entry.rank}
                  </span>
                </div>

                {/* Rank change arrow */}
                <div className="w-[30px]">
                  {rankChange && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    >
                      {rankChange.direction === "up" ? (
                        <ChevronUp className="h-6 w-6 text-accent-5" />
                      ) : (
                        <ChevronDown className="h-6 w-6 text-accent-6" />
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Avatar */}
                <div
                  className="flex h-[56px] w-[56px] items-center justify-center rounded-full text-[28px] font-bold text-bg-deep"
                  style={{
                    backgroundColor: avatarColor,
                    boxShadow: `0 0 12px ${avatarColor}40`,
                  }}
                >
                  {entry.name.charAt(0).toUpperCase()}
                </div>

                {/* Name */}
                <span className="flex-1 font-body text-[32px] font-medium text-text-primary">
                  {entry.name}
                </span>

                {/* Score */}
                <ScoreReveal
                  score={entry.score}
                  previousScore={prevScore ?? 0}
                  showDelta={prevScore !== undefined}
                  celebrate={entry.rank === 1}
                  className="font-mono text-[40px]"
                />
              </GlassPanel>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
