"use client";

import { GAME_MANIFESTS } from "@partyline/shared";
import { GlassPanel } from "@partyline/ui";
import { Cpu, Flame, Paintbrush, Sparkles, Zap } from "lucide-react";
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
  "world-builder": "border-accent-2 shadow-[0_0_24px_oklch(0.7_0.2_330/0.25)]",
  "bluff-engine": "border-accent-3 shadow-[0_0_24px_oklch(0.75_0.18_85/0.25)]",
  "quick-draw": "border-accent-4 shadow-[0_0_24px_oklch(0.75_0.15_195/0.25)]",
  "reality-drift": "border-accent-5 shadow-[0_0_24px_oklch(0.7_0.2_145/0.25)]",
  "hot-take": "border-accent-6 shadow-[0_0_24px_oklch(0.65_0.25_25/0.25)]",
};

export function GameSelector({ selectedGameId, onSelect }: GameSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className="scrollbar-hide flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4"
    >
      {GAME_MANIFESTS.map((game) => {
        const isSelected = game.id === selectedGameId;
        const icon = GAME_ICONS[game.id];
        return (
          <button
            key={game.id}
            type="button"
            onClick={() => onSelect(game.id)}
            className="snap-center"
          >
            <GlassPanel
              glow={isSelected}
              glowColor={isSelected ? undefined : undefined}
              rounded="2xl"
              className={`flex min-w-[320px] flex-col gap-3 border p-6 transition-all duration-300 ${
                isSelected
                  ? (GAME_ACCENT_BORDER[game.id] ?? "border-accent-1")
                  : "border-white/[0.08] hover:border-white/[0.16]"
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
                    <span className="text-[14px] text-text-dim">|</span>
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
                      className="rounded-full bg-white/[0.06] px-3 py-1 font-body text-[16px] text-text-muted"
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
  );
}
