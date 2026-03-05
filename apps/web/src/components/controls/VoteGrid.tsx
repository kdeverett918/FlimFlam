"use client";

import { GlassPanel, haptics } from "@flimflam/ui";
import { Check } from "lucide-react";
import { motion } from "motion/react";
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
        {options.map((option, i) => {
          const isSelected = selected === option.index;
          const isDisabled = Boolean(option.disabled);
          return (
            <motion.button
              key={option.index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              type="button"
              aria-pressed={isSelected}
              disabled={isDisabled}
              onClick={() => handleSelect(option.index, option.disabled)}
              className={`relative min-h-[60px] w-full rounded-xl border px-4 py-3 text-left font-body text-lg transition-all ${
                isDisabled ? "cursor-not-allowed opacity-40" : "active:scale-[0.98]"
              } ${
                isSelected
                  ? "border-primary/60 bg-white/[0.12] shadow-[0_0_16px_oklch(0.75_0.22_25_/_0.25)]"
                  : "border-white/[0.15] bg-white/[0.08]"
              }`}
              style={{
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            >
              <span className="text-text-primary">{option.label}</span>
              {option.author && (
                <span className="mt-1 block font-body text-sm text-text-dim">{option.author}</span>
              )}
              {/* Checkmark indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-primary"
                >
                  <Check className="h-4 w-4 text-white" strokeWidth={3} />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={selected === null}
        className="h-14 w-full rounded-xl bg-primary font-display text-lg text-white uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100"
        style={{
          boxShadow: selected !== null ? "0 0 16px oklch(0.72 0.22 25 / 0.25)" : "none",
        }}
      >
        Confirm Vote
      </button>
    </div>
  );
}
