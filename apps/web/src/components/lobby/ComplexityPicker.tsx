"use client";

import type { Complexity } from "@flimflam/shared";
import { GlassPanel, haptics } from "@flimflam/ui";
import { Brain, Smile, Swords } from "lucide-react";
import type { ReactNode } from "react";

interface ComplexityPickerProps {
  complexity: Complexity;
  isHost: boolean;
  onChange: (complexity: Complexity) => void;
}

const OPTIONS: {
  value: Complexity;
  label: string;
  color: string;
  activeColor: string;
  activeIconBg: string;
  description: string;
  icon: ReactNode;
}[] = [
  {
    value: "kids",
    label: "KIDS",
    color: "text-accent-5",
    activeColor: "border-accent-5 bg-accent-5/12 shadow-[0_0_20px_oklch(0.70_0.15_210/0.25)]",
    activeIconBg: "bg-accent-5/20",
    description: "Ages 8+ / Silly & fun",
    icon: <Smile className="h-5 w-5" />,
  },
  {
    value: "standard",
    label: "STANDARD",
    color: "text-accent-3",
    activeColor: "border-accent-3 bg-accent-3/12 shadow-[0_0_20px_oklch(0.78_0.18_85/0.25)]",
    activeIconBg: "bg-accent-3/20",
    description: "Ages 13+ / Balanced",
    icon: <Swords className="h-5 w-5" />,
  },
  {
    value: "advanced",
    label: "ADVANCED",
    color: "text-accent-6",
    activeColor: "border-accent-6 bg-accent-6/12 shadow-[0_0_20px_oklch(0.68_0.25_20/0.25)]",
    activeIconBg: "bg-accent-6/20",
    description: "Ages 16+ / Strategic",
    icon: <Brain className="h-5 w-5" />,
  },
];

export function ComplexityPicker({ complexity, isHost, onChange }: ComplexityPickerProps) {
  return (
    <div className="grid w-full grid-cols-3 gap-3 sm:gap-4">
      {OPTIONS.map((opt) => {
        const isActive = complexity === opt.value;

        // Non-host: show as read-only display
        if (!isHost) {
          return (
            <div
              key={opt.value}
              className={`w-full rounded-2xl transition-all duration-300 ${
                isActive ? "" : "opacity-30"
              }`}
            >
              <GlassPanel
                rounded="2xl"
                glow={isActive}
                className={`h-full border-2 p-3 sm:p-4 transition-all duration-300 ${
                  isActive ? opt.activeColor : "border-white/[0.08] bg-white/[0.03]"
                }`}
              >
                <div
                  className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${
                    isActive ? `${opt.activeIconBg} ${opt.color}` : "bg-white/[0.08] text-text-dim"
                  }`}
                >
                  {opt.icon}
                </div>
                <p
                  className={`font-display text-sm font-bold tracking-tight sm:text-base lg:text-lg ${
                    isActive ? opt.color : "text-text-primary"
                  }`}
                >
                  {opt.label}
                </p>
                <p className="mt-0.5 font-body text-[11px] text-text-muted sm:text-xs">
                  {opt.description}
                </p>
              </GlassPanel>
            </div>
          );
        }

        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={isActive}
            aria-label={`${opt.label}: ${opt.description}`}
            onClick={() => {
              haptics.tap();
              onChange(opt.value);
            }}
            className="group w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep"
          >
            <GlassPanel
              rounded="2xl"
              glow={isActive}
              className={`h-full border-2 p-3 sm:p-4 transition-all duration-300 ${
                isActive
                  ? opt.activeColor
                  : "border-white/[0.15] bg-white/[0.05] hover:border-white/[0.25] hover:bg-white/[0.08]"
              }`}
            >
              <div
                className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${
                  isActive ? `${opt.activeIconBg} ${opt.color}` : "bg-white/[0.08] text-text-dim"
                }`}
              >
                {opt.icon}
              </div>
              <p
                className={`font-display text-sm font-bold tracking-tight sm:text-base lg:text-lg ${
                  isActive ? opt.color : "text-text-primary"
                }`}
              >
                {opt.label}
              </p>
              <p className="mt-0.5 font-body text-[11px] text-text-muted sm:text-xs">
                {opt.description}
              </p>
            </GlassPanel>
          </button>
        );
      })}
    </div>
  );
}
