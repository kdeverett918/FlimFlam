"use client";

import { Scoreboard } from "@/components/game/Scoreboard";
import { Timer } from "@/components/game/Timer";
import type { PlayerData, ScoreEntry } from "@partyline/shared";
import { AnimatedBackground, GlassPanel } from "@partyline/ui";
import type { Room } from "colyseus.js";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, CheckCircle, Gavel } from "lucide-react";
import { useEffect, useState } from "react";

interface BrainBattleHostProps {
  phase: string;
  round: number;
  totalRounds: number;
  players: PlayerData[];
  payload: Record<string, unknown>;
  timerEndTime: number | null;
  room: Room | null;
}

interface BoardCategory {
  name: string;
  clues: Array<{
    id: string;
    value: number;
    question: string;
    answer: string;
  }>;
}

export function BrainBattleHost({
  phase,
  round: _round,
  totalRounds: _totalRounds,
  players,
  payload,
  timerEndTime,
}: BrainBattleHostProps) {
  switch (phase) {
    case "topic-submit":
      return <TopicSubmitView payload={payload} players={players} timerEndTime={timerEndTime} />;
    case "board-generating":
      return <BoardGeneratingView payload={payload} />;
    case "board-reveal":
      return <BoardRevealView payload={payload} />;
    case "clue-select":
      return <ClueSelectView payload={payload} players={players} />;
    case "buzzing":
      return <BuzzingView payload={payload} timerEndTime={timerEndTime} />;
    case "answering":
      return <AnsweringView payload={payload} players={players} timerEndTime={timerEndTime} />;
    case "appeal-window":
      return <AppealWindowView payload={payload} players={players} timerEndTime={timerEndTime} />;
    case "appeal-judging":
      return <AppealJudgingView />;
    case "appeal-result":
      return <AppealResultView payload={payload} players={players} />;
    case "clue-result":
      return <ClueResultView payload={payload} players={players} />;
    case "final-scores":
      return <FinalScoresView players={players} />;
    default:
      return (
        <div className="flex min-h-screen items-center justify-center">
          <AnimatedBackground variant="subtle" />
          <p className="font-display text-[36px] text-text-muted">Brain Battle - {phase}</p>
        </div>
      );
  }
}

/* ------------------------------------------------------------------ */
/*  Topic Submit                                                       */
/* ------------------------------------------------------------------ */

function TopicSubmitView({
  payload,
  players,
  timerEndTime,
}: {
  payload: Record<string, unknown>;
  players: PlayerData[];
  timerEndTime: number | null;
}) {
  const submittedIds = (payload.submittedPlayerIds as string[]) ?? [];
  const topics = (payload.topics as string[]) ?? [];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-10 p-12">
      <AnimatedBackground variant="subtle" />

      <div className="relative z-10 mb-4 flex w-full max-w-5xl items-center justify-between">
        <h1 className="font-display text-[64px] font-bold text-accent-7">SUBMIT YOUR TOPICS</h1>
        {timerEndTime && <Timer endTime={timerEndTime} />}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 max-w-4xl text-center font-body text-[32px] text-text-muted"
      >
        What should the board categories be about?
      </motion.p>

      {/* Topic pills */}
      <div className="relative z-10 flex flex-wrap justify-center gap-3">
        <AnimatePresence>
          {topics.map((topic, i) => {
            const key = `topic-${topic}-${i}`;
            return (
              <motion.span
                key={key}
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="rounded-full bg-accent-7/20 px-6 py-2 font-display text-[22px] text-accent-7"
              >
                {topic}
              </motion.span>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Player avatars */}
      <div className="relative z-10 flex flex-wrap justify-center gap-4">
        {players.map((player) => {
          const hasSubmitted = submittedIds.includes(player.sessionId);
          return (
            <motion.div
              key={player.sessionId}
              animate={{
                opacity: hasSubmitted ? 1 : 0.3,
                scale: hasSubmitted ? 1.06 : 0.9,
              }}
              className="flex flex-col items-center gap-2"
            >
              <div
                className="flex h-[72px] w-[72px] items-center justify-center rounded-full font-body text-[30px] font-bold text-bg-deep"
                style={{
                  backgroundColor: player.avatarColor,
                  boxShadow: hasSubmitted ? `0 0 20px ${player.avatarColor}66` : "none",
                }}
              >
                {hasSubmitted ? "\u2713" : player.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-body text-[18px] text-text-muted">{player.name}</span>
            </motion.div>
          );
        })}
      </div>

      <motion.p
        initial={{ opacity: 0.4 }}
        animate={{ opacity: 0.8 }}
        transition={{
          duration: 1.3,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
        }}
        className="relative z-10 font-body text-[24px] text-text-muted"
      >
        Grab your phone and submit a topic...
      </motion.p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Board Generating                                                   */
/* ------------------------------------------------------------------ */

function BoardGeneratingView({
  payload,
}: {
  payload: Record<string, unknown>;
}) {
  const topics = (payload.topics as string[]) ?? [];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 p-12">
      <AnimatedBackground />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
        }}
        className="relative z-10"
      >
        <Brain className="h-20 w-20 text-accent-7" />
      </motion.div>
      <h2
        className="relative z-10 font-display text-[54px] font-bold text-text-primary"
        style={{ textShadow: "0 0 30px oklch(0.65 0.22 260 / 0.4)" }}
      >
        BUILDING YOUR BOARD...
      </h2>
      <p className="relative z-10 font-body text-[28px] text-text-muted">
        The AI is crafting categories from your topics
      </p>

      {/* Floating topic pills */}
      <div className="relative z-10 flex flex-wrap justify-center gap-3">
        {topics.map((topic, i) => {
          const key = `gen-topic-${topic}-${i}`;
          return (
            <motion.span
              key={key}
              animate={{
                y: [0, -8, 0],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                delay: i * 0.3,
              }}
              className="rounded-full bg-accent-7/20 px-5 py-2 font-display text-[20px] text-accent-7"
            >
              {topic}
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Board Grid (shared helper)                                         */
/* ------------------------------------------------------------------ */

function BoardGrid({
  board,
  answeredClues,
  activeClueId,
  selectorName,
  staggerReveal,
}: {
  board: BoardCategory[];
  answeredClues: string[];
  activeClueId?: string;
  selectorName?: string;
  staggerReveal?: boolean;
}) {
  const values = [200, 400, 600, 800, 1000];

  return (
    <div className="relative z-10 w-full max-w-6xl">
      {selectorName && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-center"
        >
          <GlassPanel
            glow
            glowColor="oklch(0.65 0.22 260 / 0.2)"
            rounded="2xl"
            className="inline-block px-8 py-3"
          >
            <span className="font-display text-[36px] font-bold text-accent-7">
              IT&apos;S {selectorName.toUpperCase()}&apos;S PICK
            </span>
          </GlassPanel>
        </motion.div>
      )}

      <div className="grid grid-cols-5 gap-2">
        {/* Category headers */}
        {board.map((category, catIdx) => (
          <motion.div
            key={`cat-${category.name}`}
            initial={staggerReveal ? { opacity: 0, y: -20 } : undefined}
            animate={{ opacity: 1, y: 0 }}
            transition={staggerReveal ? { delay: catIdx * 0.3, duration: 0.4 } : undefined}
          >
            <GlassPanel rounded="lg" className="bg-bg-elevated p-3 text-center">
              <span className="font-display text-[18px] font-bold uppercase leading-tight text-accent-7 line-clamp-2">
                {category.name}
              </span>
            </GlassPanel>
          </motion.div>
        ))}

        {/* Value cells */}
        {values.map((value, rowIdx) =>
          board.map((category, catIdx) => {
            const clue = category.clues[rowIdx];
            if (!clue) return <div key={`empty-${category.name}-${value}`} />;

            const isAnswered = answeredClues.includes(clue.id);
            const isActive = clue.id === activeClueId;

            return (
              <motion.div
                key={clue.id}
                initial={staggerReveal ? { opacity: 0, y: 20 } : undefined}
                animate={{
                  opacity: isAnswered ? 0.3 : 1,
                  y: 0,
                }}
                transition={
                  staggerReveal
                    ? {
                        delay: board.length * 0.3 + rowIdx * 0.15 + catIdx * 0.05,
                        duration: 0.3,
                      }
                    : { duration: 0.2 }
                }
              >
                <GlassPanel
                  glow={isActive}
                  glowColor="oklch(0.65 0.22 260 / 0.4)"
                  rounded="lg"
                  className={`flex h-[80px] items-center justify-center p-2 transition-all ${
                    isAnswered ? "opacity-30" : isActive ? "ring-2 ring-accent-7" : ""
                  }`}
                  style={
                    !isAnswered && !isActive
                      ? {
                          boxShadow: "0 0 12px oklch(0.65 0.22 260 / 0.15)",
                        }
                      : undefined
                  }
                >
                  {isAnswered ? (
                    <CheckCircle className="h-6 w-6 text-text-dim" />
                  ) : (
                    <span
                      className={`font-mono text-[28px] font-bold ${
                        isActive ? "text-accent-7 animate-countdown-pulse" : "text-accent-7"
                      }`}
                    >
                      ${value}
                    </span>
                  )}
                </GlassPanel>
              </motion.div>
            );
          }),
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Board Reveal                                                       */
/* ------------------------------------------------------------------ */

function BoardRevealView({
  payload,
}: {
  payload: Record<string, unknown>;
}) {
  const board = (payload.board as BoardCategory[]) ?? [];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 p-12">
      <AnimatedBackground variant="subtle" />

      <motion.h1
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative z-10 font-display text-[56px] font-bold text-accent-7"
        style={{ textShadow: "0 0 30px oklch(0.65 0.22 260 / 0.4)" }}
      >
        THE BOARD
      </motion.h1>

      <BoardGrid board={board} answeredClues={[]} staggerReveal />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Clue Select                                                        */
/* ------------------------------------------------------------------ */

function ClueSelectView({
  payload,
  players,
}: {
  payload: Record<string, unknown>;
  players: PlayerData[];
}) {
  const board = (payload.board as BoardCategory[]) ?? [];
  const answeredClues = (payload.answeredClues as string[]) ?? [];
  const selectorId = payload.selectorId as string | undefined;
  const selector = players.find((p) => p.sessionId === selectorId);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 p-12">
      <AnimatedBackground variant="subtle" />
      <BoardGrid board={board} answeredClues={answeredClues} selectorName={selector?.name} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Buzzing                                                            */
/* ------------------------------------------------------------------ */

function BuzzingView({
  payload,
  timerEndTime,
}: {
  payload: Record<string, unknown>;
  timerEndTime: number | null;
}) {
  const clueText = (payload.clueText as string) ?? "";
  const categoryName = (payload.categoryName as string) ?? "";
  const clueValue = (payload.clueValue as number) ?? 0;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 p-12">
      <AnimatedBackground />

      {/* Value badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="absolute right-12 top-12 z-20"
      >
        <GlassPanel glow glowColor="oklch(0.65 0.22 260 / 0.3)" rounded="xl" className="px-6 py-3">
          <span className="font-mono text-[36px] font-bold text-accent-7">${clueValue}</span>
        </GlassPanel>
      </motion.div>

      {/* Category name */}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="relative z-10 rounded-full bg-accent-7/20 px-6 py-2 font-display text-[24px] text-accent-7"
      >
        {categoryName.toUpperCase()}
      </motion.span>

      {/* Clue text */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
        className="relative z-10"
      >
        <GlassPanel
          glow
          glowColor="oklch(0.65 0.22 260 / 0.2)"
          rounded="2xl"
          className="max-w-5xl p-10 text-center"
        >
          <h2 className="font-display text-[44px] font-bold leading-tight text-text-primary">
            {clueText}
          </h2>
        </GlassPanel>
      </motion.div>

      {/* WHO KNOWS banner */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{
          duration: 1.2,
          repeat: Number.POSITIVE_INFINITY,
          delay: 0.5,
        }}
        className="relative z-10 font-display text-[48px] font-bold text-accent-7"
        style={{ textShadow: "0 0 24px oklch(0.65 0.22 260 / 0.5)" }}
      >
        WHO KNOWS?!
      </motion.h3>

      {/* Countdown bar */}
      {timerEndTime && (
        <div className="absolute bottom-0 left-0 z-20 w-full">
          <CountdownBar endTime={timerEndTime} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Countdown Bar                                                      */
/* ------------------------------------------------------------------ */

function CountdownBar({ endTime }: { endTime: number }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const totalDuration = endTime - Date.now();
    if (totalDuration <= 0) {
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = endTime - Date.now();
      const pct = Math.max(0, (remaining / totalDuration) * 100);
      setProgress(pct);
      if (remaining <= 0) clearInterval(interval);
    }, 50);

    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <div className="h-3 w-full bg-bg-elevated">
      <motion.div
        className="h-full bg-accent-7"
        style={{ width: `${progress}%` }}
        transition={{ duration: 0.05 }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Answering                                                          */
/* ------------------------------------------------------------------ */

function AnsweringView({
  payload,
  players,
  timerEndTime,
}: {
  payload: Record<string, unknown>;
  players: PlayerData[];
  timerEndTime: number | null;
}) {
  const clueText = (payload.clueText as string) ?? "";
  const buzzWinnerId = payload.buzzWinnerId as string | undefined;
  const buzzWinner = players.find((p) => p.sessionId === buzzWinnerId);
  const submittedAnswer = payload.submittedAnswer as string | undefined;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 p-12">
      <AnimatedBackground variant="subtle" />

      {/* Clue text dimmed */}
      <GlassPanel rounded="2xl" className="relative z-10 max-w-4xl p-8 opacity-50">
        <p className="text-center font-display text-[32px] text-text-muted">{clueText}</p>
      </GlassPanel>

      {/* Buzz winner spotlight */}
      {buzzWinner && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="relative z-10 flex flex-col items-center gap-4"
        >
          <div
            className="flex h-[120px] w-[120px] items-center justify-center rounded-full font-body text-[56px] font-bold text-bg-deep"
            style={{
              backgroundColor: buzzWinner.avatarColor,
              boxShadow: `0 0 40px ${buzzWinner.avatarColor}80, 0 0 80px oklch(0.75 0.18 85 / 0.3)`,
            }}
          >
            {buzzWinner.name.charAt(0).toUpperCase()}
          </div>
          <span className="font-display text-[40px] font-bold text-text-primary">
            {buzzWinner.name}
          </span>
        </motion.div>
      )}

      {/* Status */}
      {!submittedAnswer ? (
        <motion.p
          initial={{ opacity: 0.4 }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 1.5,
            repeat: Number.POSITIVE_INFINITY,
          }}
          className="relative z-10 font-display text-[36px] font-bold text-accent-7"
        >
          ANSWERING...
        </motion.p>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <GlassPanel
            glow
            glowColor="oklch(0.65 0.22 260 / 0.2)"
            rounded="2xl"
            className="max-w-4xl p-8 text-center"
          >
            <p className="font-display text-[40px] font-bold text-text-primary">
              &ldquo;{submittedAnswer}&rdquo;
            </p>
          </GlassPanel>
        </motion.div>
      )}

      {/* Timer */}
      {timerEndTime && (
        <div className="absolute bottom-0 left-0 z-20 w-full">
          <CountdownBar endTime={timerEndTime} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Appeal Window                                                      */
/* ------------------------------------------------------------------ */

function AppealWindowView({
  payload,
  players,
  timerEndTime,
}: {
  payload: Record<string, unknown>;
  players: PlayerData[];
  timerEndTime: number | null;
}) {
  const wrongAnswer = (payload.wrongAnswer as string) ?? "";
  const appealingId = payload.appealingPlayerId as string | undefined;
  const appealer = players.find((p) => p.sessionId === appealingId);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 p-12">
      <AnimatedBackground variant="subtle" />

      {/* Wrong answer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative z-10 flex items-center gap-4"
      >
        <span className="text-[48px]">{"\u274C"}</span>
        <GlassPanel rounded="2xl" className="p-6">
          <p className="font-display text-[32px] text-text-muted line-through">{wrongAnswer}</p>
        </GlassPanel>
      </motion.div>

      {/* Appealing player */}
      {appealer ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="relative z-10 flex flex-col items-center gap-4"
        >
          <div
            className="flex h-[96px] w-[96px] items-center justify-center rounded-full font-body text-[44px] font-bold text-bg-deep"
            style={{
              backgroundColor: appealer.avatarColor,
              boxShadow: `0 0 30px ${appealer.avatarColor}60`,
            }}
          >
            {appealer.name.charAt(0).toUpperCase()}
          </div>
          <span className="font-display text-[32px] font-bold text-text-primary">
            {appealer.name}
          </span>
        </motion.div>
      ) : null}

      {/* Gavel + APPEALING text */}
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{
          duration: 1.2,
          repeat: Number.POSITIVE_INFINITY,
        }}
        className="relative z-10"
      >
        <Gavel className="h-16 w-16 text-accent-7" />
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{
          duration: 1.5,
          repeat: Number.POSITIVE_INFINITY,
        }}
        className="relative z-10 font-display text-[40px] font-bold text-accent-7"
      >
        APPEALING...
      </motion.p>

      {timerEndTime && (
        <div className="absolute bottom-0 left-0 z-20 w-full">
          <CountdownBar endTime={timerEndTime} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Appeal Judging                                                     */
/* ------------------------------------------------------------------ */

function AppealJudgingView() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 p-12">
      <AnimatedBackground />

      <motion.div
        animate={{ scale: [1, 1.3, 1] }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        className="relative z-10"
      >
        <Gavel className="h-24 w-24 text-accent-7" />
      </motion.div>

      <h2
        className="relative z-10 font-display text-[52px] font-bold text-text-primary"
        style={{ textShadow: "0 0 30px oklch(0.65 0.22 260 / 0.4)" }}
      >
        THE JUDGE IS DELIBERATING...
      </h2>

      <motion.div
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
        }}
        className="relative z-10 flex gap-3"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -8, 0] }}
            transition={{
              duration: 0.8,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * 0.2,
            }}
            className="h-4 w-4 rounded-full bg-accent-7"
          />
        ))}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Appeal Result                                                      */
/* ------------------------------------------------------------------ */

function AppealResultView({
  payload,
  players: _players,
}: {
  payload: Record<string, unknown>;
  players: PlayerData[];
}) {
  const granted = (payload.appealGranted as boolean) ?? false;
  const reasoning = (payload.appealReasoning as string) ?? "";
  const [displayedText, setDisplayedText] = useState("");

  // Typewriter effect for reasoning
  useEffect(() => {
    setDisplayedText("");
    if (!reasoning) return;

    let index = 0;
    const interval = setInterval(() => {
      index++;
      setDisplayedText(reasoning.slice(0, index));
      if (index >= reasoning.length) clearInterval(interval);
    }, 30);

    return () => clearInterval(interval);
  }, [reasoning]);

  const glowColor = granted ? "oklch(0.65 0.2 145 / 0.4)" : "oklch(0.55 0.22 25 / 0.4)";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 p-12">
      <AnimatedBackground variant="subtle" />

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="relative z-10"
      >
        <Gavel className={`h-20 w-20 ${granted ? "text-success" : "text-destructive"}`} />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`relative z-10 font-display text-[56px] font-bold ${
          granted ? "text-success" : "text-destructive"
        }`}
        style={{ textShadow: `0 0 30px ${glowColor}` }}
      >
        {granted ? "APPEAL GRANTED!" : "APPEAL DENIED!"}
      </motion.h2>

      {/* Reasoning with typewriter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="relative z-10"
      >
        <GlassPanel glow glowColor={glowColor} rounded="2xl" className="max-w-4xl p-8">
          <p className="font-body text-[28px] leading-relaxed text-text-primary">
            {displayedText}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{
                duration: 0.6,
                repeat: Number.POSITIVE_INFINITY,
              }}
              className="ml-1 inline-block h-[28px] w-[3px] bg-text-primary align-middle"
            />
          </p>
        </GlassPanel>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Clue Result                                                        */
/* ------------------------------------------------------------------ */

function ClueResultView({
  payload,
  players,
}: {
  payload: Record<string, unknown>;
  players: PlayerData[];
}) {
  const correctAnswer = (payload.correctAnswer as string) ?? "";
  const _wasCorrect = (payload.wasCorrect as boolean) ?? false;
  const scoreChanges =
    (payload.scoreChanges as Array<{
      sessionId: string;
      delta: number;
    }>) ?? [];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 p-12">
      <AnimatedBackground variant="subtle" />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative z-10"
      >
        <GlassPanel
          glow
          glowColor="oklch(0.65 0.22 260 / 0.2)"
          rounded="2xl"
          className="max-w-4xl p-10 text-center"
        >
          <p className="mb-4 font-body text-[24px] text-text-muted">The correct response:</p>
          <h2 className="font-display text-[48px] font-bold text-accent-7">{correctAnswer}</h2>
        </GlassPanel>
      </motion.div>

      {/* Score changes */}
      {scoreChanges.length > 0 && (
        <div className="relative z-10 flex flex-wrap justify-center gap-6">
          {scoreChanges.map((change, i) => {
            const player = players.find((p) => p.sessionId === change.sessionId);
            if (!player) return null;
            const isPositive = change.delta > 0;
            return (
              <motion.div
                key={change.sessionId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.15 }}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className="flex h-[64px] w-[64px] items-center justify-center rounded-full font-body text-[28px] font-bold text-bg-deep"
                  style={{
                    backgroundColor: player.avatarColor,
                    boxShadow: `0 0 16px ${player.avatarColor}50`,
                  }}
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-body text-[20px] text-text-muted">{player.name}</span>
                <span
                  className={`font-mono text-[28px] font-bold ${
                    isPositive ? "text-success" : "text-destructive"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {change.delta}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Final Scores                                                       */
/* ------------------------------------------------------------------ */

function FinalScoresView({ players }: { players: PlayerData[] }) {
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
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-10 p-12">
      <AnimatedBackground variant="subtle" />
      <h1 className="relative z-10 font-display text-[64px] font-bold text-accent-7">
        FINAL SCORES
      </h1>
      <div className="relative z-10 w-full max-w-4xl">
        <Scoreboard scores={scores} />
      </div>
    </div>
  );
}
