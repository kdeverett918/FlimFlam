"use client";

import { GAME_MANIFESTS, GAME_PREVIEW_CONTENT } from "@flimflam/shared";
import { MotionCard } from "@flimflam/ui";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { useState } from "react";
import { GamePreviewDialog } from "./GamePreviewDialog";

const ACCENT_COLORS: Record<string, string> = {
  "brain-board": "oklch(0.68 0.22 265 / 0.20)",
  "lucky-letters": "oklch(0.82 0.18 85 / 0.20)",
  "survey-smash": "oklch(0.74 0.25 25 / 0.20)",
};

const ACCENT_SOLID_COLORS: Record<string, string> = {
  "brain-board": "oklch(0.68 0.22 265)",
  "lucky-letters": "oklch(0.82 0.18 85)",
  "survey-smash": "oklch(0.74 0.25 25)",
};

const ACCENT_TEXT: Record<string, string> = {
  "brain-board": "text-accent-brainboard",
  "lucky-letters": "text-accent-luckyletters",
  "survey-smash": "text-accent-surveysmash",
};

const cardVariant = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
  },
};

interface GameShowcaseProps {
  onPlayGame: (gameId: string) => void;
}

export function GameShowcase({ onPlayGame }: GameShowcaseProps) {
  const [previewGameId, setPreviewGameId] = useState<string | null>(null);

  const previewGame = previewGameId
    ? (GAME_MANIFESTS.find((g) => g.id === previewGameId) ?? null)
    : null;
  const previewContent = previewGameId
    ? (GAME_PREVIEW_CONTENT.find((p) => p.gameId === previewGameId) ?? null)
    : null;

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
              <button
                type="button"
                onClick={() => setPreviewGameId(game.id)}
                className="w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep rounded-xl"
              >
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
                    <span className="font-body text-[12px] text-text-dim transition-opacity group-hover:opacity-100">
                      Click to preview
                    </span>
                  </div>
                </MotionCard>
              </button>
            </motion.div>
          );
        })}
      </motion.div>

      <GamePreviewDialog
        game={previewGame}
        preview={previewContent}
        open={previewGameId !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewGameId(null);
        }}
        onPlayGame={onPlayGame}
      />
    </section>
  );
}
