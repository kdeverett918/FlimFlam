"use client";

import type { PlayerData } from "@flimflam/shared";
import { X } from "lucide-react";
import { AnimatePresence, motion, useMotionValue } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ReelCard, type ReelCardType, cardVariants } from "./ReelCard";

interface ReelCardData {
  type: ReelCardType;
  title: string;
  subtitle: string;
  icon: string;
  playerName?: string;
  playerColor?: string;
  score?: number;
  players?: PlayerData[];
  accentHue: number;
}

interface GameReelsProps {
  players: PlayerData[];
  gameId: string;
  onClose: () => void;
}

const AUTO_ADVANCE_MS = 5000;
const DISMISS_AFTER_LAST_MS = 2000;
const SWIPE_THRESHOLD = 50;

function computeHighlights(players: PlayerData[]): ReelCardData[] {
  const cards: ReelCardData[] = [];
  const sorted = [...players].sort((a, b) => b.score - a.score);

  const winner = sorted[0];
  if (!winner || sorted.length === 0) return cards;

  // 1. Winner card
  const second = sorted[1];
  cards.push({
    type: "winner",
    title: `${winner.name} Wins!`,
    subtitle: second
      ? `Won by ${(winner.score - second.score).toLocaleString()} points`
      : "Sole competitor!",
    icon: "\u{1F3C6}",
    playerName: winner.name,
    playerColor: winner.avatarColor,
    score: winner.score,
    accentHue: 85, // amber/gold
  });

  // 2. Best Play — highest score overall
  if (second) {
    cards.push({
      type: "best-play",
      title: "Best Play",
      subtitle: "Highest score in the game",
      icon: "\u{1F525}",
      playerName: winner.name,
      playerColor: winner.avatarColor,
      score: winner.score,
      accentHue: 25, // coral/fire
    });
  }

  // 3. Comeback King — lowest-ranked player with a positive score still close to winner
  if (sorted.length >= 3) {
    const lastWithScore = [...sorted].reverse().find((p) => p.score > 0);
    if (lastWithScore && lastWithScore.sessionId !== winner.sessionId) {
      const gap = winner.score - lastWithScore.score;
      const gapPct = winner.score > 0 ? gap / winner.score : 1;
      if (gapPct < 0.6) {
        cards.push({
          type: "comeback",
          title: "Comeback King",
          subtitle: "Stayed in the fight until the very end!",
          icon: "\u{1F4C8}",
          playerName: lastWithScore.name,
          playerColor: lastWithScore.avatarColor,
          score: lastWithScore.score,
          accentHue: 160, // jade/green
        });
      }
    }
  }

  // 4. Runner Up
  if (second) {
    cards.push({
      type: "speed-demon",
      title: "Runner Up",
      subtitle: `So close! Just ${(winner.score - second.score).toLocaleString()} points behind`,
      icon: "\u{26A1}",
      playerName: second.name,
      playerColor: second.avatarColor,
      score: second.score,
      accentHue: 210, // cyan
    });
  }

  // 5. Close Call — if top 2 within 10%
  if (second && winner.score > 0) {
    const diff = winner.score - second.score;
    const pct = diff / winner.score;
    if (pct <= 0.1) {
      cards.push({
        type: "close-call",
        title: "Close Call!",
        subtitle: `Only ${diff.toLocaleString()} points separated 1st and 2nd!`,
        icon: "\u{1F90F}",
        playerName: second.name,
        playerColor: second.avatarColor,
        accentHue: 300, // violet
      });
    }
  }

  // 6. Final Standings
  cards.push({
    type: "standings",
    title: "Final Standings",
    subtitle: `${sorted.length} players competed`,
    icon: "\u{1F4CA}",
    players: sorted,
    accentHue: 265, // indigo
  });

  return cards;
}

export function GameReels({ players, gameId: _gameId, onClose }: GameReelsProps) {
  const cards = useRef(computeHighlights(players)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused] = useState(false);
  const _progressRef = useRef<HTMLDivElement>(null);
  const touchStartY = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalCards = cards.length;

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => {
      if (prev >= totalCards - 1) return prev;
      return prev + 1;
    });
  }, [totalCards]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => {
      if (prev <= 0) return prev;
      return prev - 1;
    });
  }, []);

  // Auto-advance timer
  useEffect(() => {
    if (paused) return;

    const timer = setTimeout(() => {
      if (currentIndex < totalCards - 1) {
        goNext();
      } else {
        // Auto-dismiss after last card
        const dismissTimer = setTimeout(onClose, DISMISS_AFTER_LAST_MS);
        return () => clearTimeout(dismissTimer);
      }
    }, AUTO_ADVANCE_MS);

    return () => clearTimeout(timer);
  }, [currentIndex, totalCards, goNext, onClose, paused]);

  // Auto-dismiss after viewing last card
  useEffect(() => {
    if (currentIndex === totalCards - 1 && !paused) {
      const timer = setTimeout(onClose, AUTO_ADVANCE_MS + DISMISS_AFTER_LAST_MS);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, totalCards, onClose, paused]);

  // Touch/swipe handling
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      touchStartY.set(e.clientY);
    },
    [touchStartY],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const deltaY = touchStartY.get() - e.clientY;
      if (Math.abs(deltaY) > SWIPE_THRESHOLD) {
        if (deltaY > 0) {
          goNext();
        } else {
          goPrev();
        }
      }
    },
    [touchStartY, goNext, goPrev],
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, onClose]);

  if (totalCards === 0) return null;

  const card = cards[currentIndex] as ReelCardData;

  return (
    <motion.div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: "oklch(0.08 0.02 250 / 0.95)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {/* Progress bar */}
      <div className="flex w-full gap-1 px-4 pt-4">
        {cards.map((c, i) => (
          <div
            key={`progress-${c.type}-${i}`}
            className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/10"
          >
            {i < currentIndex && <div className="absolute inset-0 rounded-full bg-white/60" />}
            {i === currentIndex && (
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-white/80"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: AUTO_ADVANCE_MS / 1000, ease: "linear" }}
                key={`bar-${currentIndex}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Close button */}
      <div className="flex justify-end px-4 pt-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-text-primary backdrop-blur-sm transition-colors hover:bg-white/20 active:bg-white/30"
          aria-label="Close reels"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Card area */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0 flex items-center justify-center"
          >
            <ReelCard {...card} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators + card counter */}
      <div className="flex flex-col items-center gap-3 pb-8">
        <div className="flex gap-2">
          {cards.map((c, i) => (
            <button
              key={`dot-${c.type}-${i}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDirection(i > currentIndex ? 1 : -1);
                setCurrentIndex(i);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentIndex ? "w-6 bg-white/80" : "w-2 bg-white/20"
              }`}
              aria-label={`Go to highlight ${i + 1}`}
            />
          ))}
        </div>
        <p className="font-body text-xs text-text-dim">
          {currentIndex + 1} / {totalCards} &middot; Swipe or tap to navigate
        </p>
      </div>
    </motion.div>
  );
}
