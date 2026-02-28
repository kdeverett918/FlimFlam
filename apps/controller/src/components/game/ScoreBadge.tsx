"use client";

import { useEffect, useRef, useState } from "react";

interface ScoreBadgeProps {
  avatarColor: string;
  score: number;
  rank: number;
  totalPlayers: number;
}

export function ScoreBadge({ avatarColor, score, rank, totalPlayers }: ScoreBadgeProps) {
  const [animating, setAnimating] = useState(false);
  const prevScoreRef = useRef(score);

  useEffect(() => {
    if (prevScoreRef.current !== score) {
      setAnimating(true);
      prevScoreRef.current = score;
      const timer = setTimeout(() => setAnimating(false), 400);
      return () => clearTimeout(timer);
    }
  }, [score]);

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
    <div className="fixed inset-x-0 bottom-0 z-50 flex h-12 items-center justify-between bg-bg-dark/90 px-4 backdrop-blur-sm border-t border-text-muted/10">
      <div className="flex items-center gap-3">
        {/* Avatar color circle */}
        <div
          className="h-8 w-8 rounded-full border-2 border-white/20"
          style={{ backgroundColor: avatarColor }}
        />
        {/* Score */}
        <span
          className={`font-display text-xl text-text-primary ${
            animating ? "animate-score-pop" : ""
          }`}
        >
          {score}
        </span>
        <span className="text-sm text-text-muted">pts</span>
      </div>

      {/* Rank */}
      <div className="flex items-center gap-1">
        <span className="text-sm text-text-muted">
          {rank}
          {getRankSuffix(rank)}
        </span>
        <span className="text-xs text-text-muted/60">/ {totalPlayers}</span>
      </div>
    </div>
  );
}
