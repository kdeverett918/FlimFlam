"use client";

import { GAME_THEMES, type GameTheme, MotionCard, haptics, useReducedMotion } from "@flimflam/ui";
import { motion } from "motion/react";
import { useCallback, useRef, useState } from "react";

interface GamePreview {
  id: GameTheme;
  name: string;
  icon: string;
  tagline: string;
  highlights: string[];
  players: string;
  duration: string;
}

const GAMES: GamePreview[] = [
  {
    id: "brain-board",
    name: "Brain Board",
    icon: "\uD83E\uDDE0",
    tagline: "AI-powered trivia with a twist",
    highlights: ["AI Generated", "Strategy", "Wagering"],
    players: "2-8",
    duration: "20-30 min",
  },
  {
    id: "survey-smash",
    name: "Survey Smash",
    icon: "\uD83D\uDCCA",
    tagline: "Guess what the crowd thinks",
    highlights: ["Teams", "Fast-Paced", "Social"],
    players: "3-10",
    duration: "15-25 min",
  },
  {
    id: "lucky-letters",
    name: "Lucky Letters",
    icon: "\uD83C\uDFB0",
    tagline: "Spin the wheel, solve the puzzle",
    highlights: ["Word Game", "Wheel Spin", "Bonus Round"],
    players: "2-6",
    duration: "20-30 min",
  },
];

export function GameShowcase() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const reducedMotion = useReducedMotion();

  const handleScroll = useCallback(() => {
    if (!hasScrolled) {
      setHasScrolled(true);
    }
    haptics.tap();
  }, [hasScrolled]);

  return (
    <div className="relative z-10 w-full max-w-4xl">
      <h2 className="mb-4 text-center font-display text-sm font-semibold text-text-muted uppercase tracking-widest">
        3 Games Included
      </h2>

      <div
        ref={scrollRef}
        className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:justify-center sm:gap-6"
        onScroll={handleScroll}
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {GAMES.map((game, index) => {
          const theme = GAME_THEMES[game.id];
          return (
            <motion.div
              key={game.id}
              className="w-[300px] flex-shrink-0 snap-center sm:w-[340px] lg:w-[360px]"
              initial={reducedMotion ? false : { opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: 2.2 + index * 0.12,
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <MotionCard
                className="h-full p-5"
                glowColor={theme?.glow}
                style={{
                  borderColor: theme
                    ? theme.accent.includes("var")
                      ? undefined
                      : `${theme.primaryBlob.replace(")", " / 0.2)")}`
                    : undefined,
                }}
              >
                {/* Icon + Name */}
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-[48px] leading-none">{game.icon}</span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-text-primary">
                      {game.name}
                    </h3>
                    <p className="font-body text-sm text-text-muted">{game.tagline}</p>
                  </div>
                </div>

                {/* Highlight pills */}
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {game.highlights.map((h) => (
                    <span
                      key={h}
                      className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 font-body text-xs text-text-muted"
                    >
                      {h}
                    </span>
                  ))}
                </div>

                {/* Badges */}
                <div className="flex items-center gap-3 font-body text-xs text-text-dim">
                  <span className="flex items-center gap-1">
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
                  <span className="flex items-center gap-1">
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
              </MotionCard>
            </motion.div>
          );
        })}
      </div>

      {/* Swipe hint — fades after first scroll */}
      {!hasScrolled && (
        <motion.p
          className="mt-2 text-center font-body text-xs text-text-dim sm:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 2.8, duration: 0.4 }}
        >
          Swipe to explore
        </motion.p>
      )}
    </div>
  );
}
