"use client";

import { GAME_MANIFESTS } from "@flimflam/shared";
import { GlassPanel, MotionCard } from "@flimflam/ui";
import { motion } from "framer-motion";
import { Bot, Users } from "lucide-react";

const ACCENT_COLORS: Record<string, string> = {
  "world-builder": "oklch(0.68 0.20 300 / 0.15)",
  "bluff-engine": "oklch(0.78 0.18 85 / 0.15)",
  "quick-draw": "oklch(0.72 0.18 160 / 0.15)",
  "reality-drift": "oklch(0.70 0.15 210 / 0.15)",
  "hot-take": "oklch(0.68 0.25 20 / 0.15)",
  "brain-battle": "oklch(0.65 0.22 260 / 0.15)",
};

const ACCENT_TEXT: Record<string, string> = {
  "world-builder": "text-accent-2",
  "bluff-engine": "text-accent-3",
  "quick-draw": "text-accent-4",
  "reality-drift": "text-accent-5",
  "hot-take": "text-accent-6",
  "brain-battle": "text-accent-7",
};

export function GameShowcase() {
  return (
    <section className="w-full max-w-[90vw] overflow-hidden">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="mb-8 text-center font-display text-[32px] font-semibold text-text-muted"
      >
        THE GAMES
      </motion.h2>

      <div className="flex gap-6 overflow-x-auto px-4 pb-4 scrollbar-hide">
        {GAME_MANIFESTS.map((game, i) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.9 + i * 0.1 }}
            className="shrink-0"
          >
            <MotionCard
              glowColor={ACCENT_COLORS[game.id]}
              className="flex w-[280px] flex-col gap-4 p-6"
            >
              <div className="flex items-center gap-3">
                <span className="text-[40px]">{game.icon}</span>
                <h3
                  className={`font-display text-[24px] font-bold ${ACCENT_TEXT[game.id] ?? "text-text-primary"}`}
                >
                  {game.name}
                </h3>
              </div>

              <p className="line-clamp-3 font-body text-[16px] leading-relaxed text-text-muted">
                {game.description}
              </p>

              <div className="flex flex-wrap gap-2">
                {game.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white/[0.06] px-3 py-1 font-body text-[13px] text-text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-body text-[14px] text-text-muted">
                  <Users className="h-4 w-4" />
                  {game.minPlayers}-{game.maxPlayers}
                </div>
                {game.aiRequired && (
                  <div className="flex items-center gap-1.5 rounded-full bg-accent-2/10 px-3 py-1 font-body text-[13px] text-accent-2">
                    <Bot className="h-3.5 w-3.5" />
                    AI
                  </div>
                )}
              </div>
            </MotionCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
