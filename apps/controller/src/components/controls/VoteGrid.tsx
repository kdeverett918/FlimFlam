"use client";

import { GlassPanel, haptics } from "@partyline/ui";
import { Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface VoteOption {
  index: number;
  label: string;
  author?: string;
  disabled?: boolean;
}

interface VoteGridProps {
  options: VoteOption[];
  prompt?: string;
  onConfirm: (selectedIndex: number) => void;
  resetNonce?: number;
}

export function VoteGrid({ options, prompt, onConfirm, resetNonce }: VoteGridProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const lastResetNonceRef = useRef<number | undefined>(resetNonce);

  useEffect(() => {
    if (resetNonce === undefined) return;
    if (lastResetNonceRef.current === undefined) {
      lastResetNonceRef.current = resetNonce;
      return;
    }
    if (resetNonce !== lastResetNonceRef.current) {
      lastResetNonceRef.current = resetNonce;
      setConfirmed(false);
      setSelected(null);
    }
  }, [resetNonce]);

  const handleSelect = useCallback(
    (index: number, disabled?: boolean) => {
      if (confirmed) return;
      if (disabled) return;
      haptics.tap();
      setSelected((prev) => (prev === index ? null : index));
    },
    [confirmed],
  );

  const handleConfirm = useCallback(() => {
    if (selected === null || confirmed) return;

    haptics.confirm();
    onConfirm(selected);
    setConfirmed(true);
  }, [selected, confirmed, onConfirm]);

  if (confirmed) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-8 animate-fade-in-up">
        <GlassPanel glow className="flex flex-col items-center gap-4 px-8 py-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-5/15">
            <Check className="h-7 w-7 text-accent-5" strokeWidth={3} />
          </div>
          <p className="font-display text-xl font-bold text-accent-5">Vote Confirmed!</p>
          <p className="font-body text-sm text-text-muted">Waiting for other players...</p>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4 px-4">
      {prompt && (
        <p className="text-center font-body text-lg font-medium text-text-primary">{prompt}</p>
      )}

      <div className="flex flex-col gap-3">
        {options.map((option) => {
          const isSelected = selected === option.index;
          const isDisabled = Boolean(option.disabled);
          return (
            <button
              key={option.index}
              type="button"
              disabled={isDisabled}
              onClick={() => handleSelect(option.index, option.disabled)}
              className={`min-h-14 w-full rounded-xl border px-4 py-3 text-left font-body text-lg transition-all ${
                isDisabled ? "cursor-not-allowed opacity-40" : "active:scale-[0.98]"
              } ${
                isSelected
                  ? "border-accent-1/50 bg-white/[0.08] shadow-[0_0_16px_oklch(0.7_0.18_265_/_0.2)]"
                  : "border-white/[0.08] bg-white/[0.04]"
              }`}
              style={{
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            >
              <span className={isSelected ? "text-text-primary" : "text-text-muted"}>
                {option.label}
              </span>
              {option.author && (
                <span className="mt-1 block font-body text-sm text-text-dim">{option.author}</span>
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
        style={{
          boxShadow: selected !== null ? "0 0 16px oklch(0.7 0.18 265 / 0.25)" : "none",
        }}
      >
        Confirm Vote
      </button>
    </div>
  );
}
