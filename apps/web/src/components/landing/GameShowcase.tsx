"use client";

import { GAME_THEMES, type GameTheme, MotionCard, useReducedMotion } from "@flimflam/ui";
import { motion } from "motion/react";
import Link from "next/link";

import {
  FLIMFLAP_DESTINATION_NOTE,
  FLIMFLAP_DESTINATION_STATUS,
  FLIMFLAP_DESTINATION_URL,
} from "@/lib/flimflap-destination";

interface GamePreview {
  id: GameTheme;
  name: string;
  icon: string;
  tagline: string;
  description: string;
  highlights: string[];
  players: string;
  duration: string;
  gradient: string;
  status: string;
  href?: string;
  external?: boolean;
  launchNote?: string;
}

const GAMES: GamePreview[] = [
  {
    id: "flim-flap",
    name: "FlimFlap",
    icon: "\uD83D\uDC26",
    tagline: "Flap. Crash. Repeat.",
    description:
      "Arcade chaos with solo, daily challenge, and live multiplayer rooms. Compete for the highest score or just try to survive.",
    highlights: ["Solo mode", "Daily challenge", "Live multiplayer", "Leaderboards"],
    players: "1-8",
    duration: "2-10 min",
    gradient: "linear-gradient(135deg, oklch(0.68 0.2 300 / 0.3), oklch(0.55 0.18 280 / 0.1))",
    status: FLIMFLAP_DESTINATION_STATUS,
    href: FLIMFLAP_DESTINATION_URL,
    external: false,
    launchNote: FLIMFLAP_DESTINATION_NOTE,
  },
  {
    id: "brain-board",
    name: "Brain Board",
    icon: "\uD83E\uDDE0",
    tagline: "Outsmart. Outbuzz. Outplay.",
    description:
      "Pick clues from a giant board, buzz in to answer, and use Power Plays to steal the lead. Harder clues mean bigger payoffs — finish with an All-In round where everyone wagers on one final question.",
    highlights: [
      "5 categories per board",
      "Buzz-in speed matters",
      "Power Play wagers",
      "All-In finale",
    ],
    players: "2-8",
    duration: "15-20 min",
    gradient: "linear-gradient(135deg, oklch(0.68 0.22 265 / 0.25), oklch(0.55 0.18 280 / 0.08))",
    status: "Party room favorite",
  },
  {
    id: "lucky-letters",
    name: "Lucky Letters",
    icon: "\uD83C\uDFB0",
    tagline: "Spin. Guess. Solve.",
    description:
      "Spin the wheel, guess letters, and race to solve hidden phrases before anyone else. Buy vowels, call consonants, and avoid the dreaded Bust — then risk it all in the Bonus Round.",
    highlights: [
      "Spin the wheel each turn",
      "Buy vowels for 250 pts",
      "Bust loses your turn",
      "Bonus Round finale",
    ],
    players: "2-6",
    duration: "12-20 min",
    gradient: "linear-gradient(135deg, oklch(0.82 0.18 85 / 0.25), oklch(0.7 0.15 60 / 0.08))",
    status: "Party room favorite",
  },
  {
    id: "survey-smash",
    name: "Survey Smash",
    icon: "\uD83D\uDCCA",
    tagline: "Guess What Everyone Thinks.",
    description:
      "Two teams face off to match the most popular survey answers. Buzz in head-to-head, then guess all the top answers — miss three and the other team steals your points. End with a Lightning Round.",
    highlights: [
      "Team-based gameplay",
      "Face-off buzzer rounds",
      "Three strikes rule",
      "Lightning Round finale",
    ],
    players: "3-10",
    duration: "15-25 min",
    gradient: "linear-gradient(135deg, oklch(0.74 0.25 25 / 0.25), oklch(0.6 0.2 10 / 0.08))",
    status: "Party room favorite",
  },
];

export function GameShowcase() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="relative z-10 w-full">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {GAMES.map((game, index) => {
          const theme = GAME_THEMES[game.id];

          const cardContent = (
            <MotionCard className="group relative h-full p-0" glowColor={theme?.glow}>
              {/* Themed gradient accent */}
              <div
                className="pointer-events-none absolute inset-0 rounded-xl opacity-60 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: game.gradient }}
                aria-hidden="true"
              />

              <div className="relative flex flex-col gap-4 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-white/12 bg-black/20 px-3 py-1 font-display text-[10px] font-semibold uppercase tracking-[0.24em] text-text-primary/85">
                    {game.status}
                  </span>
                  {game.href ? (
                    <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 font-display text-[10px] font-semibold uppercase tracking-[0.24em] text-text-primary transition-colors group-hover:border-white/25 group-hover:bg-white/[0.12]">
                      Play now
                    </span>
                  ) : (
                    <span className="font-body text-xs text-text-dim">Host from the main room</span>
                  )}
                </div>

                {/* Header: icon + name + tagline */}
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl"
                    style={{
                      background: game.gradient,
                      boxShadow: theme?.glow ? `0 4px 24px ${theme.glow}` : undefined,
                    }}
                  >
                    <span className="text-[32px] leading-none">{game.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-bold text-text-primary sm:text-xl">
                      {game.name}
                    </h3>
                    <p className="font-display text-sm font-medium text-text-muted italic">
                      {game.tagline}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <p className="font-body text-sm leading-relaxed text-text-muted">
                  {game.description}
                </p>

                {/* Highlights */}
                <div className="flex flex-wrap gap-1.5">
                  {game.highlights.map((h) => (
                    <span
                      key={h}
                      className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 font-body text-xs font-medium text-text-muted backdrop-blur-sm"
                    >
                      {h}
                    </span>
                  ))}
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-4 font-body text-xs text-text-dim">
                  <span className="flex items-center gap-1.5">
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <title>Players</title>
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    {game.players} players
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <title>Duration</title>
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {game.duration}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                  <p className="font-body text-xs text-text-dim">
                    {game.launchNote ??
                      (game.href
                        ? "Save runs, chase daily scores, or jump into live multiplayer."
                        : "Best experienced in FLIMFLAM party rooms with everyone on one screen.")}
                  </p>
                  {game.href ? (
                    <span className="font-display text-xs font-semibold uppercase tracking-[0.22em] text-text-primary">
                      Launch
                    </span>
                  ) : null}
                </div>
              </div>
            </MotionCard>
          );

          return (
            <motion.div
              key={game.id}
              initial={reducedMotion ? false : { opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 2.2 + index * 0.15,
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {game.href ? (
                game.external ? (
                  <a
                    href={game.href}
                    className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep"
                  >
                    {cardContent}
                  </a>
                ) : (
                  <Link
                    href={game.href}
                    className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep"
                  >
                    {cardContent}
                  </Link>
                )
              ) : (
                cardContent
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
