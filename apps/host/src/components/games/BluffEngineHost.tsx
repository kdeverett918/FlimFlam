"use client";

import { FinalScoresLayout, buildScores } from "@/components/game/FinalScoresLayout";
import { Timer } from "@/components/game/Timer";
import type { PlayerData } from "@flimflam/shared";
import { AnimatedBackground, GlassPanel } from "@flimflam/ui";
import type { Room } from "colyseus.js";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
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
  room,
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
      return (
        <FinalScoresLayout
          scores={buildScores(players)}
          accentColorClass="text-accent-3"
          room={room}
        />
      );
    default:
      return (
        <div className="flex min-h-screen items-center justify-center">
          <AnimatedBackground variant="subtle" />
          <p className="font-display text-[36px] text-text-muted">Bluff Engine - {phase}</p>
        </div>
      );
  }
}

function GeneratingPromptView() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8">
      <AnimatedBackground />
      <motion.div
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
        className="relative z-10"
      >
        <Search className="h-24 w-24 text-accent-3" />
      </motion.div>
      <h2
        className="relative z-10 font-display text-[56px] font-bold text-text-primary"
        style={{ textShadow: "0 0 30px oklch(0.78 0.18 85 / 0.4)" }}
      >
        COOKING UP A QUESTION...
      </h2>
      <p className="relative z-10 font-body text-[28px] text-text-muted">
        The AI is finding an obscure trivia question
      </p>
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
    <div className="relative flex min-h-screen flex-col p-12">
      <AnimatedBackground variant="subtle" />
      <div className="relative z-10 mb-8 flex items-center justify-between">
        <div className="font-display text-[28px] font-semibold text-text-muted">
          ROUND {round} / {totalRounds}
        </div>
        {timerEndTime && <Timer endTime={timerEndTime} />}
      </div>

      {category && (
        <div className="relative z-10 mb-4">
          <span className="rounded-full bg-accent-3/20 px-6 py-2 font-display text-[22px] text-accent-3">
            {category.toUpperCase()}
          </span>
        </div>
      )}

      <GlassPanel
        glow
        glowColor="oklch(0.78 0.18 85 / 0.15)"
        rounded="2xl"
        className="relative z-10 mb-12 p-8"
      >
        <h2 className="font-display text-[52px] font-bold leading-tight text-text-primary">
          {question}
        </h2>
      </GlassPanel>

      <div className="relative z-10 mt-auto flex flex-col items-center gap-6">
        <h3 className="font-display text-[36px] font-bold text-accent-3">WRITE YOUR BLUFF!</h3>
        <p className="font-body text-[28px] text-text-muted">
          Make it sound real enough to fool everyone
        </p>
        <div className="flex items-center gap-4">
          <GlassPanel rounded="2xl" className="h-4 w-[300px] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-accent-3"
              animate={{ width: `${total > 0 ? (submitted / total) * 100 : 0}%` }}
              transition={{ type: "spring", stiffness: 100 }}
            />
          </GlassPanel>
          <span className="font-mono text-[28px] font-bold text-text-primary">
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

  const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

  return (
    <div className="relative flex min-h-screen flex-col p-12">
      <AnimatedBackground variant="subtle" />
      <div className="relative z-10 mb-6 flex items-center justify-between">
        <h2 className="font-display text-[36px] font-bold text-accent-3">WHICH IS REAL?</h2>
        {timerEndTime && <Timer endTime={timerEndTime} />}
      </div>

      <p className="relative z-10 mb-8 font-body text-[32px] text-text-muted">{question}</p>

      <div className="relative z-10 mb-8 grid grid-cols-2 gap-4">
        {answers.map((answer) => (
          <GlassPanel key={answer.index} rounded="2xl" className="p-6">
            <div className="mb-2 font-display text-[22px] font-bold text-accent-3">
              {LETTERS[answer.index] ?? String.fromCharCode(65 + answer.index)}
            </div>
            <p className="font-body text-[28px] text-text-primary">{answer.text}</p>
          </GlassPanel>
        ))}
      </div>

      <div className="relative z-10 mt-auto flex flex-col items-center gap-4">
        <p className="font-mono text-[32px] font-bold text-accent-3">
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

  const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

  useEffect(() => {
    if (revealIndex < answers.length - 1) {
      const timer = setTimeout(() => {
        setRevealIndex((prev) => prev + 1);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [revealIndex, answers.length]);

  useEffect(() => {
    const timer = setTimeout(() => setRevealIndex(0), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 p-12">
      <AnimatedBackground variant="subtle" />
      <h2 className="relative z-10 font-display text-[48px] font-bold text-accent-3">
        THE ANSWERS
      </h2>

      <div className="relative z-10 flex w-full max-w-4xl flex-col gap-4">
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
              >
                <GlassPanel
                  glow={revealed && answer.isReal}
                  glowColor="oklch(0.78 0.18 85 / 0.3)"
                  rounded="2xl"
                  className={`p-6 ${revealed && answer.isReal ? "border-accent-3" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="mb-2 flex items-center gap-3">
                        <span className="font-display text-[24px] font-bold text-accent-3">
                          {LETTERS[answer.index] ?? String.fromCharCode(65 + answer.index)}
                        </span>
                        {revealed && answer.isReal && (
                          <span className="rounded-full bg-accent-3/20 px-4 py-1 font-display text-[18px] text-accent-3">
                            REAL ANSWER
                          </span>
                        )}
                        {revealed && !answer.isReal && answer.authorName && (
                          <span className="font-body text-[20px] text-text-muted">
                            Written by {answer.authorName}
                          </span>
                        )}
                      </div>
                      <p className="font-body text-[28px] text-text-primary">{answer.text}</p>
                    </div>
                  </div>

                  {revealed && answer.voterNames && answer.voterNames.length > 0 && (
                    <div className="mt-3 font-body text-[20px] text-text-muted">
                      {answer.isReal ? "Correct" : "Fooled"}: {answer.voterNames.join(", ")}
                    </div>
                  )}
                </GlassPanel>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
