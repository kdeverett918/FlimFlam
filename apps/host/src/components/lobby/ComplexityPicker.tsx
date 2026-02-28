"use client";

import type { Complexity } from "@partyline/shared";
import { GlassPanel } from "@partyline/ui";

interface ComplexityPickerProps {
  complexity: Complexity;
  onChange: (complexity: Complexity) => void;
}

const OPTIONS: {
  value: Complexity;
  label: string;
  color: string;
  glowColor: string;
  description: string;
}[] = [
  {
    value: "kids",
    label: "KIDS",
    color: "text-accent-5",
    glowColor: "oklch(0.7 0.2 145 / 0.3)",
    description: "Ages 8+ / Silly & fun",
  },
  {
    value: "standard",
    label: "STANDARD",
    color: "text-accent-3",
    glowColor: "oklch(0.75 0.18 85 / 0.3)",
    description: "Ages 13+ / Balanced",
  },
  {
    value: "advanced",
    label: "ADVANCED",
    color: "text-accent-6",
    glowColor: "oklch(0.65 0.25 25 / 0.3)",
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
            aria-pressed={isActive}
            onClick={() => onChange(opt.value)}
          >
            <GlassPanel
              glow={isActive}
              glowColor={isActive ? opt.glowColor : undefined}
              rounded="2xl"
              className={`flex flex-col items-center gap-2 px-10 py-5 transition-all duration-300 ${
                isActive ? "border-white/20" : "hover:border-white/[0.16]"
              }`}
            >
              <span
                className={`font-display text-[32px] font-bold ${isActive ? opt.color : "text-text-muted"}`}
              >
                {opt.label}
              </span>
              <span className="font-body text-[18px] text-text-muted">{opt.description}</span>
            </GlassPanel>
          </button>
        );
      })}
    </div>
  );
}
