"use client";
import { Scoreboard } from "@/components/game/Scoreboard";
import { Timer } from "@/components/game/Timer";
import type { PlayerData, ScoreEntry } from "@partyline/shared";
import type { Room } from "colyseus.js";
import { motion } from "framer-motion";

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
      return <DriftFinalScoresView players={players} />;
    default:
      return (
        <div className="flex min-h-screen items-center justify-center">
          <p className="font-display text-[36px] text-text-muted">Reality Drift - {phase}</p>
        </div>
      );
  }
}

function GeneratingQuestionsView() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        className="text-[96px]"
      >
        {"\uD83C\uDF00"}
      </motion.div>
      <h2 className="font-display text-[56px] text-text-primary">GENERATING QUESTIONS...</h2>
      <p className="text-[28px] text-text-muted">Mixing reality with drift...</p>
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

  return (
    <div className="flex min-h-screen flex-col p-12">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-display text-[28px] text-text-muted">
            ROUND {round} / {totalRounds}
          </span>
          {category && (
            <span className="rounded-full bg-accent-4/20 px-4 py-1 text-[20px] text-accent-4">
              {category}
            </span>
          )}
        </div>
        {timerEndTime && <Timer endTime={timerEndTime} />}
      </div>

      {/* Question */}
      <h2 className="mb-10 font-display text-[48px] leading-tight text-text-primary">{question}</h2>

      {/* Options */}
      <div className="mb-10 grid grid-cols-2 gap-4">
        {options.map((option, index) => (
          <div
            key={`${index}-${option}`}
            className="rounded-2xl border-2 border-bg-card bg-bg-card/80 p-6"
          >
            <span className="mr-4 font-display text-[28px] text-accent-4">
              {String.fromCharCode(65 + index)}
            </span>
            <span className="text-[28px] text-text-primary">{option}</span>
          </div>
        ))}
      </div>

      {/* Answer status */}
      <div className="mt-auto flex flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="h-4 w-[300px] overflow-hidden rounded-full bg-bg-card">
            <motion.div
              className="h-full rounded-full bg-accent-2"
              animate={{ width: `${total > 0 ? (answered / total) * 100 : 0}%` }}
              transition={{ type: "spring", stiffness: 100 }}
            />
          </div>
          <span className="font-display text-[28px] text-text-primary">
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
    <div className="flex min-h-screen flex-col p-12">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <span className="font-display text-[28px] text-text-muted">
          ROUND {round} / {totalRounds}
        </span>
        {timerEndTime && <Timer endTime={timerEndTime} />}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-10">
        <h2 className="font-display text-[48px] text-text-muted">REALITY CHECK</h2>

        <p className="max-w-4xl text-center text-[32px] text-text-primary">{question}</p>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180 }}
          className="rounded-3xl border-4 border-accent-4/30 bg-bg-card/60 px-16 py-8"
        >
          <span className="font-display text-[64px] text-accent-4">REAL OR DRIFT?</span>
        </motion.div>

        <div className="flex flex-col items-center gap-4">
          <p className="text-[24px] text-text-muted">Drift calls: {driftVoterIds.length}</p>

          <div className="flex items-center gap-4">
            <div className="h-4 w-[300px] overflow-hidden rounded-full bg-bg-card">
              <motion.div
                className="h-full rounded-full bg-accent-2"
                animate={{
                  width: `${totalConnected > 0 ? (submitted / totalConnected) * 100 : 0}%`,
                }}
                transition={{ type: "spring", stiffness: 100 }}
              />
            </div>
            <span className="font-display text-[28px] text-text-primary">
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

  // Meter width as percentage
  const meterPercent = Math.round(realityMeter * 100);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-12">
      <h2 className="font-display text-[48px] text-accent-1">RESULTS</h2>

      {/* Correct answer */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-[24px] text-text-muted">
          {isDrift ? "This was a DRIFT question" : "Correct answer:"}
        </span>
        {!isDrift && (
          <span className="font-display text-[40px] text-accent-2">{correctAnswer}</span>
        )}
      </div>

      {/* Reality Meter */}
      <div className="flex w-full max-w-2xl flex-col items-center gap-3">
        <span className="font-display text-[28px] text-text-muted">REALITY METER</span>
        <div className="relative h-8 w-full overflow-hidden rounded-full bg-bg-card">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${meterPercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, oklch(0.65 0.29 12), oklch(0.85 0.18 85), oklch(0.83 0.18 195))",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-[18px] text-text-primary drop-shadow-md">
              {meterPercent}% REALITY
            </span>
          </div>
        </div>
      </div>

      {/* Player results */}
      <div className="flex flex-wrap justify-center gap-4">
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
              className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 ${
                isPositive
                  ? "border-accent-2/50 bg-accent-2/10"
                  : isNegative
                    ? "border-accent-1/50 bg-accent-1/10"
                    : "border-bg-card bg-bg-card/60"
              }`}
            >
              <div
                className="flex h-[48px] w-[48px] items-center justify-center rounded-full text-[22px] font-bold text-bg-dark"
                style={{ backgroundColor: player.avatarColor }}
              >
                {player.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-[20px] text-text-primary">{player.name}</span>
              <span
                className={`font-display text-[22px] ${
                  isPositive ? "text-accent-2" : isNegative ? "text-accent-1" : "text-text-muted"
                }`}
              >
                {points > 0 ? `+${points}` : points === 0 ? "+0" : `${points}`}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function DriftFinalScoresView({ players }: { players: PlayerData[] }) {
  const scores: ScoreEntry[] = players
    .map((p) => ({
      sessionId: p.sessionId,
      name: p.name,
      score: p.score,
      rank: 0,
      breakdown: [],
    }))
    .sort((a, b) => b.score - a.score)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 p-12">
      <h1 className="font-display text-[64px] text-accent-3">FINAL SCORES</h1>
      <div className="w-full max-w-4xl">
        <Scoreboard scores={scores} />
      </div>
    </div>
  );
}
