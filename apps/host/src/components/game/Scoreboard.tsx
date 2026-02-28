"use client";

import type { ScoreEntry } from "@partyline/shared";
import { AVATAR_COLORS } from "@partyline/shared";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface ScoreboardProps {
  scores: ScoreEntry[];
  previousScores?: ScoreEntry[];
}

function AnimatedScore({ target }: { target: number }) {
  const [display, setDisplay] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    const start = prevTarget.current;
    const diff = target - start;
    if (diff === 0) return;

    const duration = 1200;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
    prevTarget.current = target;
  }, [target]);

  return <span>{display.toLocaleString()}</span>;
}

function getRankChangeArrow(
  current: number,
  previous: number | undefined,
): { icon: string; color: string } | null {
  if (previous === undefined) return null;
  if (current < previous) return { icon: "\u25B2", color: "text-green-400" };
  if (current > previous) return { icon: "\u25BC", color: "text-red-400" };
  return null;
}

export function Scoreboard({ scores, previousScores }: ScoreboardProps) {
  const previousRanks = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (previousScores) {
      const map = new Map<string, number>();
      for (const s of previousScores) {
        map.set(s.sessionId, s.rank);
      }
      previousRanks.current = map;
    }
  }, [previousScores]);

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence mode="popLayout">
        {scores.map((entry, index) => {
          const rankChange = getRankChangeArrow(
            entry.rank,
            previousRanks.current.get(entry.sessionId),
          );
          const colorIndex = index % AVATAR_COLORS.length;
          const avatarColor = AVATAR_COLORS[colorIndex];

          return (
            <motion.div
              key={entry.sessionId}
              layoutId={entry.sessionId}
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: "spring", stiffness: 200, damping: 25, delay: index * 0.08 }}
              className="flex items-center gap-6 rounded-2xl border border-bg-card bg-bg-card/80 px-8 py-5"
            >
              {/* Rank */}
              <div className="flex w-[60px] items-center justify-center">
                <span
                  className={`font-display text-[42px] ${
                    entry.rank === 1
                      ? "text-accent-3"
                      : entry.rank === 2
                        ? "text-accent-2"
                        : entry.rank === 3
                          ? "text-accent-1"
                          : "text-text-muted"
                  }`}
                >
                  {entry.rank}
                </span>
              </div>

              {/* Rank change arrow */}
              <div className="w-[30px]">
                {rankChange && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`text-[24px] ${rankChange.color}`}
                  >
                    {rankChange.icon}
                  </motion.span>
                )}
              </div>

              {/* Avatar */}
              <div
                className="flex h-[56px] w-[56px] items-center justify-center rounded-full text-[28px] font-bold text-bg-dark"
                style={{
                  backgroundColor: avatarColor,
                  boxShadow: `0 0 12px ${avatarColor}40`,
                }}
              >
                {entry.name.charAt(0).toUpperCase()}
              </div>

              {/* Name */}
              <span className="flex-1 text-[32px] font-medium text-text-primary">{entry.name}</span>

              {/* Score */}
              <span className="font-display text-[40px] text-accent-2">
                <AnimatedScore target={entry.score} />
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
