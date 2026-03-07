"use client";

import { haptics } from "@flimflam/ui";
import { useEffect, useRef, useState } from "react";

interface TimerBarProps {
  timerEndsAt: number;
  durationMs?: number;
}

export function TimerBar({ timerEndsAt, durationMs }: TimerBarProps) {
  const [progress, setProgress] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const hasWarnedRef = useRef(false);

  useEffect(() => {
    if (!timerEndsAt || timerEndsAt <= 0) {
      setProgress(1);
      setTimeLeft(0);
      hasWarnedRef.current = false;
      return;
    }

    const duration = durationMs ?? timerEndsAt - Date.now();

    const update = () => {
      const now = Date.now();
      const remaining = Math.max(0, timerEndsAt - now);
      const ratio = duration > 0 ? remaining / duration : 0;

      setProgress(Math.max(0, Math.min(1, ratio)));
      setTimeLeft(remaining);

      // Haptic warn at <10s threshold
      if (remaining < 10_000 && remaining > 0 && !hasWarnedRef.current) {
        hasWarnedRef.current = true;
        haptics.warn();
      }
    };

    hasWarnedRef.current = false;
    update();
    const interval = setInterval(update, 250);
    return () => clearInterval(interval);
  }, [timerEndsAt, durationMs]);

  if (!timerEndsAt || timerEndsAt <= 0) {
    return null;
  }

  const isUrgent = timeLeft < 10_000 && timeLeft > 0;
  const secondsLeft = Math.ceil(timeLeft / 1000);

  // Color transitions: cyan -> amber -> red
  const getColor = () => {
    if (progress > 0.5) return "oklch(0.72 0.16 195)"; // cyan-ish
    if (progress > 0.2) return "oklch(0.82 0.18 85)"; // amber
    return "oklch(0.65 0.25 25)"; // red
  };

  const color = getColor();

  // SVG circle params
  const radius = 19;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="pointer-events-none flex justify-center">
      <div
        data-testid="timer-root"
        className={`pointer-events-auto relative mt-2 flex items-center gap-3 rounded-2xl border px-3 py-2 ${
          isUrgent ? "border-red-500/30" : "border-white/10"
        }`}
        style={{
          background:
            "linear-gradient(135deg, oklch(0.12 0.02 260 / 0.85), oklch(0.09 0.02 250 / 0.9))",
          backdropFilter: "blur(12px) saturate(1.2)",
          WebkitBackdropFilter: "blur(12px) saturate(1.2)",
          boxShadow: isUrgent
            ? "0 0 20px oklch(0.65 0.25 25 / 0.25), 0 4px 16px oklch(0 0 0 / 0.2)"
            : "0 4px 16px oklch(0 0 0 / 0.2)",
        }}
      >
        {/* Circular ring */}
        <div className="relative flex-shrink-0" style={{ width: 48, height: 48 }}>
          <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90" aria-hidden="true">
            {/* Background track */}
            <circle
              cx="24"
              cy="24"
              r={radius}
              fill="none"
              stroke="oklch(1 0 0 / 0.08)"
              strokeWidth="4"
            />
            {/* Progress arc */}
            <circle
              cx="24"
              cy="24"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{
                transition: "stroke-dashoffset 0.3s ease-out, stroke 1s ease",
                filter: isUrgent
                  ? `drop-shadow(0 0 6px ${color})`
                  : `drop-shadow(0 0 3px ${color}80)`,
              }}
            />
          </svg>
          {/* Seconds in center */}
          <span
            className={`absolute inset-0 flex items-center justify-center font-display text-base font-bold tabular-nums ${
              isUrgent ? "animate-timer-pulse" : ""
            }`}
            style={{ color }}
          >
            {secondsLeft}
          </span>
        </div>

        {/* Progress bar beside the ring */}
        <div className="flex min-w-[100px] flex-1 flex-col justify-center gap-1.5 sm:min-w-[160px]">
          <div
            data-testid="timer-progress"
            role="progressbar"
            tabIndex={-1}
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.08]"
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${progress * 100}%`,
                backgroundColor: color,
                boxShadow: `0 0 8px ${color}88`,
                transition: "width 0.3s ease-out, background-color 1s ease",
              }}
            />
          </div>
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
            Time
          </span>
        </div>
      </div>
    </div>
  );
}
