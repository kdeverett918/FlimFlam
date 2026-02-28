"use client";

import { haptics } from "@partyline/ui";
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
    const interval = setInterval(update, 50);
    return () => clearInterval(interval);
  }, [timerEndsAt, durationMs]);

  if (!timerEndsAt || timerEndsAt <= 0) {
    return null;
  }

  const isUrgent = timeLeft < 10_000 && timeLeft > 0;
  const secondsLeft = Math.ceil(timeLeft / 1000);

  // Color: green -> yellow -> red
  const getBarColor = () => {
    if (progress > 0.5) return "oklch(0.65 0.2 145)";
    if (progress > 0.2) return "oklch(0.75 0.18 85)";
    return "oklch(0.65 0.25 25)";
  };

  return (
    <div
      className="fixed inset-x-0 top-0 z-50"
      style={{
        background: "oklch(0.08 0.02 280 / 0.8)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div className="h-1.5 w-full bg-white/[0.06]">
        <div
          className={`h-full transition-all duration-100 ease-linear ${
            isUrgent ? "animate-timer-pulse" : ""
          }`}
          style={{
            width: `${progress * 100}%`,
            backgroundColor: getBarColor(),
            boxShadow: isUrgent ? `0 0 8px ${getBarColor()}` : "none",
          }}
        />
      </div>
      {isUrgent && (
        <div
          className="absolute right-3 top-2.5 rounded-full px-2 py-0.5 font-mono text-xs font-bold text-accent-6"
          style={{
            background: "oklch(0.08 0.02 280 / 0.85)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid oklch(0.65 0.25 25 / 0.3)",
          }}
        >
          {secondsLeft}s
        </div>
      )}
    </div>
  );
}
