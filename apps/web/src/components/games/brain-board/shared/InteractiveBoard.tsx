"use client";

import { BoardCell, type CellState } from "./BoardCell";

const CLUE_VALUES = [200, 400, 600, 800, 1000];
const DOUBLE_DOWN_VALUES = [400, 800, 1200, 1600, 2000];

export interface InteractiveBoardProps {
  categories: string[];
  answeredClues: string[];
  /** Map of "col,row" to outcome for colored cells */
  clueOutcomes?: Map<string, "correct" | "wrong">;
  doubleDownValues?: boolean;
  isSelector: boolean;
  selectorName?: string | null;
  onSelect?: (clueId: string) => void;
  mode: "host" | "controller";
}

export function InteractiveBoard({
  categories,
  answeredClues,
  clueOutcomes,
  doubleDownValues = false,
  isSelector,
  selectorName,
  onSelect,
  mode,
}: InteractiveBoardProps) {
  const answeredSet = new Set(answeredClues);
  const values = doubleDownValues ? DOUBLE_DOWN_VALUES : CLUE_VALUES;

  // Controller: responsive grid. Host: always 6-col.
  const gridColsClass = mode === "host" ? "grid-cols-6" : "grid-cols-3 min-[420px]:grid-cols-6";

  return (
    <div data-testid="brain-board-grid" className="flex w-full flex-col gap-2 px-2">
      {/* Selector indicator for controller */}
      {mode === "controller" && (
        <div className="text-center">
          {isSelector ? (
            <p className="font-body text-lg font-medium text-text-primary">Pick a clue</p>
          ) : (
            <p className="font-body text-sm text-text-muted">
              {selectorName ? `${selectorName}'s pick` : "Selector is picking..."}
            </p>
          )}
        </div>
      )}

      <div className={`grid ${gridColsClass} gap-1.5`}>
        {categories.map((cat, catIdx) => (
          <div key={`${catIdx}-${cat}`} className="flex flex-col gap-1.5">
            {/* Category header */}
            <div
              className="flex min-h-[40px] items-center justify-center rounded-md border border-accent-brainboard/30 bg-accent-brainboard/15 px-1 py-1.5 text-center font-display text-sm font-bold text-accent-brainboard uppercase leading-tight backdrop-blur-sm"
              style={{ textShadow: "0 0 10px oklch(0.68 0.22 265 / 0.4)" }}
            >
              {cat}
            </div>

            {/* Value cells */}
            {values.map((value, rowIdx) => {
              const clueId = `${catIdx},${rowIdx}`;
              const isAnswered = answeredSet.has(clueId);
              const outcome = clueOutcomes?.get(clueId);

              let cellState: CellState;
              if (isAnswered) {
                cellState =
                  outcome === "correct"
                    ? "answered-correct"
                    : outcome === "wrong"
                      ? "answered-wrong"
                      : "answered-neutral";
              } else {
                cellState = isSelector ? "available" : "read-only";
              }

              return (
                <BoardCell
                  key={clueId}
                  value={value}
                  state={cellState}
                  isSelector={isSelector}
                  onSelect={() => onSelect?.(clueId)}
                  ariaLabel={`${categories[catIdx]} for ${value}`}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Waiting overlay for non-selectors on controller */}
      {mode === "controller" && !isSelector && (
        <div className="mt-1 text-center">
          <span className="font-body text-xs text-text-dim">
            Waiting for {selectorName ?? "selector"}...
          </span>
        </div>
      )}
    </div>
  );
}
