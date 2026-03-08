"use client";

import { useReducedMotion } from "@flimflam/ui";
import { Flame } from "lucide-react";
import { motion } from "motion/react";

interface StreakIndicatorProps {
  streak: number;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = {
  sm: { icon: 16, text: "text-xs" },
  md: { icon: 20, text: "text-sm" },
  lg: { icon: 28, text: "text-lg" },
} as const;

export function StreakIndicator({ streak, size = "md" }: StreakIndicatorProps) {
  const reducedMotion = useReducedMotion();
  if (streak < 2) return null;

  const { icon: iconSize, text: textClass } = SIZE_MAP[size];

  const tier = streak >= 5 ? "unstoppable" : streak >= 3 ? "onfire" : "hot";

  const tierStyles = {
    hot: {
      color: "text-amber-400",
      glow: "drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]",
      label: null,
    },
    onfire: {
      color: "text-orange-400",
      glow: "drop-shadow-[0_0_10px_rgba(251,146,60,0.6)]",
      label: "ON FIRE!",
    },
    unstoppable: {
      color: "text-red-400",
      glow: "drop-shadow-[0_0_14px_rgba(248,113,113,0.7)]",
      label: "UNSTOPPABLE!",
    },
  } as const;

  const style = tierStyles[tier];

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
      animate={reducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
      transition={
        reducedMotion ? { duration: 0.15 } : { type: "spring", stiffness: 300, damping: 18 }
      }
      className={`inline-flex items-center gap-1 ${style.color} ${style.glow} ${
        tier === "unstoppable" && !reducedMotion ? "animate-pulse" : ""
      }`}
    >
      <Flame size={iconSize} className="fill-current" />
      {style.label && (
        <span className={`${textClass} font-bold whitespace-nowrap`}>{style.label}</span>
      )}
      <span className={`${textClass} font-bold`}>x{streak}</span>
    </motion.div>
  );
}
