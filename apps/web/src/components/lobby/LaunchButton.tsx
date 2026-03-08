"use client";

import { ConfettiBurst, haptics, sounds, useReducedMotion } from "@flimflam/ui";
import { motion } from "motion/react";
import { useCallback, useState } from "react";

interface LaunchButtonProps {
  isHost: boolean;
  canStart: boolean;
  amReady: boolean;
  hostActionLabel: string;
  hostStatusLabel: string;
  onStartGame: () => void;
  onToggleReady: () => void;
}

export function LaunchButton({
  isHost,
  canStart,
  amReady,
  hostActionLabel,
  hostStatusLabel,
  onStartGame,
  onToggleReady,
}: LaunchButtonProps) {
  const reducedMotion = useReducedMotion();
  const [launching, setLaunching] = useState(false);

  const handleStart = useCallback(() => {
    if (!canStart || launching) return;
    setLaunching(true);
    haptics.celebrate();
    sounds.reveal();

    // Brief visual moment before triggering game start
    setTimeout(() => {
      onStartGame();
    }, 300);
  }, [canStart, launching, onStartGame]);

  const handleToggleReady = useCallback(() => {
    haptics.tap();
    sounds.click();
    onToggleReady();
  }, [onToggleReady]);

  if (isHost) {
    return (
      <div className="flex flex-col items-center gap-3 pt-2">
        <div className="relative w-full max-w-lg">
          {/* Glow behind when enabled */}
          {canStart && !reducedMotion && (
            <div className="absolute -inset-3 animate-glow-breathe rounded-2xl bg-primary/20 blur-2xl" />
          )}

          {/* Confetti on launch */}
          <ConfettiBurst trigger={launching} preset="celebration" />

          <motion.button
            whileHover={canStart && !launching ? { scale: 1.02, y: -2 } : {}}
            whileTap={canStart && !launching ? { scale: 0.95 } : {}}
            type="button"
            onClick={handleStart}
            disabled={!canStart || launching}
            data-testid="lobby-primary-action"
            className={`relative w-full overflow-hidden rounded-2xl border-[3px] py-5 font-display text-xl font-black uppercase tracking-wider transition-all duration-500 shadow-xl sm:text-2xl ${
              canStart && !launching
                ? "border-primary bg-primary/10 text-primary cursor-pointer shadow-primary/20 animate-glow-breathe-box"
                : launching
                  ? "border-primary bg-primary/20 text-primary cursor-wait"
                  : "border-white/10 bg-white/5 text-white/20 cursor-not-allowed"
            }`}
            style={{
              backdropFilter: "blur(20px)",
              minHeight: 56,
              textShadow: canStart ? "0 0 20px oklch(0.75 0.22 25 / 0.5)" : "none",
            }}
          >
            {/* Gradient sweep overlay when enabled */}
            {canStart && !reducedMotion && (
              <div
                className="absolute inset-0 animate-gradient-sweep opacity-20"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, oklch(0.75 0.22 25 / 0.4), transparent)",
                  backgroundSize: "200% 100%",
                }}
                aria-hidden="true"
              />
            )}
            <span className="relative z-10">{launching ? "Starting..." : hostActionLabel}</span>
          </motion.button>
        </div>
        <p className="font-body text-xs font-medium uppercase tracking-widest text-text-muted/60 sm:text-sm">
          {hostStatusLabel}
        </p>
      </div>
    );
  }

  // Non-host: Ready Up toggle
  return (
    <div className="flex flex-col items-center gap-3 pt-2">
      <motion.button
        whileTap={reducedMotion ? {} : { scale: 0.95 }}
        type="button"
        onClick={handleToggleReady}
        data-testid="lobby-primary-action"
        className={`relative w-full max-w-lg overflow-hidden rounded-2xl border-[3px] py-5 font-display text-xl font-black uppercase tracking-wider transition-all duration-300 sm:text-2xl ${
          amReady
            ? "border-success bg-success/15 text-success shadow-[0_0_20px_oklch(0.72_0.18_150/0.3)]"
            : "border-white/20 bg-white/10 text-text-primary hover:border-primary/40 hover:bg-primary/10"
        }`}
        style={{ minHeight: 56, backdropFilter: "blur(20px)" }}
      >
        <motion.span
          key={amReady ? "ready" : "not-ready"}
          initial={reducedMotion ? false : { rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 20,
          }}
          className="block"
          style={{ perspective: "600px" }}
        >
          {amReady ? "Ready!" : "Ready Up"}
        </motion.span>
      </motion.button>
      <p className="font-body text-sm text-text-muted/60">Waiting for host to start...</p>
    </div>
  );
}
