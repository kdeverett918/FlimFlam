"use client";

import type { Complexity } from "@flimflam/shared";
import { GlassPanel } from "@flimflam/ui";
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
  activeIconBg: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "kids",
    label: "KIDS",
    color: "text-accent-5",
    activeColor: "border-accent-5 bg-accent-5/12 shadow-[0_0_20px_oklch(0.70_0.15_210/0.25)]",
    activeIconBg: "bg-accent-5/20",
    description: "Ages 8+ / Silly & fun",
    icon: <Smile className="h-5 w-5 sm:h-6 sm:w-6" />,
  },
  {
    value: "standard",
    label: "STANDARD",
    color: "text-accent-3",
    activeColor: "border-accent-3 bg-accent-3/12 shadow-[0_0_20px_oklch(0.78_0.18_85/0.25)]",
    activeIconBg: "bg-accent-3/20",
    description: "Ages 13+ / Balanced",
    icon: <Swords className="h-5 w-5 sm:h-6 sm:w-6" />,
  },
  {
    value: "advanced",
    label: "ADVANCED",
    color: "text-accent-6",
    activeColor: "border-accent-6 bg-accent-6/12 shadow-[0_0_20px_oklch(0.68_0.25_20/0.25)]",
    activeIconBg: "bg-accent-6/20",
    description: "Ages 16+ / Strategic",
    icon: <Brain className="h-5 w-5 sm:h-6 sm:w-6" />,
  },
];

export function ComplexityPicker({ complexity, onChange }: ComplexityPickerProps) {
  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
      {OPTIONS.map((opt) => {
        const isActive = complexity === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={isActive}
            aria-label={`${opt.label}: ${opt.description}`}
            onClick={() => onChange(opt.value)}
            className="group w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep rounded-2xl"
          >
            <GlassPanel
              rounded="2xl"
              glow={isActive}
              className={`h-full border-2 p-4 sm:p-5 transition-all duration-300 ${
                isActive
                  ? opt.activeColor
                  : "border-white/[0.15] bg-white/[0.05] hover:border-white/[0.25] hover:bg-white/[0.08]"
              }`}
            >
              <div
                className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${
                  isActive ? `${opt.activeIconBg} ${opt.color}` : "bg-white/[0.08] text-text-dim"
                }`}
              >
                {opt.icon}
              </div>
              <p
                className={`font-display text-[22px] font-bold tracking-tight sm:text-[26px] ${
                  isActive ? opt.color : "text-text-primary"
                }`}
              >
                {opt.label}
              </p>
              <p className="mt-1 font-body text-[14px] text-text-muted sm:text-[16px]">
                {opt.description}
              </p>
            </GlassPanel>
          </button>
        );
      })}
    </div>
  );
}
