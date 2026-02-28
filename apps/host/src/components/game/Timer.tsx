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

  // Color based on remaining fraction
  let strokeColor: string;
  let textColor: string;
  let shouldPulse = false;

  if (fraction > 0.5) {
    strokeColor = "oklch(0.7 0.2 145)"; // green
    textColor = "text-green-400";
  } else if (fraction > 0.25) {
    strokeColor = "oklch(0.85 0.18 85)"; // yellow
    textColor = "text-accent-3";
  } else {
    strokeColor = "oklch(0.65 0.29 12)"; // red
    textColor = "text-accent-1";
    if (remaining < 10000) {
      shouldPulse = true;
    }
  }

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
          stroke="oklch(0.17 0.02 285)"
          strokeWidth={8}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: "stroke-dashoffset 0.1s linear, stroke 0.5s ease",
            filter: `drop-shadow(0 0 6px ${strokeColor})`,
          }}
        />
      </svg>
      <span
        className={`absolute font-display text-[48px] ${textColor}`}
        style={{ fontSize: size * 0.34 }}
      >
        {seconds}
      </span>
    </div>
  );
}
