"use client";

import type { PlayerData, ScoreEntry } from "@flimflam/shared";
import { AnimatedBackground } from "@flimflam/ui";
import type { Room } from "colyseus.js";
import { motion } from "framer-motion";
import { RotateCcw, Shuffle } from "lucide-react";
import { BonusAward } from "./BonusAward";
import { Scoreboard } from "./Scoreboard";

export interface BonusAwardData {
  title: string;
  icon: React.ReactNode;
  playerName: string;
  reason: string;
  points?: number;
  accentColor?: string;
}

interface FinalScoresLayoutProps {
  scores: ScoreEntry[];
  previousScores?: ScoreEntry[];
  accentColorClass?: string;
  gameId?: string;
  bonusAwards?: BonusAwardData[];
  room: Room | null;
}

function buildScores(players: PlayerData[]): ScoreEntry[] {
  return players
    .map((p) => ({
      sessionId: p.sessionId,
      name: p.name,
      score: p.score,
      rank: 0,
      breakdown: [],
    }))
    .sort((a, b) => b.score - a.score)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

export { buildScores };

export function FinalScoresLayout({
  scores,
  previousScores,
  accentColorClass = "text-accent-2",
  bonusAwards,
  room,
}: FinalScoresLayoutProps) {
  const handlePlayAgain = () => {
    room?.send("host:restart-game");
  };

  const handleNewGame = () => {
    room?.send("host:end-game");
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-10 p-12">
      <AnimatedBackground variant="subtle" />

      <h1 className={`relative z-10 font-display text-[64px] font-bold ${accentColorClass}`}>
        FINAL SCORES
      </h1>

      <div className="relative z-10 w-full max-w-4xl">
        <Scoreboard scores={scores} previousScores={previousScores} />
      </div>

      {/* Bonus awards */}
      {bonusAwards && bonusAwards.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="relative z-10 flex flex-wrap justify-center gap-6"
        >
          {bonusAwards.map((award) => (
            <BonusAward
              key={award.title}
              title={award.title}
              icon={award.icon}
              playerName={award.playerName}
              reason={award.reason}
              points={award.points}
              accentColor={award.accentColor}
            />
          ))}
        </motion.div>
      )}

      {/* Play Again / New Game buttons */}
      {room && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="relative z-10 flex gap-4"
        >
          <button
            type="button"
            onClick={handlePlayAgain}
            className="flex items-center gap-3 rounded-2xl border border-primary/50 bg-primary/15 px-8 py-4 font-display text-[28px] font-semibold text-primary transition-all hover:bg-primary/25 hover:shadow-[0_0_24px_oklch(0.72_0.22_25/0.3)] active:scale-95"
          >
            <RotateCcw className="h-6 w-6" />
            Play Again
          </button>
          <button
            type="button"
            onClick={handleNewGame}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-8 py-4 font-display text-[28px] font-semibold text-text-muted transition-all hover:bg-white/10 active:scale-95"
          >
            <Shuffle className="h-6 w-6" />
            New Game
          </button>
        </motion.div>
      )}
    </div>
  );
}
