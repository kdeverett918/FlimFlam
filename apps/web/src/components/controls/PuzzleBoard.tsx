"use client";

import { GlassPanel, Progress } from "@flimflam/ui";

interface PuzzleBoardProps {
  puzzleDisplay: string;
  category: string;
  hint?: string;
  highlightLetters?: string[];
  revealedCount?: number;
  totalLetters?: number;
}

export function PuzzleBoard({
  puzzleDisplay,
  category,
  hint,
  highlightLetters = [],
  revealedCount = 0,
  totalLetters = 0,
}: PuzzleBoardProps) {
  // Split puzzle into words (groups separated by spaces)
  const words = puzzleDisplay.split(" ").filter(Boolean);
  const highlightSet = new Set(highlightLetters.map((l) => l.toUpperCase()));
  const progressPercent = totalLetters > 0 ? Math.round((revealedCount / totalLetters) * 100) : 0;

  return (
    <div className="flex flex-col gap-2 px-3">
      {/* Category pill */}
      <div className="flex justify-center">
        <span className="rounded-full bg-accent-luckyletters/15 px-3 py-1 font-display text-xs font-bold text-accent-luckyletters uppercase tracking-wider">
          {category}
        </span>
      </div>

      {hint && <p className="text-center font-body text-xs text-text-muted">{hint}</p>}

      {/* Puzzle grid */}
      <GlassPanel className="px-3 py-3">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5">
          {words.map((word, wi) => (
            <div key={`w${wi}-${word.slice(0, 3)}`} className="flex gap-[2px]">
              {word.split("").map((ch, ci) => {
                const isLetter = /[A-Z]/.test(ch);
                const isBlank = ch === "_";
                const isHighlighted = isLetter && highlightSet.has(ch);
                const cellKey = `${wi}-${ci}`;

                if (isLetter) {
                  return (
                    <div
                      key={cellKey}
                      className={`flex h-8 w-7 items-center justify-center rounded border font-display text-sm font-bold ${
                        isHighlighted
                          ? "animate-pulse border-accent-luckyletters bg-accent-luckyletters/20 text-accent-luckyletters"
                          : "border-accent-luckyletters/40 bg-white/10 text-text-primary"
                      }`}
                    >
                      {ch}
                    </div>
                  );
                }
                if (isBlank) {
                  return (
                    <div
                      key={cellKey}
                      className="flex h-8 w-7 items-center justify-center rounded border border-white/[0.08] bg-white/[0.03]"
                    />
                  );
                }
                // Punctuation
                return (
                  <div
                    key={cellKey}
                    className="flex h-8 w-5 items-center justify-center font-display text-sm text-text-muted"
                  >
                    {ch}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* Progress bar */}
      {totalLetters > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Progress value={progressPercent} className="h-1.5 flex-1" color="default" />
          <span className="font-mono text-[10px] text-text-dim">{progressPercent}%</span>
        </div>
      )}
    </div>
  );
}
