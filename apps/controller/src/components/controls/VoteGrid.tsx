"use client";

import { useCallback, useState } from "react";

interface VoteOption {
  index: number;
  label: string;
  author?: string;
}

interface VoteGridProps {
  options: VoteOption[];
  prompt?: string;
  onConfirm: (selectedIndex: number) => void;
}

export function VoteGrid({ options, prompt, onConfirm }: VoteGridProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleSelect = useCallback(
    (index: number) => {
      if (confirmed) return;
      setSelected((prev) => (prev === index ? null : index));
    },
    [confirmed],
  );

  const handleConfirm = useCallback(() => {
    if (selected === null || confirmed) return;

    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    onConfirm(selected);
    setConfirmed(true);
  }, [selected, confirmed, onConfirm]);

  if (confirmed) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-8 animate-fade-in-up">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-2/20">
          <svg
            className="h-8 w-8 text-accent-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
            role="img"
          >
            <title>Confirmed</title>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-xl font-medium text-accent-2">Vote Confirmed!</p>
        <p className="text-sm text-text-muted">Waiting for other players...</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4 px-4">
      {prompt && <p className="text-center text-lg font-medium text-text-primary">{prompt}</p>}

      <div className="flex flex-col gap-3">
        {options.map((option) => {
          const isSelected = selected === option.index;
          return (
            <button
              key={option.index}
              type="button"
              onClick={() => handleSelect(option.index)}
              className={`min-h-14 w-full rounded-xl border-2 px-4 py-3 text-left text-lg transition-all active:scale-[0.98] ${
                isSelected
                  ? "border-accent-1 bg-accent-1/15 shadow-[0_0_12px_rgba(255,51,102,0.3)]"
                  : "border-text-muted/20 bg-bg-card"
              }`}
            >
              <span className="text-text-primary">{option.label}</span>
              {option.author && (
                <span className="mt-1 block text-sm text-text-muted">{option.author}</span>
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={selected === null}
        className="h-14 w-full rounded-xl bg-accent-1 font-display text-lg text-white uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100"
      >
        Confirm Vote
      </button>
    </div>
  );
}
