"use client";

import type { PlayerData } from "@flimflam/shared";
import { GlassPanel } from "@flimflam/ui";
import { Crown, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { motion } from "motion/react";

interface BrainBoardStandingsProps {
  standings: Array<{ sessionId: string; score: number }>;
  players: PlayerData[];
  mySessionId: string | null;
  currentRound: number;
  doubleDownValues: boolean;
}

/* ── Medal colours (oklch) ── */
const GOLD = "oklch(0.82 0.18 85)";
const SILVER = "oklch(0.75 0.02 250)";
const BRONZE = "oklch(0.65 0.12 55)";

const RANK_COLORS: Record<number, string> = {
  0: GOLD,
  1: SILVER,
  2: BRONZE,
};

const RANK_GLOW: Record<number, string> = {
  0: `0 0 14px ${GOLD.replace(")", " / 0.55)")}`,
  1: `0 0 10px ${SILVER.replace(")", " / 0.30)")}`,
  2: `0 0 10px ${BRONZE.replace(")", " / 0.30)")}`,
};

function ordinalSuffix(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n}st`;
  if (mod10 === 2 && mod100 !== 12) return `${n}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${n}rd`;
  return `${n}th`;
}

function getPlayerInfo(players: PlayerData[], sessionId: string): PlayerData | undefined {
  return players.find((p) => p.sessionId === sessionId);
}

export function BrainBoardStandings({
  standings,
  players,
  mySessionId,
  currentRound,
  doubleDownValues,
}: BrainBoardStandingsProps) {
  const sorted = [...standings].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col gap-2 px-4 pb-20 pt-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-1 pb-1">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent-brainboard" strokeWidth={2.5} />
          <h2 className="font-display text-lg font-black text-accent-brainboard uppercase tracking-wider">
            Standings
          </h2>
        </div>

        <span
          className={`rounded-full px-3 py-1 font-display text-xs font-bold uppercase tracking-wide ${
            doubleDownValues
              ? "bg-warning/15 text-warning animate-glow-pulse"
              : "bg-accent-brainboard/15 text-accent-brainboard"
          }`}
          style={
            doubleDownValues
              ? { boxShadow: `0 0 12px ${GOLD.replace(")", " / 0.35)")}` }
              : undefined
          }
        >
          {doubleDownValues ? "Double Down!" : `Round ${currentRound}`}
        </span>
      </div>

      {/* ── Player list ── */}
      {sorted.map((entry, rank) => {
        const info = getPlayerInfo(players, entry.sessionId);
        const isMe = entry.sessionId === mySessionId;
        const rankColor = RANK_COLORS[rank];
        const isTopThree = rank < 3;

        return (
          <motion.div
            key={entry.sessionId}
            initial={{ opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 28,
              delay: rank * 0.05,
            }}
          >
            <GlassPanel
              depth="shallow"
              className={`flex items-center gap-3 px-3 py-3 ${
                isMe ? "border-accent-brainboard/30" : ""
              }`}
              accentColor={isMe ? "oklch(0.68 0.22 265 / 0.30)" : undefined}
              glow={rank === 0}
              glowColor={rank === 0 ? GOLD.replace(")", " / 0.25)") : undefined}
            >
              {/* ── Rank indicator ── */}
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display text-sm font-black"
                style={{
                  color: rankColor ?? "oklch(0.58 0.015 80)",
                  backgroundColor: rankColor
                    ? rankColor.replace(")", " / 0.12)")
                    : "oklch(0.58 0.015 80 / 0.08)",
                  ...(isTopThree && RANK_GLOW[rank] ? { boxShadow: RANK_GLOW[rank] } : {}),
                }}
              >
                {rank === 0 ? (
                  <Crown
                    className="h-4.5 w-4.5 animate-crown-pulse"
                    strokeWidth={2.5}
                    style={{ color: GOLD }}
                  />
                ) : (
                  ordinalSuffix(rank + 1)
                )}
              </div>

              {/* ── Avatar dot ── */}
              <div
                className="h-4 w-4 shrink-0 rounded-full"
                style={{
                  backgroundColor: info?.avatarColor ?? "#6366f1",
                  boxShadow: isMe ? `0 0 8px ${info?.avatarColor ?? "#6366f1"}80` : "none",
                }}
              />

              {/* ── Name + YOU badge ── */}
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="truncate font-body text-sm font-medium text-text-primary">
                  {info?.name ?? "Player"}
                </span>
                {isMe && (
                  <span className="shrink-0 rounded bg-accent-brainboard/15 px-1.5 py-0.5 font-display text-[10px] font-black text-accent-brainboard uppercase tracking-wider">
                    You
                  </span>
                )}
              </div>

              {/* ── Score ── */}
              <span
                className="shrink-0 font-mono text-sm font-bold tabular-nums"
                style={{
                  color: isTopThree ? rankColor : "oklch(0.96 0.01 80)",
                }}
              >
                ${entry.score.toLocaleString()}
              </span>

              {/* ── Trend icon for top 3 ── */}
              {isTopThree && (
                <div className="shrink-0">
                  {rank === 0 ? (
                    <TrendingUp className="h-4 w-4" strokeWidth={2.5} style={{ color: GOLD }} />
                  ) : rank === 1 ? (
                    <TrendingUp className="h-3.5 w-3.5" strokeWidth={2} style={{ color: SILVER }} />
                  ) : (
                    <TrendingDown
                      className="h-3.5 w-3.5"
                      strokeWidth={2}
                      style={{ color: BRONZE }}
                    />
                  )}
                </div>
              )}
            </GlassPanel>
          </motion.div>
        );
      })}

      {sorted.length === 0 && (
        <GlassPanel className="flex items-center justify-center px-4 py-8">
          <p className="font-body text-sm text-text-muted">No scores yet — play a round!</p>
        </GlassPanel>
      )}
    </div>
  );
}
