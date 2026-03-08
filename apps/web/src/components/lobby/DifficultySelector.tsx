"use client";

import type { Complexity } from "@flimflam/shared";
import { haptics, useReducedMotion } from "@flimflam/ui";
import { Brain, Smile, Swords } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useMemo } from "react";

interface DifficultySelectorProps {
  complexity: Complexity;
  isHost: boolean;
  onChange: (complexity: Complexity) => void;
}

const SEGMENTS: {
  value: Complexity;
  label: string;
  shortLabel: string;
  description: string;
  icon: ReactNode;
  color: string;
  bgActive: string;
}[] = [
  {
    value: "kids",
    label: "KIDS",
    shortLabel: "KIDS",
    description: "Ages 8+",
    icon: <Smile className="h-4 w-4" />,
    color: "text-accent-5",
    bgActive: "bg-accent-5/20",
  },
  {
    value: "standard",
    label: "STANDARD",
    shortLabel: "STD",
    description: "Ages 13+",
    icon: <Swords className="h-4 w-4" />,
    color: "text-accent-3",
    bgActive: "bg-accent-3/20",
  },
  {
    value: "advanced",
    label: "ADVANCED",
    shortLabel: "ADV",
    description: "Ages 16+",
    icon: <Brain className="h-4 w-4" />,
    color: "text-accent-6",
    bgActive: "bg-accent-6/20",
  },
];

export function DifficultySelector({ complexity, isHost, onChange }: DifficultySelectorProps) {
  const reducedMotion = useReducedMotion();
  const selectedIndex = useMemo(
    () => SEGMENTS.findIndex((s) => s.value === complexity),
    [complexity],
  );

  return (
    <div
      className="relative flex w-full overflow-hidden rounded-2xl border border-white/15 bg-white/5 p-1 backdrop-blur-xl"
      role="radiogroup"
      aria-label="Difficulty level"
    >
      {/* Sliding highlight */}
      <motion.div
        className="absolute top-1 bottom-1 z-0 rounded-xl border border-white/10 bg-white/10"
        initial={false}
        animate={{
          left: `calc(${(selectedIndex / SEGMENTS.length) * 100}% + 4px)`,
          width: `calc(${100 / SEGMENTS.length}% - 8px)`,
        }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : {
                type: "spring",
                stiffness: 400,
                damping: 30,
              }
        }
        aria-hidden="true"
      />

      {SEGMENTS.map((seg) => {
        const isActive = complexity === seg.value;

        return (
          <button
            key={seg.value}
            type="button"
            aria-pressed={isActive}
            aria-label={`${seg.label}: ${seg.description}`}
            data-testid={`complexity-option-${seg.value}`}
            disabled={!isHost}
            onClick={() => {
              if (!isHost) return;
              haptics.tap();
              onChange(seg.value);
            }}
            className={`relative z-10 flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-3 transition-all duration-200 sm:flex-row sm:gap-2 sm:px-4 ${
              isHost ? "cursor-pointer" : "cursor-default"
            } ${isActive ? `${seg.color}` : "text-text-dim hover:text-text-muted"}`}
          >
            <div
              className={`flex items-center justify-center rounded-md p-1 transition-colors duration-200 ${
                isActive ? seg.bgActive : ""
              }`}
            >
              {seg.icon}
            </div>
            <div className="flex flex-col items-center sm:items-start">
              <span className="font-display text-xs font-bold tracking-tight sm:text-sm">
                {seg.label}
              </span>
              <span className="hidden font-body text-[10px] text-text-dim sm:block">
                {seg.description}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
