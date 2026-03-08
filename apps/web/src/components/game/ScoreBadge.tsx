"use client";

import { ChevronDown, ChevronUp, Crown, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface PlayerStanding {
  sessionId: string;
  name: string;
  avatarColor: string;
  score: number;
}

interface ScoreBadgeProps {
  avatarColor: string;
  score: number;
  rank: number;
  totalPlayers: number;
  /** Optional full player list for the expandable standings panel */
  players?: PlayerStanding[];
  /** Current player's session ID (used to highlight "You" in standings) */
  mySessionId?: string | null;
  scoreMode?: "points" | "cash";
  allowExpansion?: boolean;
}

/* ── Medal colors for top 3 ── */
const MEDAL_COLORS = {
  gold: "oklch(0.82 0.18 85)",
  silver: "oklch(0.75 0.02 250)",
  bronze: "oklch(0.65 0.12 55)",
} as const;

function getMedalColor(rank: number): string | null {
  if (rank === 1) return MEDAL_COLORS.gold;
  if (rank === 2) return MEDAL_COLORS.silver;
  if (rank === 3) return MEDAL_COLORS.bronze;
  return null;
}

export function ScoreBadge({
  avatarColor,
  score,
  rank,
  totalPlayers,
  players = [],
  mySessionId = null,
  scoreMode = "points",
  allowExpansion = true,
}: ScoreBadgeProps) {
  const [animating, setAnimating] = useState(false);
  const [scoreDelta, setScoreDelta] = useState<number | null>(null);
  const prevScoreRef = useRef(score);
  const prevRankRef = useRef(rank);
  const [expanded, setExpanded] = useState(false);

  /* ── Score delta detection ── */
  useEffect(() => {
    if (prevScoreRef.current !== score) {
      const delta = score - prevScoreRef.current;
      setScoreDelta(delta);
      setAnimating(true);
      prevScoreRef.current = score;
      const timer = setTimeout(() => {
        setAnimating(false);
        setScoreDelta(null);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [score]);

  /* ── Rank change detection ── */
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

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  /* ── Sorted standings for the mini-panel ── */
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const hasStandings = players.length > 0;
  const isCashMode = scoreMode === "cash";

  /* ── Medal/rank color for the badge bar itself ── */
  const myMedalColor = getMedalColor(rank);

  /* ── Delta glow color ── */
  const deltaColor =
    scoreDelta !== null && scoreDelta > 0 ? "oklch(0.7 0.2 145)" : "oklch(0.65 0.25 25)";
  const formatScore = useCallback(
    (value: number) => (isCashMode ? `$${value.toLocaleString()}` : value.toLocaleString()),
    [isCashMode],
  );
  const formatDelta = useCallback(
    (value: number) => {
      const prefix = value > 0 ? "+" : "";
      if (isCashMode) {
        return `${prefix}$${Math.abs(value).toLocaleString()}`;
      }
      return `${prefix}${value.toLocaleString()}`;
    },
    [isCashMode],
  );

  useEffect(() => {
    if (!allowExpansion) {
      setExpanded(false);
    }
  }, [allowExpansion]);

  return (
    <>
      {/* ── Expandable standings panel (renders above the bar) ── */}
      <AnimatePresence>
        {expanded && hasStandings && allowExpansion && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 340, mass: 0.8 }}
            className="pointer-events-auto absolute bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] left-1/2 z-[49] w-[min(calc(100vw-1rem),36rem)] -translate-x-1/2 overflow-hidden"
          >
            <div
              className="rounded-[24px] border border-white/[0.12] px-3 pb-2 pt-3"
              style={{
                background:
                  "linear-gradient(to top, oklch(0.09 0.02 250 / 0.96), oklch(0.07 0.015 248 / 0.98))",
                backdropFilter: "blur(20px) saturate(1.3)",
                WebkitBackdropFilter: "blur(20px) saturate(1.3)",
              }}
            >
              {/* Header */}
              <div className="mb-2 flex items-center gap-2 px-1">
                <Users className="h-3.5 w-3.5 text-text-dim" />
                <span className="font-body text-xs font-semibold uppercase tracking-wider text-text-dim">
                  Standings
                </span>
              </div>

              {/* Player rows */}
              <div className="flex flex-col gap-0.5">
                {sortedPlayers.map((player, i) => {
                  const playerRank = i + 1;
                  const isMe = player.sessionId === mySessionId;
                  const medalColor = getMedalColor(playerRank);

                  return (
                    <motion.div
                      key={player.sessionId}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.25 }}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 ${
                        isMe ? "border border-white/[0.12] bg-white/[0.06]" : "bg-transparent"
                      }`}
                    >
                      {/* Rank number / crown */}
                      <span
                        className="flex w-6 items-center justify-center font-mono text-xs font-bold"
                        style={{ color: medalColor ?? "oklch(0.55 0 0)" }}
                      >
                        {playerRank === 1 ? (
                          <Crown className="h-4 w-4" style={{ color: MEDAL_COLORS.gold }} />
                        ) : (
                          <>
                            {playerRank}
                            {getRankSuffix(playerRank)}
                          </>
                        )}
                      </span>

                      {/* Avatar dot */}
                      <div
                        className="h-4 w-4 shrink-0 rounded-full"
                        style={{
                          backgroundColor: player.avatarColor,
                          boxShadow: isMe ? `0 0 6px ${player.avatarColor}50` : "none",
                        }}
                      />

                      {/* Name */}
                      <span className="flex-1 truncate font-body text-sm text-text-primary">
                        {player.name}
                        {isMe && (
                          <span className="ml-1.5 rounded bg-white/[0.1] px-1 py-0.5 text-[10px] font-bold uppercase text-text-muted">
                            You
                          </span>
                        )}
                      </span>

                      {/* Score */}
                      <span
                        className="font-mono text-sm font-bold tabular-nums"
                        style={{ color: medalColor ?? "oklch(0.8 0 0)" }}
                      >
                        {formatScore(player.score)}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main score bar ── */}
      <button
        type="button"
        onClick={hasStandings && allowExpansion ? toggleExpanded : undefined}
        className={`pointer-events-auto absolute bottom-0 left-1/2 z-50 flex h-14 w-[min(calc(100vw-1rem),36rem)] -translate-x-1/2 items-center justify-between rounded-[22px] border px-4 ${
          hasStandings && allowExpansion ? "cursor-pointer active:bg-white/[0.03]" : ""
        } animate-glass-breathe`}
        style={{
          background:
            "linear-gradient(to right, oklch(0.09 0.02 250 / 0.92), oklch(0.11 0.025 248 / 0.92))",
          backdropFilter: "blur(16px) saturate(1.2)",
          WebkitBackdropFilter: "blur(16px) saturate(1.2)",
          paddingBottom: "max(env(safe-area-inset-bottom), 0px)",
          borderColor: "oklch(1 0 0 / 0.15)",
          boxShadow: "0 20px 60px oklch(0 0 0 / 0.28)",
        }}
      >
        {/* Left section: avatar + score + delta */}
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

          {/* Score with color flash during delta */}
          <span
            className={`font-mono text-xl font-bold tabular-nums transition-colors duration-300 ${
              animating ? "animate-score-pop" : ""
            }`}
            style={{
              color:
                animating && scoreDelta !== null
                  ? scoreDelta > 0
                    ? "oklch(0.7 0.2 145)"
                    : "oklch(0.65 0.25 25)"
                  : (myMedalColor ?? "oklch(0.75 0.22 25)"),
            }}
          >
            {formatScore(score)}
          </span>
          <span className="font-body text-sm text-text-dim">{isCashMode ? "cash" : "pts"}</span>

          {/* Score delta floating up -- enhanced with delta-pop and glow */}
          {scoreDelta !== null && (
            <span
              className="absolute -top-6 left-10 font-mono text-lg font-bold animate-delta-pop"
              style={{
                color: deltaColor,
                textShadow: `0 0 10px ${deltaColor}, 0 0 20px ${deltaColor}60`,
              }}
            >
              {formatDelta(scoreDelta)}
            </span>
          )}
        </div>

        {/* Right section: rank + expand indicator */}
        <div className="flex items-center gap-2">
          {/* Rank movement arrows */}
          {rankDelta === "up" && <ChevronUp className="h-3.5 w-3.5 text-accent-5" />}
          {rankDelta === "down" && <ChevronDown className="h-3.5 w-3.5 text-accent-6" />}

          {/* Rank badge with medal coloring for top 3 */}
          <span
            className="font-mono text-sm font-semibold tabular-nums"
            style={{ color: myMedalColor ?? "oklch(0.6 0 0)" }}
          >
            {rank}
            {getRankSuffix(rank)}
          </span>
          <span className="font-mono text-xs text-text-dim">/ {totalPlayers}</span>

          {/* Expand/collapse chevron (only when standings data is available) */}
          {hasStandings && allowExpansion && (
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="ml-1"
            >
              <ChevronUp className="h-4 w-4 text-text-dim" />
            </motion.div>
          )}
        </div>
      </button>
    </>
  );
}
