"use client";

import { AnimatedBackground, GAME_THEMES, type GameTheme } from "@flimflam/ui";
import { motion } from "motion/react";

interface PhaseTransitionProps {
  label: string;
  gameId?: string;
  round?: number;
  totalRounds?: number;
  subtitle?: string | null;
  isFinalRound?: boolean;
}

export function PhaseTransition({
  label,
  gameId,
  round,
  totalRounds,
  subtitle,
  isFinalRound,
}: PhaseTransitionProps) {
  const theme = gameId ? GAME_THEMES[gameId as GameTheme] : undefined;
  const accentColor = theme?.primaryBlob ?? "oklch(0.72 0.22 25)";
  const secondColor = theme?.secondaryBlob ?? "oklch(0.70 0.15 185)";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <AnimatedBackground gameId={gameId} isFinalRound={isFinalRound} />

      {/* White flash overlay */}
      <motion.div
        initial={{ opacity: 0.2 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="absolute inset-0 bg-white pointer-events-none"
      />

      {/* Top light bar */}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "0%" }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="absolute left-0 right-0 top-[40%] h-[3px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor.replace(")", " / 0.8)")}, transparent)`,
        }}
      />

      {/* Phase label */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: [0.85, 1.02, 1], opacity: 1 }}
        exit={{ scale: 1.05, opacity: 0 }}
        transition={{
          duration: 0.5,
          ease: "easeOut",
          scale: {
            times: [0, 0.7, 1],
            duration: 0.6,
          },
        }}
        className="relative z-10 flex flex-col items-center gap-6"
      >
        <h1
          className="font-display text-[80px] font-extrabold text-text-primary md:text-[112px]"
          style={{
            textShadow: `0 0 40px ${accentColor.replace(")", " / 0.5)")}, 0 0 80px ${secondColor.replace(")", " / 0.25)")}`,
          }}
        >
          {label}
        </h1>
        {round != null && round > 0 && totalRounds != null && totalRounds > 0 && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="font-display text-[36px] font-semibold text-text-muted"
          >
            Round {round}/{totalRounds}
          </motion.p>
        )}
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.6 }}
            className="font-display text-[28px] italic text-text-muted/80"
          >
            {subtitle}
          </motion.p>
        )}
      </motion.div>

      {/* Bottom light bar */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: "0%" }}
        exit={{ x: "-100%", opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="absolute bottom-[40%] left-0 right-0 h-[3px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${secondColor.replace(")", " / 0.8)")}, transparent)`,
        }}
      />
    </motion.div>
  );
}
