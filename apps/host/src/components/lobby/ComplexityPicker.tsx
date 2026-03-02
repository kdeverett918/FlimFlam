"use client";

import type { Complexity } from "@flimflam/shared";
import { motion } from "framer-motion";
import { Brain, Smile, Swords } from "lucide-react";

interface ComplexityPickerProps {
  complexity: Complexity;
  onChange: (complexity: Complexity) => void;
}

const OPTIONS: {
  value: Complexity;
  label: string;
  color: string;
  activeColor: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "kids",
    label: "KIDS",
    color: "text-accent-5",
    activeColor: "border-accent-5 bg-accent-5/15 shadow-[0_0_20px_oklch(0.70_0.15_210/0.25)]",
    description: "Ages 8+ / Silly & fun",
    icon: <Smile className="h-6 w-6" />,
  },
  {
    value: "standard",
    label: "STANDARD",
    color: "text-accent-3",
    activeColor: "border-accent-3 bg-accent-3/15 shadow-[0_0_20px_oklch(0.78_0.18_85/0.25)]",
    description: "Ages 13+ / Balanced",
    icon: <Swords className="h-6 w-6" />,
  },
  {
    value: "advanced",
    label: "ADVANCED",
    color: "text-accent-6",
    activeColor: "border-accent-6 bg-accent-6/15 shadow-[0_0_20px_oklch(0.68_0.25_20/0.25)]",
    description: "Ages 16+ / Strategic",
    icon: <Brain className="h-6 w-6" />,
  },
];

export function ComplexityPicker({ complexity, onChange }: ComplexityPickerProps) {
  const activeIndex = OPTIONS.findIndex((o) => o.value === complexity);

  return (
    <div
      className="relative inline-flex overflow-hidden rounded-2xl border-2 border-white/[0.15] bg-white/[0.06]"
      style={{ backdropFilter: "blur(12px)" }}
    >
      {/* Animated sliding pill */}
      <motion.div
        className="absolute inset-y-0 rounded-2xl bg-white/[0.08]"
        animate={{
          left: `${(activeIndex / OPTIONS.length) * 100}%`,
          width: `${100 / OPTIONS.length}%`,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        aria-hidden="true"
      />

      {OPTIONS.map((opt) => {
        const isActive = complexity === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={isActive}
            aria-label={`${opt.label}: ${opt.description}`}
            onClick={() => onChange(opt.value)}
            className={`relative flex flex-col items-center gap-1 border-y-2 border-transparent px-10 py-5 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep ${
              isActive ? opt.activeColor : "text-text-dim hover:bg-white/[0.08]"
            }`}
            style={{
              transform: isActive ? "scale(1.03)" : "scale(1)",
              transition:
                "transform 0.2s ease-out, background-color 0.3s, border-color 0.3s, box-shadow 0.3s",
            }}
          >
            <span className={isActive ? opt.color : "text-text-dim"}>{opt.icon}</span>
            <span
              className={`font-display text-[32px] font-bold ${isActive ? opt.color : "text-text-muted"}`}
            >
              {opt.label}
            </span>
            <span className="font-body text-[22px] text-text-muted">{opt.description}</span>
          </button>
        );
      })}
    </div>
  );
}
