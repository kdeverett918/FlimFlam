"use client";

import { GAME_MANIFESTS } from "@flimflam/shared";
import { GlassPanel } from "@flimflam/ui";
import { motion } from "framer-motion";
import { Check, Cpu, Flame, Paintbrush, Sparkles, Zap } from "lucide-react";
import { useRef } from "react";

interface GameSelectorProps {
  selectedGameId: string;
  onSelect: (gameId: string) => void;
}

const GAME_ICONS: Record<string, React.ReactNode> = {
  "world-builder": <Sparkles className="h-10 w-10 text-accent-2" />,
  "bluff-engine": <Zap className="h-10 w-10 text-accent-3" />,
  "quick-draw": <Paintbrush className="h-10 w-10 text-accent-4" />,
  "reality-drift": <Cpu className="h-10 w-10 text-accent-5" />,
  "hot-take": <Flame className="h-10 w-10 text-accent-6" />,
};

const GAME_ACCENT_BORDER: Record<string, string> = {
  "world-builder": "border-accent-2 shadow-[0_0_24px_oklch(0.74_0.20_300/0.35)]",
  "bluff-engine": "border-accent-3 shadow-[0_0_24px_oklch(0.84_0.18_85/0.35)]",
  "quick-draw": "border-accent-4 shadow-[0_0_24px_oklch(0.78_0.18_160/0.35)]",
  "reality-drift": "border-accent-5 shadow-[0_0_24px_oklch(0.76_0.15_210/0.35)]",
  "hot-take": "border-accent-6 shadow-[0_0_24px_oklch(0.74_0.25_20/0.35)]",
};

const GAME_ACCENT_GRADIENT: Record<string, string> = {
  "world-builder": "linear-gradient(135deg, oklch(0.74 0.20 300), oklch(0.74 0.20 300 / 0.5))",
  "bluff-engine": "linear-gradient(135deg, oklch(0.84 0.18 85), oklch(0.84 0.18 85 / 0.5))",
  "quick-draw": "linear-gradient(135deg, oklch(0.78 0.18 160), oklch(0.78 0.18 160 / 0.5))",
  "reality-drift": "linear-gradient(135deg, oklch(0.76 0.15 210), oklch(0.76 0.15 210 / 0.5))",
  "hot-take": "linear-gradient(135deg, oklch(0.74 0.25 20), oklch(0.74 0.25 20 / 0.5))",
};

export function GameSelector({ selectedGameId, onSelect }: GameSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative">
      {/* Scroll fade hints */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-bg-deep/80 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-bg-deep/80 to-transparent"
        aria-hidden="true"
      />

      <div
        ref={scrollRef}
        className="scrollbar-hide flex snap-x snap-mandatory gap-6 overflow-x-auto px-2 pb-4"
      >
        {GAME_MANIFESTS.map((game) => {
          const isSelected = game.id === selectedGameId;
          const icon = GAME_ICONS[game.id];
          const accentGradient = GAME_ACCENT_GRADIENT[game.id];

          return (
            <button
              key={game.id}
              type="button"
              onClick={() => onSelect(game.id)}
              aria-label={game.name}
              aria-pressed={isSelected}
              className="relative snap-center rounded-2xl transition-transform duration-200 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep"
            >
              {/* Gradient border wrapper for selected card */}
              {isSelected && accentGradient && (
                <div
                  className="absolute -inset-[2px] rounded-[18px]"
                  style={{ background: accentGradient }}
                  aria-hidden="true"
                />
              )}

              {/* Checkmark badge */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="absolute -right-2 -top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-primary shadow-lg"
                >
                  <Check className="h-5 w-5 text-white" strokeWidth={3} />
                </motion.div>
              )}

              <GlassPanel
                glow={isSelected}
                rounded="2xl"
                className={`relative flex min-w-[320px] flex-col gap-3 border-2 p-6 transition-all duration-300 ${
                  isSelected
                    ? (GAME_ACCENT_BORDER[game.id] ?? "border-primary")
                    : "border-white/[0.15] hover:border-white/[0.25]"
                }`}
              >
                {/* Icon + Name row */}
                <div className="flex items-center gap-4">
                  {icon ?? <Sparkles className="h-10 w-10 text-text-muted" />}
                  <div className="flex flex-col items-start">
                    <span className="font-display text-[28px] font-semibold text-text-primary">
                      {game.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-body text-[18px] text-text-muted">
                        {game.minPlayers}-{game.maxPlayers} players
                      </span>
                      <span className="text-[14px] text-text-muted">|</span>
                      <span className="font-body text-[18px] text-text-muted">
                        ~{game.estimatedMinutes}min
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-left font-body text-[20px] leading-relaxed text-text-muted">
                  {game.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {game.aiRequired && (
                    <span className="rounded-full bg-accent-4/20 px-3 py-1 font-body text-[16px] font-medium text-accent-4">
                      AI Powered
                    </span>
                  )}
                  {game.tags
                    .filter((t) => t !== "ai")
                    .map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/[0.10] bg-white/[0.06] px-3 py-1 font-body text-[16px] text-text-primary/70"
                      >
                        {tag}
                      </span>
                    ))}
                </div>
              </GlassPanel>
            </button>
          );
        })}
      </div>
    </div>
  );
}
