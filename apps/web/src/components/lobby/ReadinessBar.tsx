"use client";

import type { PlayerData } from "@flimflam/shared";
import { useReducedMotion } from "@flimflam/ui";
import { motion } from "motion/react";

interface ReadinessBarProps {
  players: PlayerData[];
}

export function ReadinessBar({ players }: ReadinessBarProps) {
  const reducedMotion = useReducedMotion();
  const total = players.length;
  const readyCount = players.filter((p) => p.ready).length;
  const percent = total > 0 ? (readyCount / total) * 100 : 0;

  // Color transitions: neutral -> accent-5 (cyan) -> green at 100%
  const barColor =
    percent >= 100
      ? "oklch(0.72 0.18 150)" // success green
      : percent > 0
        ? "oklch(0.7 0.15 210)" // accent-5 cyan
        : "oklch(1 0 0 / 0.15)"; // neutral

  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="font-body text-xs font-medium uppercase tracking-widest text-text-dim">
          Ready
        </span>
        <span className="font-mono text-xs text-text-muted">
          {readyCount}/{total}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/8 border border-white/5">
        <motion.div
          className="h-full rounded-full"
          initial={false}
          animate={{
            width: `${percent}%`,
            backgroundColor: barColor,
          }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : {
                  type: "spring",
                  stiffness: 200,
                  damping: 25,
                }
          }
          style={{
            boxShadow:
              percent >= 100
                ? "0 0 12px oklch(0.72 0.18 150 / 0.5)"
                : percent > 0
                  ? "0 0 8px oklch(0.7 0.15 210 / 0.3)"
                  : "none",
          }}
        />
      </div>
    </div>
  );
}
