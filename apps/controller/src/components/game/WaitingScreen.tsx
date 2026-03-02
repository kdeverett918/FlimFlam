"use client";

import { AnimatedBackground, haptics } from "@flimflam/ui";
import { Clock } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const MESSAGES = [
  "Hang tight...",
  "Getting ready...",
  "Almost there...",
  "Stay tuned...",
  "Warming up...",
];

const GAME_TIPS: Record<string, string[]> = {
  jeopardy: [
    'Phrase your answer as a question: "What is..."',
    "Buzz quickly -- fastest finger wins!",
    "Daily Doubles let you wager big for big points",
    "Wrong answers deduct points (except in Kids mode)",
    "The board selector picks the next clue",
  ],
  "wheel-of-fortune": [
    "Spin, buy a vowel, or solve -- your choice each turn",
    "Vowels cost $250 each from your round cash",
    "Solve the puzzle to bank your round cash",
    "Bankrupt wipes your round cash -- be careful!",
    "RSTLNE are free in the bonus round",
  ],
  "family-feud": [
    "Face-off: buzz in fast with the best answer!",
    "Three strikes and the other team can steal",
    "Survey says... aim for the #1 answer!",
    "Fast Money: answer 5 questions as fast as you can",
    "Hit 200 points in Fast Money for a huge bonus",
  ],
};

const FIDGET_MILESTONES: Record<number, string> = {
  10: "Warmed up!",
  25: "Getting antsy...",
  50: "Tap champion!",
  100: "Legendary fidgeter!",
};

interface WaitingScreenProps {
  phase?: string;
  score?: number;
  rank?: number;
  totalPlayers?: number;
  submittedCount?: number;
  totalCount?: number;
  gameId?: string;
}

export function WaitingScreen({
  phase: _phase,
  score,
  rank,
  totalPlayers,
  submittedCount,
  totalCount,
  gameId,
}: WaitingScreenProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [fidgetCount, setFidgetCount] = useState(0);
  const [fidgetMessage, setFidgetMessage] = useState<string | null>(null);

  // Cycle through messages every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Cycle game tips every 4 seconds
  const tips = useMemo(() => (gameId ? (GAME_TIPS[gameId] ?? []) : []), [gameId]);

  useEffect(() => {
    if (tips.length === 0) return;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [tips]);

  const handleFidgetTap = useCallback(() => {
    haptics.tap();
    setFidgetCount((prev) => {
      const next = prev + 1;
      const milestone = FIDGET_MILESTONES[next];
      if (milestone) {
        setFidgetMessage(milestone);
        setTimeout(() => setFidgetMessage(null), 1500);
      }
      return next;
    });
  }, []);

  const contextualMessage = MESSAGES[messageIndex];

  const getRankSuffix = (r: number): string => {
    if (r % 100 >= 11 && r % 100 <= 13) return "th";
    switch (r % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-5 px-8 py-12">
      <AnimatedBackground variant="subtle" />

      {/* Score + Rank badge */}
      {typeof score === "number" && typeof rank === "number" && (
        <div className="flex items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2">
          <span className="font-mono text-lg font-bold text-primary">{score}</span>
          <span className="font-body text-xs text-text-dim">pts</span>
          <span className="mx-1 text-text-dim">|</span>
          <span className="font-mono text-sm text-text-muted">
            {rank}
            {getRankSuffix(rank)}
          </span>
          {typeof totalPlayers === "number" && (
            <span className="font-mono text-xs text-text-dim">/ {totalPlayers}</span>
          )}
        </div>
      )}

      {/* Phase icon + animated dots */}
      <div className="flex items-center gap-4">
        <Clock className="h-5 w-5 text-text-muted" />
        <div
          className="h-4 w-4 rounded-full animate-dot-pulse"
          style={{ backgroundColor: "oklch(0.72 0.22 25)", animationDelay: "0s" }}
        />
        <div
          className="h-4 w-4 rounded-full animate-dot-pulse"
          style={{ backgroundColor: "oklch(0.70 0.15 185)", animationDelay: "0.2s" }}
        />
        <div
          className="h-4 w-4 rounded-full animate-dot-pulse"
          style={{ backgroundColor: "oklch(0.72 0.22 25)", animationDelay: "0.4s" }}
        />
      </div>

      {/* Rotating flavor text */}
      <p className="text-center font-body text-xl font-medium text-text-primary">
        {contextualMessage}
      </p>

      {/* Submission progress */}
      {typeof submittedCount === "number" && typeof totalCount === "number" && totalCount > 0 && (
        <div className="flex w-full max-w-xs flex-col items-center gap-1.5">
          <span className="font-mono text-sm text-text-muted">
            {submittedCount}/{totalCount} submitted
          </span>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(submittedCount / totalCount) * 100}%`,
                background: "linear-gradient(90deg, oklch(0.72 0.22 25), oklch(0.70 0.15 185))",
              }}
            />
          </div>
        </div>
      )}

      {/* Game tip */}
      {tips.length > 0 && (
        <p className="min-h-[2.5rem] text-center font-body text-sm text-text-dim italic transition-opacity duration-300">
          {tips[tipIndex]}
        </p>
      )}

      {/* Bottom hint */}
      <p className="text-center font-body text-sm text-text-muted">Watch the main screen!</p>

      {/* Fidget tap area */}
      <button
        type="button"
        onClick={handleFidgetTap}
        className="relative mt-2 flex h-14 w-28 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] transition-all active:scale-95 active:bg-white/[0.06]"
        aria-label="Fidget tap area"
      >
        <span className="font-mono text-lg text-text-dim">{fidgetCount}</span>
        {fidgetMessage && (
          <span className="absolute -top-6 font-body text-xs font-semibold text-accent-5 animate-float-up-fade">
            {fidgetMessage}
          </span>
        )}
      </button>
    </div>
  );
}
