"use client";

import { GlassPanel, haptics } from "@flimflam/ui";
import { Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const SNAP_VALUES = [-2, -1, 0, 1, 2] as const;
const LABELS = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] as const;

interface SliderProps {
  prompt?: string;
  onSubmit: (value: number) => void;
  resetNonce?: number;
}

export function Slider({ prompt, onSubmit, resetNonce }: SliderProps) {
  const [value, setValue] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastResetNonceRef = useRef<number | undefined>(resetNonce);

  useEffect(() => {
    if (resetNonce === undefined) return;
    if (lastResetNonceRef.current === undefined) {
      lastResetNonceRef.current = resetNonce;
      return;
    }
    if (resetNonce !== lastResetNonceRef.current) {
      lastResetNonceRef.current = resetNonce;
      setSubmitted(false);
      setValue(0);
    }
  }, [resetNonce]);

  const getValueFromPosition = useCallback((clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 0;

    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = ratio * 4 - 2;
    return Math.round(raw);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (submitted) return;
      e.preventDefault();
      isDraggingRef.current = true;
      const touch = e.touches[0];
      if (touch) {
        const newValue = getValueFromPosition(touch.clientX);
        setValue(newValue);
        haptics.tap();
      }
    },
    [submitted, getValueFromPosition],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDraggingRef.current || submitted) return;
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        const newValue = getValueFromPosition(touch.clientX);
        if (newValue !== value) {
          setValue(newValue);
          haptics.tap();
        }
      }
    },
    [submitted, getValueFromPosition, value],
  );

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    isDraggingRef.current = false;
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (submitted) return;
      isDraggingRef.current = true;
      const newValue = getValueFromPosition(e.clientX);
      setValue(newValue);
    },
    [submitted, getValueFromPosition],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggingRef.current || submitted) return;
      const newValue = getValueFromPosition(e.clientX);
      if (newValue !== value) {
        setValue(newValue);
      }
    },
    [submitted, getValueFromPosition, value],
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleSubmit = useCallback(() => {
    if (submitted) return;
    haptics.confirm();
    onSubmit(value);
    setSubmitted(true);
  }, [submitted, value, onSubmit]);

  const thumbPosition = ((value + 2) / 4) * 100;

  const getTrackGradient = () => {
    return "linear-gradient(to right, oklch(0.65 0.25 25), oklch(0.65 0.25 25 / 0.5), oklch(0.6 0.03 270 / 0.5), oklch(0.65 0.2 145 / 0.5), oklch(0.65 0.2 145))";
  };

  const currentLabel = LABELS[value + 2];

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-8 animate-fade-in-up">
        <GlassPanel glow className="flex flex-col items-center gap-4 px-8 py-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-5/15">
            <Check className="h-7 w-7 text-accent-5" strokeWidth={3} />
          </div>
          <p className="font-display text-xl font-bold text-accent-5">Submitted!</p>
          <p className="font-body text-sm text-text-muted">
            You voted: <span className="font-medium text-text-primary">{currentLabel}</span>
          </p>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 px-4">
      {prompt && (
        <p className="text-center font-body text-lg font-medium text-text-primary">{prompt}</p>
      )}

      {/* Current value label */}
      <p className="text-center font-display text-xl font-bold text-text-primary">{currentLabel}</p>

      {/* Slider track */}
      <div className="relative px-6 py-4">
        <div
          ref={trackRef}
          className="relative h-3 w-full cursor-pointer rounded-full"
          style={{ background: getTrackGradient() }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Snap markers -- glass dots */}
          {SNAP_VALUES.map((snapVal) => {
            const pos = ((snapVal + 2) / 4) * 100;
            return (
              <div
                key={snapVal}
                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-white/10"
                style={{
                  left: `${pos}%`,
                  backdropFilter: "blur(4px)",
                }}
              />
            );
          })}

          {/* Thumb -- glass circle with glow */}
          <div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-100"
            style={{ left: `${thumbPosition}%` }}
          >
            <div
              className="h-[52px] w-[52px] rounded-full border-2 border-white/30 bg-white/[0.08]"
              style={{
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                boxShadow: "0 0 16px oklch(0.7 0.18 265 / 0.3), inset 0 0 8px oklch(1 0 0 / 0.05)",
              }}
            />
          </div>
        </div>

        {/* Labels below */}
        <div className="mt-8 flex justify-between">
          {LABELS.map((label) => (
            <span
              key={label}
              className="max-w-16 text-center font-body text-[10px] leading-tight text-text-muted"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        className="h-14 w-full rounded-xl bg-accent-1 font-display text-lg text-white uppercase tracking-wider transition-all active:scale-95"
        style={{
          boxShadow: "0 0 16px oklch(0.7 0.18 265 / 0.25)",
        }}
      >
        Submit
      </button>
    </div>
  );
}
