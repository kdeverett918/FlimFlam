"use client";

import { useEffect, useState } from "react";

interface TimerBarProps {
  timerEndsAt: number;
  durationMs?: number;
}

export function TimerBar({ timerEndsAt, durationMs }: TimerBarProps) {
  const [progress, setProgress] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!timerEndsAt || timerEndsAt <= 0) {
      setProgress(1);
      setTimeLeft(0);
      return;
    }

    const duration = durationMs ?? timerEndsAt - Date.now();

    const update = () => {
      const now = Date.now();
      const remaining = Math.max(0, timerEndsAt - now);
      const ratio = duration > 0 ? remaining / duration : 0;

      setProgress(Math.max(0, Math.min(1, ratio)));
      setTimeLeft(remaining);
    };

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
  const getColor = () => {
    if (progress > 0.5) return "bg-green-500";
    if (progress > 0.2) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="fixed inset-x-0 top-0 z-50">
      <div className="h-1 w-full bg-text-muted/10">
        <div
          className={`h-full transition-all duration-100 ease-linear ${getColor()} ${
            isUrgent ? "animate-timer-pulse" : ""
          }`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      {isUrgent && (
        <div className="absolute right-3 top-2 rounded-full bg-bg-dark/80 px-2 py-0.5 text-xs font-bold text-red-400 backdrop-blur-sm">
          {secondsLeft}s
        </div>
      )}
    </div>
  );
}
