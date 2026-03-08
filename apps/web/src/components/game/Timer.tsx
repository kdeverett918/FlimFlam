"use client";

import { soundManager } from "@flimflam/ui";
import { useEffect, useRef, useState } from "react";

interface TimerProps {
  endTime: number;
  totalDurationMs?: number;
  size?: number;
}

// 5-phase urgency system
type TimerPhase = "calm" | "aware" | "warning" | "danger" | "critical";

function getTimerPhase(fraction: number, remainingMs: number): TimerPhase {
  if (remainingMs <= 5000 && remainingMs > 0) return "critical";
  if (fraction > 0.6) return "calm";
  if (fraction > 0.4) return "aware";
  if (fraction > 0.2) return "warning";
  return "danger";
}

function getPhaseColor(phase: TimerPhase): string {
  switch (phase) {
    case "calm":
      return "oklch(0.72 0.16 195)"; // cyan
    case "aware":
      return "oklch(0.75 0.15 160)"; // green-cyan
    case "warning":
      return "oklch(0.82 0.18 85)"; // amber
    case "danger":
      return "oklch(0.65 0.25 25)"; // red
    case "critical":
      return "oklch(0.55 0.28 20)"; // deep red
  }
}

export function Timer({ endTime, totalDurationMs, size = 140 }: TimerProps) {
  const [remaining, setRemaining] = useState(0);
  const [fraction, setFraction] = useState(1);
  const prevPhaseRef = useRef<TimerPhase>("calm");
  const lastTickSoundRef = useRef(0);

  useEffect(() => {
    const total = totalDurationMs ?? endTime - Date.now();

    function tick() {
      const now = Date.now();
      const left = Math.max(0, endTime - now);
      setRemaining(left);
      setFraction(total > 0 ? left / total : 0);

      // Sound effects on phase transitions and critical ticks
      const phase = getTimerPhase(total > 0 ? left / total : 0, left);
      if (phase !== prevPhaseRef.current) {
        if (phase === "warning" || phase === "danger" || phase === "critical") {
          soundManager.playSfx("game:tick", { dedupeMs: 200, dedupeKey: "timer:tick" });
        }
        prevPhaseRef.current = phase;
      }

      // Tick sounds during critical phase (every second)
      if (phase === "critical" && left > 0) {
        const sec = Math.ceil(left / 1000);
        if (sec !== lastTickSoundRef.current) {
          lastTickSoundRef.current = sec;
          soundManager.playSfx("game:tick", { dedupeMs: 200, dedupeKey: "timer:tick" });
        }
      } else if (phase === "danger" && left > 0) {
        const sec = Math.ceil(left / 1000);
        if (sec % 3 === 0 && sec !== lastTickSoundRef.current) {
          lastTickSoundRef.current = sec;
          soundManager.playSfx("game:tick", { dedupeMs: 200, dedupeKey: "timer:tick" });
        }
      }
    }

    prevPhaseRef.current = "calm";
    lastTickSoundRef.current = 0;
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [endTime, totalDurationMs]);

  const seconds = Math.ceil(remaining / 1000);
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - fraction);

  // 5-phase urgency colors
  const timerPhase = getTimerPhase(fraction, remaining);
  const strokeColor = getPhaseColor(timerPhase);
  const shouldPulse = timerPhase === "danger" || timerPhase === "critical";
  const shouldShake = timerPhase === "critical";
  const isUrgent = shouldPulse;
  const strokeW = Math.max(4, size * 0.06);

  return (
    <div
      className={`relative inline-flex items-center justify-center ${shouldShake ? "animate-countdown-pulse animate-timer-shake" : shouldPulse ? "animate-countdown-pulse" : ""}`}
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
