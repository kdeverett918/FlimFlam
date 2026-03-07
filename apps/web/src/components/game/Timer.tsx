"use client";

import { useEffect, useState } from "react";

interface TimerProps {
  endTime: number;
  totalDurationMs?: number;
  size?: number;
}

export function Timer({ endTime, totalDurationMs, size = 140 }: TimerProps) {
  const [remaining, setRemaining] = useState(0);
  const [fraction, setFraction] = useState(1);

  useEffect(() => {
    const total = totalDurationMs ?? endTime - Date.now();

    function tick() {
      const now = Date.now();
      const left = Math.max(0, endTime - now);
      setRemaining(left);
      setFraction(total > 0 ? left / total : 0);
    }

    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [endTime, totalDurationMs]);

  const seconds = Math.ceil(remaining / 1000);
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - fraction);

  // Color transitions: cyan -> amber -> red (matching TimerBar)
  let strokeColor: string;
  let shouldPulse = false;

  if (fraction > 0.5) {
    strokeColor = "oklch(0.72 0.16 195)"; // cyan
  } else if (fraction > 0.2) {
    strokeColor = "oklch(0.82 0.18 85)"; // amber
  } else {
    strokeColor = "oklch(0.65 0.25 25)"; // red
    if (remaining < 10000) {
      shouldPulse = true;
    }
  }

  const isUrgent = shouldPulse;
  const strokeW = Math.max(4, size * 0.06);

  return (
    <div
      className={`relative inline-flex items-center justify-center ${shouldPulse ? "animate-countdown-pulse" : ""}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <title>Timer countdown</title>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="oklch(1 0 0 / 0.08)"
          strokeWidth={strokeW}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: "stroke-dashoffset 0.15s ease-out, stroke 1s ease",
            filter: isUrgent
              ? `drop-shadow(0 0 8px ${strokeColor})`
              : `drop-shadow(0 0 4px ${strokeColor}80)`,
          }}
        />
      </svg>
      <span
        className={`absolute font-display font-bold ${isUrgent ? "animate-timer-pulse" : ""}`}
        style={{ fontSize: size * 0.32, color: strokeColor }}
      >
        {seconds}
      </span>
    </div>
  );
}
