"use client";

import { motion } from "motion/react";

interface PlayerStatusProps {
  /** The name of the player whose turn it is, or null if no specific turn */
  turnPlayerName: string | null;
  /** Whether it's the current user's turn */
  isMyTurn: boolean;
  /** Optional status message override */
  message?: string;
}

export function PlayerStatus({ turnPlayerName, isMyTurn, message }: PlayerStatusProps) {
  const displayMessage =
    message ??
    (isMyTurn ? "Your turn!" : turnPlayerName ? `Waiting for ${turnPlayerName}...` : null);

  if (!displayMessage) return null;

  return (
    <div className="flex justify-center px-4 pt-4">
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={`inline-flex items-center justify-center rounded-full border px-4 py-2 shadow-[0_12px_30px_oklch(0_0_0/0.2)] ${
          isMyTurn
            ? "border-accent-3/30 bg-accent-3/12"
            : "border-white/10 bg-white/6"
        }`}
      >
        <span
          className={`font-display text-sm font-bold uppercase tracking-[0.24em] ${
            isMyTurn ? "text-accent-3" : "text-text-muted"
          }`}
        >
          {displayMessage}
        </span>
      </motion.div>
    </div>
  );
}
