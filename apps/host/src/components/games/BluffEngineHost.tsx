"use client";

import { Scoreboard } from "@/components/game/Scoreboard";
import { Timer } from "@/components/game/Timer";
import type { PlayerData, ScoreEntry } from "@partyline/shared";
import type { Room } from "colyseus.js";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

interface BluffEngineHostProps {
  phase: string;
  round: number;
  totalRounds: number;
  players: PlayerData[];
  payload: Record<string, unknown>;
  timerEndTime: number | null;
  room: Room | null;
}

export function BluffEngineHost({
  phase,
  round,
  totalRounds,
  players,
  payload,
  timerEndTime,
}: BluffEngineHostProps) {
  switch (phase) {
    case "generating-prompt":
      return <GeneratingPromptView />;
    case "answer-input":
      return (
        <AnswerInputView
          payload={payload}
          players={players}
          timerEndTime={timerEndTime}
          round={round}
          totalRounds={totalRounds}
        />
      );
    case "voting":
      return <VotingView payload={payload} players={players} timerEndTime={timerEndTime} />;
    case "results":
      return <ResultsView payload={payload} players={players} />;
    case "final-scores":
      return <BluffFinalScoresView players={players} />;
    default:
      return (
        <div className="flex min-h-screen items-center justify-center">
          <p className="font-display text-[36px] text-text-muted">Bluff Engine - {phase}</p>
        </div>
      );
  }
}

function GeneratingPromptView() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8">
      <motion.div
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
        className="text-[96px]"
      >
        {"\uD83C\uDFAD"}
      </motion.div>
      <h2 className="font-display text-[56px] text-text-primary">COOKING UP A QUESTION...</h2>
      <p className="text-[28px] text-text-muted">The AI is finding an obscure trivia question</p>
    </div>
  );
}

function AnswerInputView({
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
  const question = (payload.question as string) ?? "Loading question...";
  const category = (payload.category as string) ?? "";
  const submittedIds = (payload.submittedPlayerIds as string[]) ?? [];
  const submitted = submittedIds.length;
  const total = players.length;

  return (
    <div className="flex min-h-screen flex-col p-12">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="font-display text-[28px] text-text-muted">
          ROUND {round} / {totalRounds}
        </div>
        {timerEndTime && <Timer endTime={timerEndTime} />}
      </div>

      {/* Category badge */}
      {category && (
        <div className="mb-4">
          <span className="rounded-full bg-accent-4/20 px-6 py-2 font-display text-[22px] text-accent-4">
            {category.toUpperCase()}
          </span>
        </div>
      )}

      {/* Question */}
      <div className="mb-12">
        <h2 className="font-display text-[52px] leading-tight text-text-primary">{question}</h2>
      </div>

      {/* Writing phase counter */}
      <div className="mt-auto flex flex-col items-center gap-6">
        <h3 className="font-display text-[36px] text-accent-2">WRITE YOUR BLUFF!</h3>
        <p className="text-[28px] text-text-muted">Make it sound real enough to fool everyone</p>
        <div className="flex items-center gap-4">
          <div className="h-4 w-[300px] overflow-hidden rounded-full bg-bg-card">
            <motion.div
              className="h-full rounded-full bg-accent-2"
              animate={{ width: `${total > 0 ? (submitted / total) * 100 : 0}%` }}
              transition={{ type: "spring", stiffness: 100 }}
            />
          </div>
          <span className="font-display text-[28px] text-text-primary">
            {submitted} / {total} submitted
          </span>
        </div>
      </div>
    </div>
  );
}

function VotingView({
  payload,
  players,
  timerEndTime,
}: {
  payload: Record<string, unknown>;
  players: PlayerData[];
  timerEndTime: number | null;
}) {
  const question = (payload.question as string) ?? "";
  const answers = (payload.answers as Array<{ text: string; index: number }>) ?? [];
  const votedIds = (payload.votedPlayerIds as string[]) ?? [];
  const voted = votedIds.length;
  const total = players.length;

  return (
    <div className="flex min-h-screen flex-col p-12">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-[36px] text-accent-1">WHICH IS REAL?</h2>
        {timerEndTime && <Timer endTime={timerEndTime} />}
      </div>

      <p className="mb-8 text-[32px] text-text-muted">{question}</p>

      {/* Answer grid */}
      <div className="mb-8 grid grid-cols-2 gap-4">
        {answers.map((answer) => (
          <div key={answer.index} className="rounded-2xl border-2 border-bg-card bg-bg-card/80 p-6">
            <div className="mb-2 font-display text-[22px] text-accent-4">
              {String.fromCharCode(65 + answer.index)}
            </div>
            <p className="text-[28px] text-text-primary">{answer.text}</p>
          </div>
        ))}
      </div>

      {/* Voting status */}
      <div className="mt-auto flex flex-col items-center gap-4">
        <p className="font-display text-[32px] text-accent-2">
          {voted} / {total} voted
        </p>
        <div className="flex gap-3">
          {players.map((player) => {
            const hasVoted = votedIds.includes(player.sessionId);
            return (
              <div
                key={player.sessionId}
                className={`h-[48px] w-[48px] rounded-full transition-all duration-300 ${hasVoted ? "" : "opacity-30"}`}
                style={{
                  backgroundColor: player.avatarColor,
                  boxShadow: hasVoted ? `0 0 12px ${player.avatarColor}60` : "none",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ResultsView({
  payload,
}: {
  payload: Record<string, unknown>;
  players: PlayerData[];
}) {
  const answers =
    (payload.answers as Array<{
      text: string;
      index: number;
      isReal: boolean;
      authorName?: string;
      voterNames?: string[];
    }>) ?? [];
  const [revealIndex, setRevealIndex] = useState(-1);

  useEffect(() => {
    if (revealIndex < answers.length - 1) {
      const timer = setTimeout(() => {
        setRevealIndex((prev) => prev + 1);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [revealIndex, answers.length]);

  // Start revealing on mount
  useEffect(() => {
    const timer = setTimeout(() => setRevealIndex(0), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-12">
      <h2 className="font-display text-[48px] text-accent-1">THE ANSWERS</h2>

      <div className="flex w-full max-w-4xl flex-col gap-4">
        <AnimatePresence>
          {answers.map((answer, i) => {
            const revealed = i <= revealIndex;
            return (
              <motion.div
                key={answer.index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{
                  opacity: revealed ? 1 : 0.3,
                  scale: revealed ? 1 : 0.95,
                }}
                transition={{ type: "spring", stiffness: 150, damping: 20 }}
                className={`rounded-2xl border-2 p-6 ${
                  revealed && answer.isReal
                    ? "border-accent-2 bg-accent-2/10"
                    : revealed
                      ? "border-bg-card bg-bg-card/80"
                      : "border-bg-card/50 bg-bg-card/30"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-3">
                      <span className="font-display text-[24px] text-accent-4">
                        {String.fromCharCode(65 + answer.index)}
                      </span>
                      {revealed && answer.isReal && (
                        <span className="rounded-full bg-accent-2/20 px-4 py-1 font-display text-[18px] text-accent-2">
                          REAL ANSWER
                        </span>
                      )}
                      {revealed && !answer.isReal && answer.authorName && (
                        <span className="text-[20px] text-text-muted">
                          Written by {answer.authorName}
                        </span>
                      )}
                    </div>
                    <p className="text-[28px] text-text-primary">{answer.text}</p>
                  </div>
                </div>

                {/* Who voted for this */}
                {revealed && answer.voterNames && answer.voterNames.length > 0 && (
                  <div className="mt-3 text-[20px] text-text-muted">
                    {answer.isReal ? "Correct" : "Fooled"}: {answer.voterNames.join(", ")}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function BluffFinalScoresView({ players }: { players: PlayerData[] }) {
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
