"use client";

import { GAME_MANIFESTS } from "@flimflam/shared";
import { GlassPanel } from "@flimflam/ui";
import { Sparkles } from "lucide-react";
import { useRef } from "react";

interface GameSelectorProps {
  selectedGameId: string;
  onSelect: (gameId: string) => void;
}

const GAME_ICONS: Record<string, React.ReactNode> = {};

const GAME_ACCENT_BORDER: Record<string, string> = {};

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
            aria-label={game.name}
            aria-pressed={isSelected}
            className="snap-center rounded-2xl transition-transform duration-200 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep"
          >
            <GlassPanel
              glow={isSelected}
              rounded="2xl"
              className={`flex min-w-[320px] flex-col gap-3 border p-6 transition-all duration-300 ${
                isSelected
                  ? (GAME_ACCENT_BORDER[game.id] ?? "border-primary")
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
                {game.tags.map((tag) => (
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
