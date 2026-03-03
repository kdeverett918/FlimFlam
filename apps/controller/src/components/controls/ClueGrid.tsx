"use client";

import { haptics } from "@flimflam/ui";
import { useCallback } from "react";

const CLUE_VALUES = [200, 400, 600, 800, 1000];

interface ClueGridProps {
  categories: string[];
  answeredClues: string[];
  onSelect: (clueId: string) => void;
}

/**
 * Compact mini Jeopardy board for clue selection on the phone.
 * Each cell represents a clue at a given category and value.
 * The clueId format is "categoryIndex,clueIndex".
 */
export function ClueGrid({ categories, answeredClues, onSelect }: ClueGridProps) {
  const answeredSet = new Set(answeredClues);

  const handleSelect = useCallback(
    (clueId: string) => {
      if (answeredSet.has(clueId)) return;
      haptics.tap();
      onSelect(clueId);
    },
    [answeredSet, onSelect],
  );

  return (
    <div className="flex w-full flex-col gap-2 px-2">
      <p className="text-center font-body text-lg font-medium text-text-primary">Pick a clue</p>

      {/* Category headers */}
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` }}
      >
        {categories.map((cat) => (
          <div
            key={cat}
            className="flex min-h-[36px] items-center justify-center rounded-md border border-accent-brainboard/30 bg-accent-brainboard/15 px-1 py-1 text-center font-display text-xs font-bold text-accent-brainboard uppercase leading-tight backdrop-blur-sm"
          >
            {cat}
          </div>
        ))}
      </div>

      {/* Value rows */}
      {CLUE_VALUES.map((value) => (
        <div
          key={`row-${value}`}
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` }}
        >
          {categories.map((_cat, catIdx) => {
            const clueIdx = CLUE_VALUES.indexOf(value);
            const clueId = `${catIdx},${clueIdx}`;
            const isAnswered = answeredSet.has(clueId);

            return (
              <button
                key={clueId}
                type="button"
                disabled={isAnswered}
                onClick={() => handleSelect(clueId)}
                className={`flex min-h-[48px] items-center justify-center rounded-lg font-mono text-sm font-bold transition-all active:scale-95 ${
                  isAnswered
                    ? "border border-white/10 bg-bg-surface/50 text-text-dim line-through"
                    : "border border-accent-brainboard/30 bg-accent-brainboard/10 text-accent-3 backdrop-blur-sm"
                }`}
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
  );
}
