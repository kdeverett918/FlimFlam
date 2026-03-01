"use client";

import type { Complexity } from "@flimflam/shared";

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
}[] = [
  {
    value: "kids",
    label: "KIDS",
    color: "text-accent-5",
    activeColor: "border-accent-5 bg-accent-5/15 shadow-[0_0_20px_oklch(0.70_0.15_210/0.25)]",
    description: "Ages 8+ / Silly & fun",
  },
  {
    value: "standard",
    label: "STANDARD",
    color: "text-accent-3",
    activeColor: "border-accent-3 bg-accent-3/15 shadow-[0_0_20px_oklch(0.78_0.18_85/0.25)]",
    description: "Ages 13+ / Balanced",
  },
  {
    value: "advanced",
    label: "ADVANCED",
    color: "text-accent-6",
    activeColor: "border-accent-6 bg-accent-6/15 shadow-[0_0_20px_oklch(0.68_0.25_20/0.25)]",
    description: "Ages 16+ / Strategic",
  },
];

export function ComplexityPicker({ complexity, onChange }: ComplexityPickerProps) {
  return (
    <div
      className="inline-flex overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]"
      style={{ backdropFilter: "blur(12px)" }}
    >
      {OPTIONS.map((opt) => {
        const isActive = complexity === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(opt.value)}
            className={`flex flex-col items-center gap-1 border-y-2 border-transparent px-10 py-5 transition-all duration-300 ${
              isActive ? opt.activeColor : "hover:bg-white/[0.04]"
            }`}
          >
            <span
              className={`font-display text-[32px] font-bold ${isActive ? opt.color : "text-text-muted"}`}
            >
              {opt.label}
            </span>
            <span className="font-body text-[18px] text-text-muted">{opt.description}</span>
          </button>
        );
      })}
    </div>
  );
}
