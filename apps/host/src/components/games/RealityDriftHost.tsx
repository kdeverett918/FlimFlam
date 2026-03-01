"use client";

import { FinalScoresLayout, buildScores } from "@/components/game/FinalScoresLayout";
import { Timer } from "@/components/game/Timer";
import type { PlayerData } from "@flimflam/shared";
import { AnimatedBackground, GlassPanel } from "@flimflam/ui";
import type { Room } from "colyseus.js";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface RealityDriftHostProps {
  phase: string;
  round: number;
  totalRounds: number;
  players: PlayerData[];
  payload: Record<string, unknown>;
  timerEndTime: number | null;
  room: Room | null;
}

export function RealityDriftHost({
  phase,
  round,
  totalRounds,
  players,
  payload,
  timerEndTime,
  room,
}: RealityDriftHostProps) {
  switch (phase) {
    case "generating-questions":
      return <GeneratingQuestionsView />;
    case "answering":
      return (
        <AnsweringView
          payload={payload}
          players={players}
          timerEndTime={timerEndTime}
          round={round}
          totalRounds={totalRounds}
        />
      );
    case "drift-check":
      return (
        <DriftCheckView
          payload={payload}
          players={players}
          timerEndTime={timerEndTime}
          round={round}
          totalRounds={totalRounds}
        />
      );
    case "results":
      return <DriftResultsView payload={payload} players={players} />;
    case "final-scores":
      return (
        <FinalScoresLayout
          scores={buildScores(players)}
          accentColorClass="text-accent-5"
          room={room}
        />
      );
    default:
      return (
        <div className="flex min-h-screen items-center justify-center">
          <AnimatedBackground variant="subtle" />
          <p className="font-display text-[36px] text-text-muted">Reality Drift - {phase}</p>
        </div>
      );
  }
}

function GeneratingQuestionsView() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8">
      <AnimatedBackground />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        className="relative z-10"
      >
        <Loader2 className="h-24 w-24 text-accent-5" />
      </motion.div>
      <h2
        className="relative z-10 font-display text-[56px] font-bold text-text-primary"
        style={{ textShadow: "0 0 30px oklch(0.70 0.15 210 / 0.4)" }}
      >
        GENERATING HEADLINES...
      </h2>
      <p className="relative z-10 font-body text-[28px] text-text-muted">
        Mixing news with hallucinations...
      </p>
    </div>
  );
}

function AnsweringView({
  payload,
  players,
  timerEndTime,
  round,
  totalRounds,
}: {
  payload: Record<string, unknown>;
  players: PlayerData[];
  timerEndTime: number | null;
  round: number;
  totalRounds: number;
}) {
  const question = (payload.question as string) ?? "Loading...";
  const options = (payload.options as string[]) ?? [];
  const category = (payload.category as string) ?? "";
  const answeredIds = (payload.answeredPlayerIds as string[]) ?? [];
  const answered = answeredIds.length;
  const total = players.filter((p) => p.connected).length;

  const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

  return (
    <div className="relative flex min-h-screen flex-col p-12">
      <AnimatedBackground variant="subtle" />

      <div className="relative z-10 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-display text-[28px] font-semibold text-text-muted">
            ROUND {round} / {totalRounds}
          </span>
          {category && (
            <span className="rounded-full bg-accent-5/20 px-4 py-1 font-body text-[20px] text-accent-5">
              {category}
            </span>
          )}
        </div>
        {timerEndTime && <Timer endTime={timerEndTime} />}
      </div>

      <GlassPanel
        glow
        glowColor="oklch(0.70 0.15 210 / 0.15)"
        rounded="2xl"
        className="relative z-10 mb-10 p-8"
      >
        <h2 className="font-display text-[48px] font-bold leading-tight text-text-primary">
          {question}
        </h2>
      </GlassPanel>

      {/* Options - 2x2 glass cards */}
      <div className="relative z-10 mb-10 grid grid-cols-2 gap-4">
        {options.map((option, index) => (
          <GlassPanel key={`${index}-${option}`} rounded="2xl" className="p-6">
            <span className="mr-4 font-display text-[28px] font-bold text-accent-5">
              {LETTERS[index] ?? String.fromCharCode(65 + index)}
            </span>
            <span className="font-body text-[28px] text-text-primary">{option}</span>
          </GlassPanel>
        ))}
      </div>

      {/* Answer status */}
      <div className="relative z-10 mt-auto flex flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          <GlassPanel rounded="2xl" className="h-4 w-[300px] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-accent-5"
              animate={{ width: `${total > 0 ? (answered / total) * 100 : 0}%` }}
              transition={{ type: "spring", stiffness: 100 }}
            />
          </GlassPanel>
          <span className="font-mono text-[28px] font-bold text-text-primary">
            {answered} / {total}
          </span>
        </div>
      </div>
    </div>
  );
}

function DriftCheckView({
  payload,
  players,
  timerEndTime,
  round,
  totalRounds,
}: {
  payload: Record<string, unknown>;
  players: PlayerData[];
  timerEndTime: number | null;
  round: number;
  totalRounds: number;
}) {
  const question = (payload.question as string) ?? "";
  const driftVoterIds = (payload.driftVoterIds as string[]) ?? [];
  const totalConnected = players.filter((p) => p.connected).length;
  const submitted = players.filter((p) => p.connected && p.hasSubmitted).length;

  return (
    <div className="relative flex min-h-screen flex-col p-12">
      <AnimatedBackground variant="subtle" />

      <div className="relative z-10 mb-8 flex items-center justify-between">
        <span className="font-display text-[28px] font-semibold text-text-muted">
          ROUND {round} / {totalRounds}
        </span>
        {timerEndTime && <Timer endTime={timerEndTime} />}
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-10">
        <h2 className="font-display text-[48px] font-bold text-text-muted">HEADLINE CHECK</h2>

        <GlassPanel rounded="2xl" className="max-w-4xl p-8 text-center">
          <p className="font-body text-[32px] text-text-primary">{question}</p>
        </GlassPanel>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180 }}
        >
          <GlassPanel
            glow
            glowColor="oklch(0.70 0.15 210 / 0.3)"
            rounded="2xl"
            className="px-16 py-8"
          >
            <span className="font-display text-[64px] font-bold text-accent-5">
              REAL OR HALLUCINATION?
            </span>
          </GlassPanel>
        </motion.div>

        <div className="flex flex-col items-center gap-4">
          <p className="font-body text-[24px] text-text-muted">
            Drift calls: {driftVoterIds.length}
          </p>

          <div className="flex items-center gap-4">
            <GlassPanel rounded="2xl" className="h-4 w-[300px] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-accent-5"
                animate={{
                  width: `${totalConnected > 0 ? (submitted / totalConnected) * 100 : 0}%`,
                }}
                transition={{ type: "spring", stiffness: 100 }}
              />
            </GlassPanel>
            <span className="font-mono text-[28px] font-bold text-text-primary">
              {submitted} / {totalConnected}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DriftResultsView({
  payload,
  players,
}: {
  payload: Record<string, unknown>;
  players: PlayerData[];
}) {
  const correctAnswer = (payload.correctAnswer as string) ?? "";
  const isDrift = (payload.isDrift as boolean) ?? false;
  const realityMeter = (payload.realityMeter as number) ?? 0.5;
  const playerResults =
    (payload.playerResults as Array<{
      sessionId: string;
      correct: boolean;
      points: number;
    }>) ?? [];

  const meterPercent = Math.round(realityMeter * 100);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 p-12">
      <AnimatedBackground variant="subtle" />

      <h2 className="relative z-10 font-display text-[48px] font-bold text-accent-5">RESULTS</h2>

      {/* Correct answer */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <span className="font-body text-[24px] text-text-muted">
          {isDrift ? "This headline was a HALLUCINATION" : "Missing detail:"}
        </span>
        {!isDrift && (
          <span className="font-display text-[40px] font-bold text-accent-5">{correctAnswer}</span>
        )}
      </div>

      {/* Reality Meter - Glass tube with gradient fill */}
      <GlassPanel
        rounded="2xl"
        className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-3 p-6"
      >
        <span className="font-display text-[28px] font-bold text-text-muted">REALITY METER</span>
        <div className="relative h-10 w-full overflow-hidden rounded-full bg-bg-surface">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${meterPercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, oklch(0.68 0.25 20), oklch(0.78 0.18 85), oklch(0.70 0.15 210))",
              boxShadow: "0 0 12px oklch(0.70 0.15 210 / 0.4)",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-[20px] font-bold text-text-primary drop-shadow-md">
              {meterPercent}% REALITY
            </span>
          </div>
        </div>
      </GlassPanel>

      {/* Player results */}
      <div className="relative z-10 flex flex-wrap justify-center gap-4">
        {playerResults.map((result) => {
          const player = players.find((p) => p.sessionId === result.sessionId);
          if (!player) return null;

          const points = result.points ?? 0;
          const isPositive = points > 0;
          const isNegative = points < 0;
          return (
            <motion.div
              key={result.sessionId}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <GlassPanel
                glow={isPositive || isNegative}
                glowColor={
                  isPositive
                    ? "oklch(0.70 0.15 210 / 0.3)"
                    : isNegative
                      ? "oklch(0.68 0.25 20 / 0.3)"
                      : undefined
                }
                rounded="2xl"
                className="flex flex-col items-center gap-2 p-4"
              >
                <div
                  className="flex h-[48px] w-[48px] items-center justify-center rounded-full font-body text-[22px] font-bold text-bg-deep"
                  style={{ backgroundColor: player.avatarColor }}
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-body text-[20px] text-text-primary">{player.name}</span>
                <span
                  className={`font-mono text-[22px] font-bold ${
                    isPositive ? "text-accent-5" : isNegative ? "text-accent-6" : "text-text-muted"
                  }`}
                >
                  {points > 0 ? `+${points}` : points === 0 ? "+0" : `${points}`}
                </span>
              </GlassPanel>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
