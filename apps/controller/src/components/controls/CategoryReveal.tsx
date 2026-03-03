"use client";

import { GlassPanel, haptics } from "@flimflam/ui";
import { RefreshCw } from "lucide-react";

interface CategoryRevealProps {
  categories: string[];
  isSelector: boolean;
  onConfirm: () => void;
  onReroll: () => void;
}

export function CategoryReveal({
  categories,
  isSelector,
  onConfirm,
  onReroll,
}: CategoryRevealProps) {
  return (
    <div className="flex flex-col gap-4 px-4 pb-16 pt-4 animate-fade-in-up">
      <p className="text-center font-display text-lg font-bold text-text-primary">
        {isSelector ? "Your categories" : "Today's categories"}
      </p>

      {/* Category grid — 2 columns for readability */}
      <div className="grid grid-cols-2 gap-2">
        {categories.map((cat) => (
          <GlassPanel
            key={cat}
            glow
            glowColor="oklch(0.68 0.22 265 / 0.2)"
            className="flex items-center justify-center px-3 py-3 text-center"
          >
            <span className="font-display text-sm font-bold text-accent-brainboard">{cat}</span>
          </GlassPanel>
        ))}
      </div>

      {isSelector ? (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              haptics.confirm();
              onConfirm();
            }}
            className="h-14 w-full rounded-xl bg-accent-brainboard font-display text-lg text-white uppercase tracking-wider transition-all active:scale-95"
            style={{
              boxShadow: "0 0 16px oklch(0.65 0.22 260 / 0.25)",
            }}
          >
            Start
          </button>
          <button
            type="button"
            onClick={() => {
              haptics.tap();
              onReroll();
            }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.15] bg-white/[0.08] font-body text-sm font-medium text-text-muted transition-all active:scale-95 active:bg-white/[0.12]"
          >
            <RefreshCw className="h-4 w-4" />
            Shuffle Categories
          </button>
        </div>
      ) : (
        <p className="text-center font-body text-sm text-text-muted">
          Waiting for the first player to start...
        </p>
      )}
    </div>
  );
}
