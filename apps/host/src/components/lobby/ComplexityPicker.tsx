"use client";

import type { Complexity } from "@partyline/shared";

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
    color: "text-green-400",
    activeColor: "border-green-400 bg-green-400/15 shadow-[0_0_20px_oklch(0.7_0.2_145/0.3)]",
    description: "Ages 8+ / Silly & fun",
  },
  {
    value: "standard",
    label: "STANDARD",
    color: "text-yellow-400",
    activeColor: "border-yellow-400 bg-yellow-400/15 shadow-[0_0_20px_oklch(0.85_0.18_85/0.3)]",
    description: "Ages 13+ / Balanced",
  },
  {
    value: "advanced",
    label: "ADVANCED",
    color: "text-red-400",
    activeColor: "border-red-400 bg-red-400/15 shadow-[0_0_20px_oklch(0.65_0.29_12/0.3)]",
    description: "Ages 16+ / Strategic",
  },
];

export function ComplexityPicker({ complexity, onChange }: ComplexityPickerProps) {
  return (
    <div className="flex gap-4">
      {OPTIONS.map((opt) => {
        const isActive = complexity === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-10 py-5 transition-all duration-300 ${
              isActive ? opt.activeColor : "border-bg-card bg-bg-card hover:border-text-muted/30"
            }`}
          >
            <span
              className={`font-display text-[32px] ${isActive ? opt.color : "text-text-muted"}`}
            >
              {opt.label}
            </span>
            <span className="text-[18px] text-text-muted">{opt.description}</span>
          </button>
        );
      })}
    </div>
  );
}
