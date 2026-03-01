"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ScoreBadgeProps {
  avatarColor: string;
  score: number;
  rank: number;
  totalPlayers: number;
}

export function ScoreBadge({ avatarColor, score, rank, totalPlayers }: ScoreBadgeProps) {
  const [animating, setAnimating] = useState(false);
  const [scoreDelta, setScoreDelta] = useState<number | null>(null);
  const prevScoreRef = useRef(score);
  const prevRankRef = useRef(rank);

  useEffect(() => {
    if (prevScoreRef.current !== score) {
      const delta = score - prevScoreRef.current;
      setScoreDelta(delta);
      setAnimating(true);
      prevScoreRef.current = score;
      const timer = setTimeout(() => {
        setAnimating(false);
        setScoreDelta(null);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [score]);

  const [rankDelta, setRankDelta] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (prevRankRef.current !== rank) {
      setRankDelta(rank < prevRankRef.current ? "up" : "down");
      prevRankRef.current = rank;
      const timer = setTimeout(() => setRankDelta(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [rank]);

  const getRankSuffix = (r: number): string => {
    if (r % 100 >= 11 && r % 100 <= 13) return "th";
    switch (r % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex h-14 items-center justify-between border-t border-white/[0.06] px-4"
      style={{
        background: "oklch(0.09 0.02 250 / 0.9)",
        backdropFilter: "blur(16px) saturate(1.2)",
        WebkitBackdropFilter: "blur(16px) saturate(1.2)",
      }}
    >
      <div className="relative flex items-center gap-3">
        {/* Avatar color circle with glow ring */}
        <div
          className="h-8 w-8 rounded-full border-2"
          style={{
            backgroundColor: avatarColor,
            borderColor: `${avatarColor}40`,
            boxShadow: `0 0 8px ${avatarColor}30`,
          }}
        />
        {/* Score */}
        <span
          className={`font-mono text-xl font-bold text-primary ${
            animating ? "animate-score-pop" : ""
          }`}
        >
          {score}
        </span>
        <span className="font-body text-sm text-text-dim">pts</span>

        {/* Score delta floating up */}
        {scoreDelta !== null && (
          <span
            className="absolute -top-5 left-10 font-mono text-sm font-bold animate-float-up-fade"
            style={{ color: scoreDelta > 0 ? "oklch(0.7 0.2 145)" : "oklch(0.65 0.25 25)" }}
          >
            {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta}
          </span>
        )}
      </div>

      {/* Rank */}
      <div className="flex items-center gap-1.5">
        {rankDelta === "up" && <ChevronUp className="h-3.5 w-3.5 text-accent-5" />}
        {rankDelta === "down" && <ChevronDown className="h-3.5 w-3.5 text-accent-6" />}
        <span className="font-mono text-sm text-text-muted">
          {rank}
          {getRankSuffix(rank)}
        </span>
        <span className="font-mono text-xs text-text-dim">/ {totalPlayers}</span>
      </div>
    </div>
  );
}
