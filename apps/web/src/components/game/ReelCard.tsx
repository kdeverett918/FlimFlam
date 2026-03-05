"use client";

import type { PlayerData } from "@flimflam/shared";
import { motion } from "motion/react";

export type ReelCardType =
  | "winner"
  | "best-play"
  | "comeback"
  | "speed-demon"
  | "close-call"
  | "standings";

interface ReelCardProps {
  type: ReelCardType;
  title: string;
  subtitle: string;
  icon: string;
  playerName?: string;
  playerColor?: string;
  score?: number;
  players?: PlayerData[];
  accentHue: number;
}

const cardVariants = {
  enter: (direction: number) => ({
    y: direction > 0 ? "100%" : "-100%",
    opacity: 0,
    scale: 0.92,
  }),
  center: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: (direction: number) => ({
    y: direction > 0 ? "-100%" : "100%",
    opacity: 0,
    scale: 0.92,
    transition: { duration: 0.3, ease: [0.4, 0, 1, 1] as const },
  }),
};

export { cardVariants };

export function ReelCard({
  type,
  title,
  subtitle,
  icon,
  playerName,
  playerColor,
  score,
  players,
  accentHue,
}: ReelCardProps) {
  const accentColor = `oklch(0.75 0.2 ${accentHue})`;
  const accentGlow = `oklch(0.75 0.2 ${accentHue} / 0.4)`;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-6">
      {/* Glass card */}
      <motion.div
        className="flex w-full max-w-sm flex-col items-center gap-5 rounded-3xl border border-white/10 bg-white/5 px-8 py-10 backdrop-blur-xl"
        style={{ boxShadow: `0 0 60px ${accentGlow}, inset 0 1px 0 rgba(255,255,255,0.08)` }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Icon */}
        <motion.span
          className="text-6xl"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.25, type: "spring", stiffness: 300, damping: 12 }}
          aria-hidden="true"
        >
          {icon}
        </motion.span>

        {/* Title */}
        <motion.h2
          className="text-center font-display text-2xl font-bold tracking-wide text-text-primary sm:text-3xl"
          style={{ color: accentColor, textShadow: `0 0 20px ${accentGlow}` }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          {title}
        </motion.h2>

        {/* Player avatar + name (for player-specific cards) */}
        {playerName && (
          <motion.div
            className="flex flex-col items-center gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full text-3xl font-bold text-bg-deep"
              style={{
                backgroundColor: playerColor ?? accentColor,
                boxShadow: `0 0 20px ${playerColor ?? accentColor}60`,
              }}
            >
              {playerName.charAt(0).toUpperCase()}
            </div>
            <span className="font-display text-xl font-bold text-text-primary sm:text-2xl">
              {playerName}
            </span>
          </motion.div>
        )}

        {/* Score (if applicable) */}
        {score !== undefined && (
          <motion.div
            className="font-mono text-4xl font-bold text-text-primary sm:text-5xl"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 15 }}
          >
            {score.toLocaleString()}
            <span className="ml-1 text-lg text-text-muted">pts</span>
          </motion.div>
        )}

        {/* Subtitle */}
        <motion.p
          className="text-center font-body text-base text-text-muted sm:text-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.4 }}
        >
          {subtitle}
        </motion.p>

        {/* Mini standings (for standings card) */}
        {type === "standings" && players && players.length > 0 && (
          <motion.div
            className="mt-2 flex w-full flex-col gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            {[...players]
              .sort((a, b) => b.score - a.score)
              .map((p, i) => (
                <div
                  key={p.sessionId}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-2"
                >
                  <span className="w-6 text-center font-display text-sm font-bold text-text-muted">
                    {i + 1}
                  </span>
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-bg-deep"
                    style={{ backgroundColor: p.avatarColor }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 truncate font-body text-sm text-text-primary">
                    {p.name}
                  </span>
                  <span className="font-mono text-sm font-bold text-text-primary">
                    {p.score.toLocaleString()}
                  </span>
                </div>
              ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
