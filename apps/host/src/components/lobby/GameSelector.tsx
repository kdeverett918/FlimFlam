"use client";

import { GAME_MANIFESTS } from "@flimflam/shared";
import { GlassPanel } from "@flimflam/ui";
import { Check } from "lucide-react";
import { motion } from "motion/react";

interface GameSelectorProps {
  selectedGameId: string;
  onSelect: (gameId: string) => void;
}

const GAME_ACCENT_BORDER: Record<string, string> = {
  "brain-board": "border-accent-brainboard shadow-[0_0_24px_oklch(0.68_0.22_265/0.35)]",
  "lucky-letters": "border-accent-luckyletters shadow-[0_0_24px_oklch(0.82_0.18_85/0.35)]",
  "survey-smash": "border-accent-surveysmash shadow-[0_0_24px_oklch(0.74_0.25_25/0.35)]",
};

const GAME_ACCENT_GRADIENT: Record<string, string> = {
  "brain-board": "linear-gradient(135deg, oklch(0.68 0.22 265), oklch(0.68 0.22 265 / 0.5))",
  "lucky-letters": "linear-gradient(135deg, oklch(0.82 0.18 85), oklch(0.82 0.18 85 / 0.5))",
  "survey-smash": "linear-gradient(135deg, oklch(0.74 0.25 25), oklch(0.74 0.25 25 / 0.5))",
};

export function GameSelector({ selectedGameId, onSelect }: GameSelectorProps) {
  return (
    <div className="relative w-full">
      <div className="grid grid-cols-1 gap-8 px-2 py-6 sm:grid-cols-2 lg:grid-cols-3">
        {GAME_MANIFESTS.map((game) => {
          const isSelected = game.id === selectedGameId;
          const accentGradient = GAME_ACCENT_GRADIENT[game.id];

          return (
            <button
              key={game.id}
              type="button"
              onClick={() => onSelect(game.id)}
              aria-label={game.name}
              aria-pressed={isSelected}
              className="group relative flex h-full flex-col rounded-2xl transition-all duration-300 hover:-translate-y-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep"
            >
              {/* Gradient border wrapper for selected card */}
              {isSelected && accentGradient && (
                <div
                  className="absolute -inset-[3px] rounded-[18px] z-0"
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
                  className="absolute -right-3 -top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-primary shadow-lg border-2 border-bg-deep"
                >
                  <Check className="h-6 w-6 text-white" strokeWidth={4} />
                </motion.div>
              )}

              <GlassPanel
                glow={isSelected}
                rounded="2xl"
                className={`relative z-10 flex h-full w-full flex-col gap-4 border-2 p-6 transition-all duration-300 text-left ${
                  isSelected
                    ? (GAME_ACCENT_BORDER[game.id] ?? "border-primary")
                    : "border-white/[0.15] group-hover:border-white/[0.25]"
                }`}
              >
                {/* Icon + Name row */}
                <div className="flex items-center gap-4">
                  <div className="transition-transform duration-300 group-hover:scale-110">
                    <span className="block shrink-0 text-[38px] leading-none" aria-hidden="true">
                      {game.icon || "❔"}
                    </span>
                  </div>
                  <div className="flex flex-col items-start min-w-0">
                    <span className="w-full font-display text-[24px] font-bold leading-tight text-text-primary sm:text-[28px]">
                      {game.name}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-body text-[16px] sm:text-[18px] text-text-muted whitespace-nowrap">
                        {game.minPlayers}-{game.maxPlayers} players
                      </span>
                      <span className="text-[14px] text-text-muted hidden sm:inline opacity-50">
                        |
                      </span>
                      <span className="font-body text-[16px] sm:text-[18px] text-text-muted whitespace-nowrap">
                        ~{game.estimatedMinutes}min
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="flex-1 text-left font-body text-[18px] leading-relaxed text-text-muted/90">
                  {game.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mt-auto pt-4">
                  {game.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/[0.10] bg-white/[0.06] px-3 py-1 font-body text-[14px] text-text-primary/70 uppercase tracking-wider"
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
