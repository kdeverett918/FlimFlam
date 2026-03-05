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
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center justify-center px-4 py-2 ${
        isMyTurn
          ? "bg-accent-3/15 border-b border-accent-3/30"
          : "bg-white/5 border-b border-white/10"
      }`}
    >
      <span
        className={`font-display text-sm font-bold uppercase tracking-wider ${
          isMyTurn ? "text-accent-3" : "text-text-muted"
        }`}
      >
        {displayMessage}
      </span>
    </motion.div>
  );
}
