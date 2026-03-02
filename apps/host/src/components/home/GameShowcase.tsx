"use client";

import { GAME_MANIFESTS } from "@flimflam/shared";
import { MotionCard } from "@flimflam/ui";
import { motion } from "framer-motion";
import { Bot, Users } from "lucide-react";

const ACCENT_COLORS: Record<string, string> = {
  "world-builder": "oklch(0.74 0.20 300 / 0.20)",
  "bluff-engine": "oklch(0.84 0.18 85 / 0.20)",
  "quick-draw": "oklch(0.78 0.18 160 / 0.20)",
  "reality-drift": "oklch(0.76 0.15 210 / 0.20)",
  "hot-take": "oklch(0.74 0.25 20 / 0.20)",
  "brain-battle": "oklch(0.72 0.22 260 / 0.20)",
};

const ACCENT_SOLID_COLORS: Record<string, string> = {
  "world-builder": "oklch(0.74 0.20 300)",
  "bluff-engine": "oklch(0.84 0.18 85)",
  "quick-draw": "oklch(0.78 0.18 160)",
  "reality-drift": "oklch(0.76 0.15 210)",
  "hot-take": "oklch(0.74 0.25 20)",
  "brain-battle": "oklch(0.72 0.22 260)",
};

const ACCENT_TEXT: Record<string, string> = {
  "world-builder": "text-accent-2",
  "bluff-engine": "text-accent-3",
  "quick-draw": "text-accent-4",
  "reality-drift": "text-accent-5",
  "hot-take": "text-accent-6",
  "brain-battle": "text-accent-7",
};

const cardVariant = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function GameShowcase() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 sm:px-6">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="mb-6 text-center font-display text-2xl font-semibold text-text-muted sm:mb-8 sm:text-[32px]"
        style={{ textShadow: "0 2px 12px oklch(0.09 0.02 250 / 0.8)" }}
      >
        THE GAMES
      </motion.h2>

      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        transition={{ staggerChildren: 0.08 }}
      >
        {GAME_MANIFESTS.map((game) => {
          const accentSolid = ACCENT_SOLID_COLORS[game.id];
          return (
            <motion.div key={game.id} variants={cardVariant}>
              <MotionCard
                glowColor={ACCENT_COLORS[game.id]}
                className="relative flex h-full flex-col gap-4 overflow-hidden bg-bg-dark/95 p-5 hover:bg-bg-dark sm:p-6"
              >
                {/* Top accent border strip */}
                <div
                  className="absolute inset-x-0 top-0 h-[2px]"
                  style={{
                    background: accentSolid
                      ? `linear-gradient(90deg, transparent, ${accentSolid}, transparent)`
                      : undefined,
                  }}
                  aria-hidden="true"
                />

                <div className="flex items-center gap-3">
                  {/* Styled icon container */}
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{
                      background: accentSolid
                        ? `${accentSolid.replace(")", " / 0.12)")}`
                        : "oklch(1 0 0 / 0.08)",
                      boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.08)",
                    }}
                  >
                    <span className="text-[24px]">{game.icon}</span>
                  </div>
                  <h3
                    className={`font-display text-[24px] font-bold ${ACCENT_TEXT[game.id] ?? "text-text-primary"}`}
                  >
                    {game.name}
                  </h3>
                </div>

                <p className="line-clamp-3 font-body text-[16px] leading-relaxed text-text-primary/80">
                  {game.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {game.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/[0.10] bg-white/[0.06] px-3 py-1 font-body text-[13px] text-text-primary/70"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-body text-[14px] text-text-primary/70">
                    <Users className="h-4 w-4" />
                    {game.minPlayers}-{game.maxPlayers}
                  </div>
                  {game.aiRequired && (
                    <div className="flex items-center gap-1.5 rounded-full bg-accent-2/15 px-3 py-1 font-body text-[13px] text-accent-2">
                      <Bot className="h-3.5 w-3.5" />
                      AI
                    </div>
                  )}
                </div>
              </MotionCard>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
