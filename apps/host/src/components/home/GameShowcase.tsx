"use client";

import { GAME_MANIFESTS } from "@flimflam/shared";
import { MotionCard } from "@flimflam/ui";
import { motion } from "framer-motion";
import { Users } from "lucide-react";

export function GameShowcase() {
  if (GAME_MANIFESTS.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-5xl px-4 sm:px-6">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="mb-6 text-center font-display text-2xl font-semibold text-text-muted sm:mb-8 sm:text-[32px]"
        style={{ textShadow: "0 2px 12px oklch(0.09 0.02 250 / 0.8)" }}
      >
        THE GAMES
      </motion.h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
        {GAME_MANIFESTS.map((game, i) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.9 + i * 0.08 }}
          >
            <MotionCard className="flex h-full flex-col gap-4 bg-bg-dark/85 p-5 hover:bg-bg-dark/95 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="text-[40px]">{game.icon}</span>
                <h3 className="font-display text-[24px] font-bold text-text-primary">
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

              <div className="mt-auto flex items-center gap-1.5 font-body text-[14px] text-text-muted">
                <Users className="h-4 w-4" />
                {game.minPlayers}-{game.maxPlayers}
              </div>
            </MotionCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
