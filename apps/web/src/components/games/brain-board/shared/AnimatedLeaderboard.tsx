"use client";

import type { PlayerData } from "@flimflam/shared";
import {
  ANIMATION_DURATIONS,
  ANIMATION_STAGGERS,
  AnimatedCounter,
  useReducedMotion,
} from "@flimflam/ui";
import { ArrowDown, ArrowUp } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { StreakIndicator } from "./StreakIndicator";
import { PlayerAvatar, getPlayerColor, getPlayerName } from "./bb-helpers";
import type { Standing } from "./bb-types";

interface AnimatedLeaderboardProps {
  standings: Standing[];
  players: PlayerData[];
  mySessionId?: string | null;
  showStreaks?: boolean;
  playerStreaks?: Record<string, number>;
}

export function AnimatedLeaderboard({
  standings,
  players,
  mySessionId,
  showStreaks = false,
  playerStreaks,
}: AnimatedLeaderboardProps) {
  const reducedMotion = useReducedMotion();
  const prevRanksRef = useRef<Record<string, number>>({});

  const sorted = [...standings].sort((a, b) => b.score - a.score);

  // Build current rank map
  const currentRanks: Record<string, number> = {};
  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    if (entry) currentRanks[entry.sessionId] = i;
  }

  // Compute rank changes (positive = improved, negative = dropped)
  const rankChanges: Record<string, number> = {};
  const prev = prevRanksRef.current;
  for (const s of sorted) {
    const prevRank = prev[s.sessionId];
    if (prevRank !== undefined) {
      rankChanges[s.sessionId] = prevRank - (currentRanks[s.sessionId] ?? 0);
    }
  }

  // Update ref after computing rank changes — runs every render so arrows
  // persist until next standings update (rank changes computed before this)
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      prevRanksRef.current = currentRanks;
    });
    return () => cancelAnimationFrame(id);
  });

  // "Gap closing" alert
  const leaderScore = sorted[0]?.score ?? 0;
  const showGapAlert =
    sorted.length >= 2 &&
    leaderScore > 0 &&
    sorted.length > 1 &&
    (sorted[sorted.length - 1]?.score ?? 0) >= leaderScore * 0.9;

  return (
    <div className="flex flex-col items-center gap-2">
      {showGapAlert && (
        <motion.div
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
          animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          className="mb-2 rounded-lg bg-accent-brainboard/20 px-4 py-2 text-center font-bold text-accent-brainboard"
        >
          IT&apos;S ANYONE&apos;S GAME!
        </motion.div>
      )}

      <div className="flex w-full flex-col gap-2">
        <AnimatePresence mode="popLayout">
          {sorted.map((s, idx) => {
            const name = getPlayerName(players, s.sessionId);
            const color = getPlayerColor(players, s.sessionId);
            const change = rankChanges[s.sessionId] ?? 0;
            const isMe = s.sessionId === mySessionId;
            const streak = playerStreaks?.[s.sessionId] ?? 0;

            return (
              <motion.div
                key={s.sessionId}
                layout={!reducedMotion}
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
                animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={
                  reducedMotion
                    ? {
                        delay: idx * ANIMATION_STAGGERS.tight,
                        duration: ANIMATION_DURATIONS.quick,
                      }
                    : {
                        delay: idx * ANIMATION_STAGGERS.tight,
                        type: "spring",
                        stiffness: 180,
                        layout: { duration: ANIMATION_DURATIONS.leaderboardShuffle },
                      }
                }
                data-testid="leaderboard-row"
                data-player-id={s.sessionId}
                data-score={String(s.score)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                  isMe
                    ? "border-accent-brainboard/40 bg-accent-brainboard/10"
                    : "border-white/12 bg-white/6"
                }`}
              >
                <span className="w-8 font-mono text-sm text-text-muted">#{idx + 1}</span>

                {change > 0 && <ArrowUp size={14} className="text-green-400" />}
                {change < 0 && <ArrowDown size={14} className="text-red-400" />}
                {change === 0 && <span className="w-[14px]" />}

                <PlayerAvatar name={name} color={color} size={36} />
                <span className="flex-1 font-body text-[20px] text-text-primary">{name}</span>

                {showStreaks && streak >= 2 && <StreakIndicator streak={streak} size="sm" />}

                <AnimatedCounter
                  value={s.score}
                  duration={850}
                  className={`text-[20px] font-bold ${
                    s.score >= 0 ? "text-accent-3" : "text-accent-6"
                  }`}
                  format={(v) => `$${v.toLocaleString()}`}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
