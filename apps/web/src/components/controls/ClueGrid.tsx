"use client";

import { haptics } from "@flimflam/ui";
import { useCallback, useState } from "react";

const CLUE_VALUES = [200, 400, 600, 800, 1000];

interface ClueGridProps {
  categories: string[];
  answeredClues: string[];
  onSelect: (clueId: string) => void;
  readOnly?: boolean;
}

/**
 * Compact mini Jeopardy board for clue selection on the phone.
 * Each cell represents a clue at a given category and value.
 * The clueId format is "categoryIndex,clueIndex".
 */
export function ClueGrid({ categories, answeredClues, onSelect, readOnly }: ClueGridProps) {
  const answeredSet = new Set(answeredClues);
  const [rippleId, setRippleId] = useState<string | null>(null);

  const handleSelect = useCallback(
    (clueId: string) => {
      if (readOnly) return;
      if (answeredSet.has(clueId)) return;
      haptics.tap();

      // Trigger ripple animation
      setRippleId(clueId);
      setTimeout(() => setRippleId(null), 400);

      onSelect(clueId);
    },
    [answeredSet, onSelect, readOnly],
  );

  return (
    <div data-testid="brain-board-grid" className="flex w-full flex-col gap-2 px-2">
      <p className="text-center font-body text-lg font-medium text-text-primary">Pick a clue</p>

      {/* Responsive grid: 3 columns on small phones, full columns on wider screens */}
      <div className="grid grid-cols-3 min-[420px]:grid-cols-6 gap-1.5">
        {categories.map((cat, catIdx) => (
          <div key={`${catIdx}-${cat}`} className="flex flex-col gap-1.5">
            {/* Category header */}
            <div
              className="flex min-h-[40px] items-center justify-center rounded-md border border-accent-brainboard/30 bg-accent-brainboard/15 px-1 py-1.5 text-center font-display text-sm font-bold text-accent-brainboard uppercase leading-tight backdrop-blur-sm"
              style={{
                textShadow: "0 0 10px oklch(0.68 0.22 265 / 0.4)",
              }}
            >
              {cat}
            </div>

            {/* Value cells for this category */}
            {CLUE_VALUES.map((value) => {
              const clueIdx = CLUE_VALUES.indexOf(value);
              const clueId = `${catIdx},${clueIdx}`;
              const isAnswered = answeredSet.has(clueId);
              const isRippling = rippleId === clueId;

              return (
                <button
                  key={clueId}
                  type="button"
                  disabled={isAnswered || readOnly}
                  onClick={() => handleSelect(clueId)}
                  className={[
                    "flex min-h-[48px] items-center justify-center rounded-lg font-mono text-sm font-bold transition-all",
                    isAnswered
                      ? "animate-board-cell-reveal border border-white/10 bg-bg-surface/50 text-text-dim line-through"
                      : readOnly
                        ? "border border-accent-brainboard/20 bg-accent-brainboard/5 text-accent-3/50 cursor-default"
                        : "border border-accent-brainboard/30 bg-accent-brainboard/10 text-accent-3 backdrop-blur-sm active:scale-95",
                    isRippling && !isAnswered ? "animate-value-ripple" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ touchAction: "manipulation" }}
                  aria-label={`${categories[catIdx]} for ${value}`}
                >
                  {isAnswered ? "" : `$${value}`}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
