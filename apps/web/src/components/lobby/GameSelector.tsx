"use client";

import { GAME_MANIFESTS } from "@flimflam/shared";
import { GlassPanel, haptics } from "@flimflam/ui";
import { Check, Lock } from "lucide-react";
import { motion } from "motion/react";

interface GameSelectorProps {
  selectedGameId: string;
  isHost: boolean;
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

export function GameSelector({ selectedGameId, isHost, onSelect }: GameSelectorProps) {
  return (
    <div className="relative w-full">
      {/* Mobile: horizontal scroll. Desktop: grid */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3" style={{ WebkitOverflowScrolling: "touch" }}>
        {GAME_MANIFESTS.map((game) => {
          const isSelected = game.id === selectedGameId;
          const accentGradient = GAME_ACCENT_GRADIENT[game.id];

          // Non-host: show non-selected games as dimmed
          if (!isHost && !isSelected) {
            return (
              <div
                key={game.id}
                className="relative flex shrink-0 flex-col opacity-30 sm:shrink"
                style={{ minWidth: "240px" }}
              >
                <GlassPanel
                  rounded="2xl"
                  className="flex h-full w-full flex-col gap-3 border-2 border-white/[0.08] p-4 sm:p-5"
                >
                  <div className="flex items-center gap-3">
                    <span className="block shrink-0 text-[28px] leading-none" aria-hidden="true">
                      {game.icon || "?"}
                    </span>
                    <span className="font-display text-lg font-bold text-text-primary sm:text-xl">
                      {game.name}
                    </span>
                  </div>
                  <p className="font-body text-sm leading-relaxed text-text-muted/70 line-clamp-2">
                    {game.description}
                  </p>
                </GlassPanel>
              </div>
            );
          }

          return (
            <button
              key={game.id}
              type="button"
              onClick={() => {
                if (!isHost) return;
                haptics.tap();
                onSelect(game.id);
              }}
              disabled={!isHost}
              aria-label={game.name}
              aria-pressed={isSelected}
              className={`group relative flex shrink-0 flex-col rounded-2xl transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep sm:shrink ${
                isHost ? "hover:-translate-y-1 cursor-pointer" : "cursor-default"
              }`}
              style={{ minWidth: "240px" }}
            >
              {/* Gradient border for selected */}
              {isSelected && accentGradient && (
                <div
                  className="absolute -inset-[3px] z-0 rounded-[18px]"
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
                  className="absolute -right-2 -top-2 z-30 flex h-8 w-8 items-center justify-center rounded-full border-2 border-bg-deep bg-primary shadow-lg"
                >
                  <Check className="h-4 w-4 text-white" strokeWidth={4} />
                </motion.div>
              )}

              {/* Read-only lock icon for non-host viewing selected */}
              {!isHost && isSelected && (
                <div className="absolute -left-2 -top-2 z-30 flex h-7 w-7 items-center justify-center rounded-full border-2 border-bg-deep bg-bg-surface">
                  <Lock className="h-3.5 w-3.5 text-text-dim" />
                </div>
              )}

              <GlassPanel
                glow={isSelected}
                rounded="2xl"
                className={`relative z-10 flex h-full w-full flex-col gap-3 border-2 p-4 text-left transition-all duration-300 sm:p-5 ${
                  isSelected
                    ? (GAME_ACCENT_BORDER[game.id] ?? "border-primary")
                    : "border-white/[0.15] group-hover:border-white/[0.25]"
                }`}
              >
                {/* Icon + Name */}
                <div className="flex items-center gap-3">
                  <div className="transition-transform duration-300 group-hover:scale-110">
                    <span
                      className="block shrink-0 text-[28px] leading-none sm:text-[34px]"
                      aria-hidden="true"
                    >
                      {game.icon || "?"}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-col items-start">
                    <span className="w-full font-display text-lg font-bold leading-tight text-text-primary sm:text-xl lg:text-2xl">
                      {game.name}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="whitespace-nowrap font-body text-xs text-text-muted sm:text-sm">
                        {game.minPlayers}-{game.maxPlayers} players
                      </span>
                      <span className="hidden text-xs text-text-muted opacity-50 sm:inline">|</span>
                      <span className="whitespace-nowrap font-body text-xs text-text-muted sm:text-sm">
                        ~{game.estimatedMinutes}min
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="flex-1 text-left font-body text-sm leading-relaxed text-text-muted/90 sm:text-base">
                  {game.description}
                </p>

                {/* Tags */}
                <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                  {game.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/[0.10] bg-white/[0.06] px-2.5 py-0.5 font-body text-[11px] uppercase tracking-wider text-text-primary/70 sm:text-xs"
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
