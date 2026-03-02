"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface ScoreDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  score: number;
  previousScore?: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}

function useAnimatedNumber(value: number, duration = 600): number {
  const [displayed, setDisplayed] = React.useState(value);
  const previousRef = React.useRef(value);
  const displayedRef = React.useRef(value);

  React.useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      setDisplayed(value);
      displayedRef.current = value;
      previousRef.current = value;
      return;
    }

    const start = previousRef.current;
    const end = value;
    if (start === end) return;

    const diff = end - start;
    const startTime = performance.now();

    let rafId: number;

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      const next = Math.round(start + diff * eased);
      setDisplayed(next);
      displayedRef.current = next;

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        previousRef.current = end;
      }
    }

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      previousRef.current = displayedRef.current;
    };
  }, [value, duration]);

  return displayed;
}

const sizeClasses = {
  sm: "text-2xl",
  md: "text-4xl",
  lg: "text-6xl",
} as const;

function ScoreDisplay({
  score,
  previousScore,
  label,
  size = "md",
  className,
  ...props
}: ScoreDisplayProps) {
  const animatedScore = useAnimatedNumber(score);
  const delta = previousScore !== undefined ? score - previousScore : 0;
  const [showDelta, setShowDelta] = React.useState(false);
  const prevScoreRef = React.useRef(score);

  React.useEffect(() => {
    if (prevScoreRef.current !== score && previousScore !== undefined) {
      setShowDelta(true);
      const timeout = setTimeout(() => setShowDelta(false), 1200);
      prevScoreRef.current = score;
      return () => clearTimeout(timeout);
    }
    prevScoreRef.current = score;
  }, [score, previousScore]);

  return (
    <div
      className={cn(
        "relative inline-flex flex-col items-center rounded-xl bg-white/[0.10] backdrop-blur-md border border-white/[0.15] px-6 py-4",
        className,
      )}
      {...props}
    >
      {label && (
        <span className="text-sm text-text-muted font-body uppercase tracking-wider mb-1">
          {label}
        </span>
      )}
      <span
        className={cn(sizeClasses[size], "font-mono tabular-nums text-text-primary leading-none")}
      >
        {animatedScore.toLocaleString()}
      </span>
      {showDelta && delta !== 0 && (
        <span
          className={cn(
            "absolute -right-2 -top-2 text-lg font-mono font-bold",
            delta > 0 ? "text-success" : "text-destructive",
          )}
          style={{
            animation: "scorePopIn 0.3s ease-out, scoreFloatUp 1.2s ease-out forwards",
          }}
        >
          {delta > 0 ? `+${delta}` : delta}
        </span>
      )}
      <style>{`
        @keyframes scorePopIn {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.4); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes scoreFloatUp {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-24px); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes scorePopIn {
            0% { opacity: 1; transform: none; }
            100% { opacity: 1; transform: none; }
          }
          @keyframes scoreFloatUp {
            0% { opacity: 1; transform: none; }
            100% { opacity: 0; transform: none; }
          }
        }
      `}</style>
    </div>
  );
}
ScoreDisplay.displayName = "ScoreDisplay";

export { ScoreDisplay };
