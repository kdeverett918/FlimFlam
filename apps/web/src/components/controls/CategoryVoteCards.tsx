"use client";

import { haptics } from "@flimflam/ui";
import { useCallback, useState } from "react";

interface CategoryVoteCardsProps {
  categories: string[];
  maxSelections: number;
  onVote: (selected: string[]) => void;
}

export function CategoryVoteCards({ categories, maxSelections, onVote }: CategoryVoteCardsProps) {
  const safeScrollMarginBottom = "calc(var(--hud-safe-bottom, env(safe-area-inset-bottom)) + 1rem)";
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const toggleCategory = useCallback(
    (cat: string) => {
      if (submitted) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(cat)) {
          next.delete(cat);
        } else if (next.size < maxSelections) {
          next.add(cat);
          haptics.tap();
        } else {
          haptics.error();
          return prev;
        }
        return next;
      });
    },
    [submitted, maxSelections],
  );

  const handleSubmit = useCallback(() => {
    if (selected.size === 0 || submitted) return;
    setSubmitted(true);
    haptics.confirm();
    onVote([...selected]);
  }, [selected, submitted, onVote]);

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-8">
        <p className="font-display text-lg font-bold text-accent-wheel uppercase tracking-wider">
          Vote submitted!
        </p>
        <p className="font-body text-sm text-text-muted">Waiting for other players...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-6">
      <p className="text-center font-display text-base font-bold text-text-primary">
        Pick up to {maxSelections} categories
      </p>

      <div className="grid grid-cols-2 gap-2">
        {categories.map((cat) => {
          const isSelected = selected.has(cat);
          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className={`min-h-[48px] rounded-xl border-2 px-3 py-2.5 font-display text-sm font-bold transition-all active:scale-95 ${
                isSelected
                  ? "border-accent-wheel bg-accent-wheel/20 text-accent-wheel"
                  : "border-white/[0.12] bg-white/[0.06] text-text-primary"
              }`}
              style={{ touchAction: "manipulation" }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={selected.size === 0}
        className="min-h-[48px] rounded-xl bg-accent-wheel/20 border-2 border-accent-wheel/50 px-6 py-3 font-display text-base font-bold text-accent-wheel uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ touchAction: "manipulation", scrollMarginBottom: safeScrollMarginBottom }}
      >
        Submit Vote ({selected.size}/{maxSelections})
      </button>
    </div>
  );
}
