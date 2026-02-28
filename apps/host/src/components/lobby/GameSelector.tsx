"use client";

import { GAME_MANIFESTS } from "@partyline/shared";
import { useRef } from "react";

interface GameSelectorProps {
  selectedGameId: string;
  onSelect: (gameId: string) => void;
}

export function GameSelector({ selectedGameId, onSelect }: GameSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className="scrollbar-hide flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4"
    >
      {GAME_MANIFESTS.map((game) => {
        const isSelected = game.id === selectedGameId;
        return (
          <button
            key={game.id}
            type="button"
            onClick={() => onSelect(game.id)}
            className={`flex min-w-[320px] snap-center flex-col gap-3 rounded-2xl border-2 p-6 transition-all duration-300 ${
              isSelected
                ? "border-accent-1 bg-accent-1/10 shadow-[0_0_30px_oklch(0.65_0.29_12/0.2)]"
                : "border-bg-card bg-bg-card hover:border-accent-4/50"
            }`}
          >
            {/* Icon + Name row */}
            <div className="flex items-center gap-4">
              <span className="text-[48px]">{game.icon}</span>
              <div className="flex flex-col items-start">
                <span className="font-display text-[28px] text-text-primary">{game.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[18px] text-text-muted">
                    {game.minPlayers}-{game.maxPlayers} players
                  </span>
                  <span className="text-[14px] text-text-muted">|</span>
                  <span className="text-[18px] text-text-muted">~{game.estimatedMinutes}min</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-left text-[20px] leading-relaxed text-text-muted">
              {game.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {game.aiRequired && (
                <span className="rounded-full bg-accent-4/20 px-3 py-1 text-[16px] font-medium text-accent-4">
                  AI Powered
                </span>
              )}
              {game.tags
                .filter((t) => t !== "ai")
                .map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-bg-dark px-3 py-1 text-[16px] text-text-muted"
                  >
                    {tag}
                  </span>
                ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
