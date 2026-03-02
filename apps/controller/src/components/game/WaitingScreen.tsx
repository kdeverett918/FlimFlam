"use client";

import { AnimatedBackground, haptics } from "@flimflam/ui";
import { Brain, Clock, Pencil } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const MESSAGES = [
  "The world is forming...",
  "The story unfolds...",
  "Something is brewing...",
  "Crunching the numbers...",
  "Reading the stars...",
  "Consulting the oracle...",
  "Weaving the narrative...",
  "Shuffling possibilities...",
];

const GAME_TIPS: Record<string, string[]> = {
  "world-builder": [
    "Describe specific actions -- vague answers get vague results!",
    "Use your special ability at the right moment for maximum impact.",
    "Bluff about your secret objective -- don't let others guess it.",
    "Pay attention to what others do -- it reveals their motives.",
  ],
  "bluff-engine": [
    "Write answers that sound plausible -- that's how you fool people!",
    "Short, confident answers tend to trick more people.",
    "Watch how others vote -- it might reveal who's bluffing.",
    "The real answer is sometimes the most boring one.",
  ],
  "quick-draw": [
    "Start with the outline, then add details.",
    "Big, simple shapes are easier to guess.",
    "Guess early and often -- speed matters!",
    "Don't overthink it -- first instinct is usually right.",
  ],
  "reality-drift": [
    "Real headlines are often stranger than you think.",
    "Look for specific details -- AI tends to be vague.",
    "Trust your gut on the drift check!",
    "Weird-sounding headlines might actually be real.",
  ],
  "hot-take": [
    "The most interesting takes are polarizing!",
    "Think about what would spark a debate.",
    "Try to guess where the group average will land.",
    "Extreme opinions can score big -- or backfire!",
  ],
  "brain-battle": [
    "Buzz in fast, but only if you know the answer!",
    "Wrong answers lose points -- play it safe sometimes.",
    "Higher-value clues are harder but worth more.",
    "Use your appeals wisely -- you only get a few!",
  ],
};

const FIDGET_MILESTONES: Record<number, string> = {
  10: "Warmed up!",
  25: "Getting antsy...",
  50: "Tap champion!",
  100: "Legendary fidgeter!",
};

const AI_PHASES = new Set([
  "generating",
  "ai-narrating",
  "generating-prompt",
  "generating-questions",
  "ai-generating",
  "board-generating",
  "appeal-judging",
]);

const DRAWING_PHASES = new Set(["drawing", "picking-drawer"]);

const TIMER_PHASES = new Set(["answering", "voting", "buzzing"]);

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
  phase,
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

  // Pick contextual message for known AI phases
  const contextualMessage = (() => {
    switch (phase) {
      case "generating":
        return "The world is forming";
      case "ai-narrating":
        return "The story unfolds";
      case "generating-prompt":
        return "Cooking up a question";
      case "generating-questions":
        return "Reality is shifting";
      case "ai-generating":
        return "AI is crafting hot takes based on your topics";
      case "picking-drawer":
        return "Picking the artist";
      case "drawing":
        return "Watch the artist draw";
      case "board-generating":
        return "The AI is building your custom quiz board...";
      case "board-reveal":
        return "Check out the board on the main screen!";
      case "appeal-judging":
        return "The AI judge is deliberating...";
      case "appeal-result":
        return "The verdict is in! Check the main screen!";
      case "clue-result":
        return "See the results on the main screen!";
      default:
        return MESSAGES[messageIndex];
    }
  })();

  // Phase icon
  const PhaseIcon = (() => {
    if (phase && AI_PHASES.has(phase)) return Brain;
    if (phase && DRAWING_PHASES.has(phase)) return Pencil;
    if (phase && TIMER_PHASES.has(phase)) return Clock;
    return null;
  })();

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
        {PhaseIcon && <PhaseIcon className="h-5 w-5 text-text-muted" />}
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
