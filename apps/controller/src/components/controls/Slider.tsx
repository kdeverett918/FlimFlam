"use client";

import { useCallback, useRef, useState } from "react";

const SNAP_VALUES = [-2, -1, 0, 1, 2] as const;
const LABELS = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] as const;

interface SliderProps {
  prompt?: string;
  onSubmit: (value: number) => void;
}

export function Slider({ prompt, onSubmit }: SliderProps) {
  const [value, setValue] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const getValueFromPosition = useCallback((clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 0;

    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    // Map 0-1 to -2 to 2
    const raw = ratio * 4 - 2;
    // Snap to nearest integer
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
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
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
          if (navigator.vibrate) {
            navigator.vibrate(10);
          }
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
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    onSubmit(value);
    setSubmitted(true);
  }, [submitted, value, onSubmit]);

  // Calculate thumb position (0 to 100%)
  const thumbPosition = ((value + 2) / 4) * 100;

  // Gradient color based on value
  const getTrackGradient = () => {
    return "linear-gradient(to right, #FF3366, #FF6B6B, #888888, #6BCB77, #32CD32)";
  };

  const currentLabel = LABELS[value + 2];

  if (submitted) {
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
            <title>Submitted</title>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-xl font-medium text-accent-2">Submitted!</p>
        <p className="text-sm text-text-muted">
          You voted: <span className="font-medium text-text-primary">{currentLabel}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 px-4">
      {prompt && <p className="text-center text-lg font-medium text-text-primary">{prompt}</p>}

      {/* Current value label */}
      <p className="text-center text-xl font-bold text-text-primary">{currentLabel}</p>

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
          {/* Snap markers */}
          {SNAP_VALUES.map((snapVal) => {
            const pos = ((snapVal + 2) / 4) * 100;
            return (
              <div
                key={snapVal}
                className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg-dark/50 bg-white/30"
                style={{ left: `${pos}%` }}
              />
            );
          })}

          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-100"
            style={{ left: `${thumbPosition}%` }}
          >
            <div className="h-12 w-12 rounded-full border-4 border-white bg-bg-card shadow-lg" />
          </div>
        </div>

        {/* Labels below */}
        <div className="mt-6 flex justify-between">
          {LABELS.map((label) => (
            <span
              key={label}
              className="max-w-16 text-center text-[10px] leading-tight text-text-muted"
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
      >
        Submit
      </button>
    </div>
  );
}
