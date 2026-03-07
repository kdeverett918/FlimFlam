"use client";

import type { GameAward, PlayerData, ScoreEntry } from "@flimflam/shared";
import { AnimatedBackground, Button, ConfettiBurst } from "@flimflam/ui";
import type { Room } from "colyseus.js";
import { RotateCcw, Shuffle } from "lucide-react";
import { motion } from "motion/react";
import { BonusAward } from "./BonusAward";
import { GameAwards } from "./GameAwards";
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
  gameAwards?: GameAward[];
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
  gameAwards,
  room,
}: FinalScoresLayoutProps) {
  const handlePlayAgain = () => {
    room?.send("host:restart-game");
  };

  const handleNewGame = () => {
    room?.send("host:end-game");
  };

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center gap-10 p-12"
      data-testid="final-scores-root"
    >
      <AnimatedBackground variant="subtle" />

      {/* Triple confetti burst */}
      <ConfettiBurst trigger={scores.length > 0} preset="win" />
      <ConfettiBurst trigger={scores.length > 0} preset="celebration" origin={{ x: 0.1, y: 0.5 }} />
      <ConfettiBurst trigger={scores.length > 0} preset="celebration" origin={{ x: 0.9, y: 0.5 }} />

      {/* Winner crown + Title */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <motion.span
          initial={{ opacity: 0, scale: 0, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 15 }}
          className="animate-crown-pulse text-5xl"
          aria-hidden="true"
        >
          👑
        </motion.span>
        <motion.h1
          data-testid="final-scores-heading"
          initial={{ scale: 1.5, filter: "blur(12px)", opacity: 0 }}
          animate={{ scale: 1, filter: "blur(0px)", opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className={`font-display text-[64px] font-bold ${accentColorClass}`}
          style={{ textShadow: "0 0 40px currentColor" }}
        >
          FINAL SCORES
        </motion.h1>
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        <Scoreboard scores={scores} previousScores={previousScores} />
      </div>

      {/* Game awards (from commentary engine) */}
      {gameAwards && gameAwards.length > 0 && (
        <div className="relative z-10">
          <GameAwards awards={gameAwards} accentColorClass={accentColorClass} />
        </div>
      )}

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
          <Button
            variant="outline"
            size="lg"
            onClick={handlePlayAgain}
            className="gap-3 px-8 py-4 font-display text-[28px] font-bold"
          >
            <RotateCcw className="h-6 w-6" />
            Play Again
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={handleNewGame}
            className="gap-3 px-8 py-4 font-display text-[28px] font-semibold"
          >
            <Shuffle className="h-6 w-6" />
            New Game
          </Button>
        </motion.div>
      )}
    </div>
  );
}
