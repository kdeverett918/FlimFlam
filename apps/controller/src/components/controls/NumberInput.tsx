"use client";

import { GlassPanel, haptics } from "@flimflam/ui";
import { Check, Minus, Plus } from "lucide-react";
import { useCallback, useState } from "react";

interface NumberInputProps {
  min: number;
  max: number;
  label: string;
  onSubmit: (value: number) => void;
}

export function NumberInput({ min, max, label, onSubmit }: NumberInputProps) {
  const [value, setValue] = useState(min);
  const [submitted, setSubmitted] = useState(false);

  const clamp = useCallback((v: number): number => Math.max(min, Math.min(max, v)), [min, max]);

  const handleIncrement = useCallback(
    (amount: number) => {
      haptics.tap();
      setValue((prev) => clamp(prev + amount));
    },
    [clamp],
  );

  const handleDecrement = useCallback(
    (amount: number) => {
      haptics.tap();
      setValue((prev) => clamp(prev - amount));
    },
    [clamp],
  );

  const handleSetValue = useCallback(
    (v: number) => {
      haptics.tap();
      setValue(clamp(v));
    },
    [clamp],
  );

  const handleSubmit = useCallback(() => {
    if (submitted) return;
    haptics.confirm();
    onSubmit(value);
    setSubmitted(true);
  }, [submitted, onSubmit, value]);

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-8 animate-fade-in-up">
        <GlassPanel glow className="flex flex-col items-center gap-4 px-8 py-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-5/15">
            <Check className="h-7 w-7 text-accent-5" strokeWidth={3} />
          </div>
          <p className="font-display text-xl font-bold text-accent-5">Wager Set!</p>
          <p className="font-mono text-2xl font-bold text-text-primary">{value}</p>
        </GlassPanel>
      </div>
    );
  }

  // Compute step size for increments based on range
  const range = max - min;
  const smallStep = range >= 500 ? 100 : range >= 100 ? 50 : range >= 20 ? 10 : 1;
  const midpoint = Math.round((min + max) / 2);

  return (
    <div className="flex w-full flex-col gap-4 px-4">
      <p className="text-center font-body text-lg font-medium text-text-primary">{label}</p>

      {/* Value display */}
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => handleDecrement(smallStep)}
          disabled={value <= min}
          className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.06] text-text-primary transition-all active:scale-90 disabled:opacity-30"
          aria-label={`Decrease by ${smallStep}`}
        >
          <Minus className="h-6 w-6" />
        </button>

        <div className="flex min-w-[120px] flex-col items-center">
          <span className="font-mono text-4xl font-bold text-text-primary">{value}</span>
          <span className="font-body text-xs text-text-dim">
            {min} - {max}
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleIncrement(smallStep)}
          disabled={value >= max}
          className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.06] text-text-primary transition-all active:scale-90 disabled:opacity-30"
          aria-label={`Increase by ${smallStep}`}
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* Quick-set buttons */}
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => handleSetValue(min)}
          className={`min-h-[48px] rounded-lg px-4 py-2 font-mono text-sm font-bold transition-all active:scale-95 ${
            value === min
              ? "border border-primary/50 bg-primary/15 text-primary"
              : "border border-white/[0.08] bg-white/[0.04] text-text-muted"
          }`}
        >
          Min
        </button>
        {midpoint !== min && midpoint !== max && (
          <button
            type="button"
            onClick={() => handleSetValue(midpoint)}
            className={`min-h-[48px] rounded-lg px-4 py-2 font-mono text-sm font-bold transition-all active:scale-95 ${
              value === midpoint
                ? "border border-primary/50 bg-primary/15 text-primary"
                : "border border-white/[0.08] bg-white/[0.04] text-text-muted"
            }`}
          >
            {midpoint}
          </button>
        )}
        <button
          type="button"
          onClick={() => handleSetValue(max)}
          className={`min-h-[48px] rounded-lg px-4 py-2 font-mono text-sm font-bold transition-all active:scale-95 ${
            value === max
              ? "border border-primary/50 bg-primary/15 text-primary"
              : "border border-white/[0.08] bg-white/[0.04] text-text-muted"
          }`}
        >
          Max
        </button>
      </div>

      {/* Submit button */}
      <button
        type="button"
        onClick={handleSubmit}
        className="h-14 w-full rounded-xl bg-primary font-display text-lg text-white uppercase tracking-wider transition-all active:scale-95"
        style={{
          boxShadow: "0 0 16px oklch(0.72 0.22 25 / 0.25)",
        }}
      >
        Lock In Wager
      </button>
    </div>
  );
}
