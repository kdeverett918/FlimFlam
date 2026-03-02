"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { ConfettiBurst } from "./confetti-burst";

export interface ScoreRevealProps extends React.HTMLAttributes<HTMLDivElement> {
  score: number;
  previousScore?: number;
  duration?: number;
  onComplete?: () => void;
  showDelta?: boolean;
  celebrate?: boolean;
}

function ScoreReveal({
  score,
  previousScore = 0,
  duration = 2000,
  onComplete,
  showDelta = false,
  celebrate = false,
  className,
  ...props
}: ScoreRevealProps) {
  const [displayedScore, setDisplayedScore] = React.useState(previousScore);
  const [done, setDone] = React.useState(false);
  const [showDeltaAnim, setShowDeltaAnim] = React.useState(false);
  const rafRef = React.useRef<number>(0);
  const onCompleteRef = React.useRef(onComplete);

  React.useLayoutEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  React.useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      setDisplayedScore(score);
      setDone(true);
      if (showDelta) {
        setShowDeltaAnim(true);
      }
      onCompleteRef.current?.();
      return;
    }

    const start = previousScore;
    const end = score;
    if (start === end) {
      setDone(true);
      return;
    }

    const startTime = performance.now();
    setDone(false);
    setShowDeltaAnim(false);

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - (1 - progress) ** 3;
      setDisplayedScore(Math.round(start + (end - start) * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDone(true);
        if (showDelta) {
          setShowDeltaAnim(true);
        }
        onCompleteRef.current?.();
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [score, previousScore, duration, showDelta]);

  const delta = score - previousScore;

  return (
    <div
      className={cn("relative inline-flex flex-col items-center justify-center", className)}
      {...props}
    >
      <span
        className="font-mono text-5xl tabular-nums leading-none"
        style={{ color: "oklch(0.95 0.01 80)" }}
      >
        {displayedScore.toLocaleString()}
      </span>

      {showDeltaAnim && delta !== 0 && (
        <span
          className={cn(
            "absolute -right-4 -top-4 text-lg font-mono font-bold",
            delta > 0 ? "text-success" : "text-destructive",
          )}
          style={{
            animation: "revealDeltaPop 0.3s ease-out, revealDeltaFloat 1.5s ease-out 0.3s forwards",
          }}
        >
          {delta > 0 ? `+${delta}` : delta}
        </span>
      )}

      {celebrate && <ConfettiBurst trigger={done && celebrate} preset="win" />}

      <style>{`
        @keyframes revealDeltaPop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.4); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes revealDeltaFloat {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-28px); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes revealDeltaPop {
            0% { opacity: 1; transform: none; }
            100% { opacity: 1; transform: none; }
          }
          @keyframes revealDeltaFloat {
            0% { opacity: 1; transform: none; }
            100% { opacity: 0; transform: none; }
          }
        }
      `}</style>
    </div>
  );
}
ScoreReveal.displayName = "ScoreReveal";

export { ScoreReveal };
