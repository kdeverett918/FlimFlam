"use client";

import { GAME_MANIFESTS, GAME_PREVIEW_CONTENT } from "@flimflam/shared";
import { MotionCard } from "@flimflam/ui";
import { Users } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { GamePreviewDialog } from "./GamePreviewDialog";

const ACCENT_COLORS: Record<string, string> = {
  "brain-board": "oklch(0.68 0.22 300 / 0.25)",
  "lucky-letters": "oklch(0.82 0.18 85 / 0.25)",
  "survey-smash": "oklch(0.66 0.18 235 / 0.25)",
};

const ACCENT_SOLID_COLORS: Record<string, string> = {
  "brain-board": "oklch(0.68 0.22 300)",
  "lucky-letters": "oklch(0.82 0.18 85)",
  "survey-smash": "oklch(0.66 0.18 235)",
};

const ACCENT_TEXT: Record<string, string> = {
  "brain-board": "text-accent-brainboard",
  "lucky-letters": "text-accent-luckyletters",
  "survey-smash": "text-accent-surveysmash",
};

const CARD_GRADIENTS: Record<string, string> = {
  "brain-board": "linear-gradient(135deg, oklch(0.22 0.08 300 / 0.6), oklch(0.18 0.06 280 / 0.8))",
  "lucky-letters": "linear-gradient(135deg, oklch(0.25 0.06 85 / 0.4), oklch(0.18 0.04 70 / 0.6))",
  "survey-smash": "linear-gradient(135deg, oklch(0.22 0.07 235 / 0.5), oklch(0.18 0.05 250 / 0.7))",
};

const TAG_BG: Record<string, string> = {
  "brain-board": "bg-accent-brainboard/15 border-accent-brainboard/25 text-accent-brainboard/80",
  "lucky-letters":
    "bg-accent-luckyletters/15 border-accent-luckyletters/25 text-accent-luckyletters/80",
  "survey-smash":
    "bg-accent-surveysmash/15 border-accent-surveysmash/25 text-accent-surveysmash/80",
};

const cardVariant = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.34, 1.56, 0.64, 1] as const },
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
        className="mb-6 text-center font-display text-3xl font-black text-text-primary uppercase tracking-wider sm:mb-8 sm:text-[40px]"
        style={{
          textShadow: "0 2px 12px oklch(0.09 0.02 250 / 0.8)",
          backgroundImage: "linear-gradient(135deg, oklch(0.96 0.01 80), oklch(0.75 0.22 25))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        PICK A GAME
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
          const tagClass =
            TAG_BG[game.id] ?? "bg-white/[0.06] border-white/[0.10] text-text-primary/70";
          return (
            <motion.div key={game.id} variants={cardVariant}>
              <button
                type="button"
                onClick={() => setPreviewGameId(game.id)}
                className="group w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep rounded-xl"
              >
                <MotionCard
                  glowColor={ACCENT_COLORS[game.id]}
                  className="relative flex h-full flex-col gap-4 overflow-hidden p-5 hover:bg-bg-dark sm:p-6"
                  style={{ background: CARD_GRADIENTS[game.id] }}
                >
                  {/* Top accent border strip - thicker */}
                  <div
                    className="absolute inset-x-0 top-0 h-[3px]"
                    style={{
                      background: accentSolid
                        ? `linear-gradient(90deg, transparent, ${accentSolid}, transparent)`
                        : undefined,
                    }}
                    aria-hidden="true"
                  />

                  <div className="flex items-center gap-3">
                    {/* Styled icon container with wiggle on hover */}
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl group-hover:animate-icon-wiggle"
                      style={{
                        background: accentSolid
                          ? `${accentSolid.replace(")", " / 0.15)")}`
                          : "oklch(1 0 0 / 0.08)",
                        boxShadow: `inset 0 1px 0 oklch(1 0 0 / 0.08)${accentSolid ? `, 0 0 12px ${accentSolid.replace(")", " / 0.2)")}` : ""}`,
                      }}
                    >
                      <span className="text-[24px] group-hover:animate-icon-wiggle">
                        {game.icon}
                      </span>
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
                        className={`rounded-full border px-3 py-1 font-body text-[13px] ${tagClass}`}
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
