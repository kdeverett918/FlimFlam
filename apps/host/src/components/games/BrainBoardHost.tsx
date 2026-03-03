"use client";

import type { PlayerData } from "@flimflam/shared";
import { AVATAR_COLORS } from "@flimflam/shared";
import { ConfettiBurst, GlassPanel } from "@flimflam/ui";
import type { Room } from "colyseus.js";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { FinalScoresLayout, buildScores } from "../game/FinalScoresLayout";
import { Timer } from "../game/Timer";

// ─── Props ─────────────────────────────────────────────────────────────────

interface BrainBoardHostProps {
  phase: string;
  round: number;
  totalRounds: number;
  players: PlayerData[];
  payload: Record<string, unknown>;
  timerEndTime: number | null;
  room: Room | null;
}

// ─── Game data shapes (from plugin broadcasts) ─────────────────────────────

interface BoardCategory {
  name: string;
  clues: { value: number }[];
}

interface Standing {
  sessionId: string;
  score: number;
}

interface ClueResultEntry {
  sessionId: string;
  answer: string;
  correct: boolean;
  delta: number;
  judgedBy?: "local" | "ai" | "fallback";
  judgeExplanation?: string;
}

interface ClueResultData {
  correctAnswer: string;
  question: string;
  value: number;
  isPowerPlay: boolean;
  results: ClueResultEntry[];
  anyCorrect?: boolean;
  correctCount?: number;
  correct?: boolean;
}

interface FinalRevealResult {
  sessionId: string;
  answer: string;
  correct: boolean;
  wager: number;
  delta: number;
  judgedBy?: "local" | "ai" | "fallback";
  judgeExplanation?: string;
}

interface FinalRevealData {
  correctAnswer: string;
  question: string;
  results: FinalRevealResult[];
}

interface BrainBoardGameState {
  phase: string;
  board: BoardCategory[];
  revealedClues: string[];
  selectorSessionId: string | null;
  currentClueValue: number | null;
  currentClueQuestion: string | null;
  currentCategoryName: string;
  isPowerPlay: boolean;
  standings: Standing[];
  allInCategory: string | null;
  allInQuestion: string | null;
  answeredCount: number;
  totalPlayerCount: number;
  currentRound: number;
  doubleDownValues: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPlayerName(players: PlayerData[], sessionId: string | null): string {
  if (!sessionId) return "???";
  return players.find((p) => p.sessionId === sessionId)?.name ?? "???";
}

function getPlayerColor(players: PlayerData[], sessionId: string | null): string {
  if (!sessionId) return AVATAR_COLORS[0] ?? "#FF3366";
  const idx = players.findIndex((p) => p.sessionId === sessionId);
  return AVATAR_COLORS[idx >= 0 ? idx % AVATAR_COLORS.length : 0] ?? "#FF3366";
}

function PlayerAvatar({ name, color, size = 64 }: { name: string; color: string; size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold text-bg-deep"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: size * 0.45,
        boxShadow: `0 0 12px ${color}40`,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BrainBoardHost({ phase, players, timerEndTime, room }: BrainBoardHostProps) {
  const [gameState, setGameState] = useState<BrainBoardGameState | null>(null);
  const [clueResult, setClueResult] = useState<ClueResultData | null>(null);
  const [finalReveal, setFinalReveal] = useState<FinalRevealData | null>(null);
  const [powerPlayWager, setPowerPlayWager] = useState<number | null>(null);
  const [revealIndex, setRevealIndex] = useState(0);
  const prevPhaseRef = useRef(phase);

  // Reset reveal index when entering all-in-reveal
  useEffect(() => {
    if (phase === "all-in-reveal" && prevPhaseRef.current !== "all-in-reveal") {
      setRevealIndex(0);
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  // Stagger all-in reveals
  useEffect(() => {
    if (phase !== "all-in-reveal" || !finalReveal) return;
    if (revealIndex >= finalReveal.results.length) return;
    const timer = setTimeout(() => {
      setRevealIndex((i) => i + 1);
    }, 3000);
    return () => clearTimeout(timer);
  }, [phase, finalReveal, revealIndex]);

  // Listen for game-data messages
  const handleMessage = useCallback((data: Record<string, unknown>) => {
    const type = data.type as string | undefined;

    if (type === "game-state") {
      setGameState(data as unknown as BrainBoardGameState);
    } else if (type === "clue-result") {
      const results = Array.isArray(data.results) ? (data.results as ClueResultEntry[]) : [];
      setClueResult({
        ...(data as unknown as ClueResultData),
        results,
      });
    } else if (type === "all-in-reveal") {
      setFinalReveal(data as unknown as FinalRevealData);
    } else if (type === "power-play-wager-set") {
      setPowerPlayWager((data.wager as number) ?? null);
    }
  }, []);

  useEffect(() => {
    if (!room) return;
    room.onMessage("game-data", handleMessage);
  }, [room, handleMessage]);

  if (!gameState) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-display text-[48px] text-accent-brainboard animate-glow-pulse">
          Loading Brain Board...
        </p>
      </div>
    );
  }

  // ── Category Reveal ─────────────────────────────────────────────────────
  if (phase === "category-reveal") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
        <motion.h1
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="font-display text-[clamp(48px,6vw,72px)] font-bold text-accent-brainboard"
        >
          {gameState.currentRound === 2 ? "DOUBLE DOWN!" : "BRAIN BOARD!"}
        </motion.h1>
        <div className="flex flex-wrap justify-center gap-4">
          {gameState.board.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.4, type: "spring", stiffness: 120 }}
            >
              <GlassPanel
                glow
                glowColor="oklch(0.68 0.22 265 / 0.3)"
                className="flex items-center justify-center px-8 py-6"
              >
                <span className="font-display text-[clamp(24px,3vw,36px)] font-bold text-accent-brainboard text-center uppercase">
                  {cat.name}
                </span>
              </GlassPanel>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // ── Clue Select (Game Board) ────────────────────────────────────────────
  if (phase === "clue-select") {
    const revealedSet = new Set(gameState.revealedClues);
    const selectorName = getPlayerName(players, gameState.selectorSessionId);
    const selectorColor = getPlayerColor(players, gameState.selectorSessionId);
    const values = gameState.doubleDownValues
      ? [400, 800, 1200, 1600, 2000]
      : [200, 400, 600, 800, 1000];

    return (
      <div className="flex min-h-screen flex-col items-center p-4">
        {/* Selector bar */}
        <div className="mb-4 flex items-center gap-4">
          <PlayerAvatar name={selectorName} color={selectorColor} size={48} />
          <span className="font-display text-[clamp(24px,3vw,36px)] text-accent-brainboard">
            {selectorName}&apos;s pick
          </span>
        </div>

        {/* Board grid */}
        <div className="w-full overflow-x-auto pb-2">
          <div className="mx-auto grid min-w-[740px] max-w-[1400px] grid-cols-6 gap-2">
            {/* Category headers */}
            {gameState.board.map((cat) => (
              <div
                key={cat.name}
                className="flex min-h-[64px] sm:min-h-[80px] items-center justify-center rounded-lg bg-accent-brainboard/20 border border-accent-brainboard/30 p-1.5 sm:p-2"
              >
                <span className="font-display text-[clamp(10px,1.3vw,20px)] font-bold text-accent-brainboard text-center uppercase leading-tight break-words">
                  {cat.name}
                </span>
              </div>
            ))}

            {/* Value cells - 5 rows x 6 columns */}
            {values.map((value, rowIdx) =>
              gameState.board.map((_, colIdx) => {
                const key = `${colIdx},${rowIdx}`;
                const isRevealed = revealedSet.has(key);

                return (
                  <motion.div
                    key={key}
                    className={`flex min-h-[64px] sm:min-h-[80px] items-center justify-center rounded-lg border transition-all ${
                      isRevealed
                        ? "bg-bg-surface/50 border-white/10"
                        : "bg-accent-brainboard/20 border-accent-brainboard/35 hover:bg-accent-brainboard/30"
                    }`}
                    whileHover={!isRevealed ? { scale: 1.03 } : undefined}
                  >
                    <span
                      className={`font-display text-[clamp(14px,2vw,36px)] font-bold ${
                        isRevealed ? "text-text-dim line-through" : "text-accent-3"
                      }`}
                    >
                      ${value}
                    </span>
                  </motion.div>
                );
              }),
            )}
          </div>
        </div>

        {/* Standings bar */}
        <div className="mt-4 flex flex-wrap justify-center gap-4">
          {gameState.standings.map((s) => {
            const name = getPlayerName(players, s.sessionId);
            const color = getPlayerColor(players, s.sessionId);
            return (
              <div key={s.sessionId} className="flex items-center gap-2">
                <PlayerAvatar name={name} color={color} size={36} />
                <span className="font-body text-[20px] text-text-primary">{name}</span>
                <span
                  className={`font-mono text-[20px] ${s.score >= 0 ? "text-accent-3" : "text-accent-6"}`}
                >
                  ${s.score.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Answering (all players simultaneously) ────────────────────────────
  if (phase === "answering") {
    const answered = gameState.answeredCount ?? 0;
    const total = gameState.totalPlayerCount ?? 0;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
        <span className="font-display text-[clamp(20px,2.5vw,32px)] text-accent-brainboard uppercase tracking-wider">
          {gameState.currentCategoryName} &mdash; ${gameState.currentClueValue}
        </span>

        {gameState.currentClueQuestion && (
          <GlassPanel glow glowColor="oklch(0.68 0.22 265 / 0.25)" className="max-w-4xl px-12 py-8">
            <p className="text-center font-body text-[clamp(28px,3.5vw,48px)] leading-snug text-text-primary">
              {gameState.currentClueQuestion}
            </p>
          </GlassPanel>
        )}

        <motion.h2
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          className="font-display text-[clamp(36px,4.5vw,56px)] font-bold text-text-muted"
        >
          Everyone is answering...
        </motion.h2>

        {/* Progress bar showing how many have answered */}
        {total > 0 && (
          <div className="flex flex-col items-center gap-2">
            <div className="h-3 w-64 overflow-hidden rounded-full bg-white/[0.12]">
              <motion.div
                className="h-full rounded-full bg-accent-brainboard"
                initial={{ width: 0 }}
                animate={{ width: `${(answered / total) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="font-mono text-[clamp(16px,2vw,24px)] text-text-muted">
              {answered} / {total} answered
            </span>
          </div>
        )}

        {timerEndTime && <Timer endTime={timerEndTime} size={100} />}
      </div>
    );
  }

  // ── Round Transition ──────────────────────────────────────────────────
  if (phase === "round-transition") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
        <motion.h1
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 100 }}
          className="font-display text-[clamp(56px,8vw,96px)] font-black text-accent-brainboard"
          style={{
            textShadow: "0 0 40px oklch(0.68 0.22 265 / 0.6), 0 0 80px oklch(0.68 0.22 265 / 0.3)",
          }}
        >
          DOUBLE DOWN!
        </motion.h1>
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="font-body text-[clamp(24px,3vw,36px)] text-text-muted"
        >
          Values are doubled!
        </motion.span>
      </div>
    );
  }

  // ── Power Play Wager ──────────────────────────────────────────────────
  if (phase === "power-play-wager") {
    const selectorName = getPlayerName(players, gameState.selectorSessionId);
    const selectorColor = getPlayerColor(players, gameState.selectorSessionId);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [0, -3, 3, 0] }}
          transition={{ duration: 0.8, type: "spring" }}
          className="font-display text-[clamp(56px,8vw,96px)] font-black"
          style={{
            color: "oklch(0.82 0.2 85)",
            textShadow:
              "0 0 40px oklch(0.82 0.2 85 / 0.6), 0 0 80px oklch(0.82 0.2 85 / 0.3), 0 4px 12px oklch(0 0 0 / 0.5)",
          }}
        >
          POWER PLAY!
        </motion.div>

        <div className="flex items-center gap-4">
          <PlayerAvatar name={selectorName} color={selectorColor} size={72} />
          <span className="font-display text-[clamp(32px,4vw,48px)] font-bold text-text-primary">
            {selectorName}
          </span>
        </div>

        <span className="font-body text-[clamp(24px,3vw,36px)] text-text-muted">
          is wagering...
        </span>

        {timerEndTime && <Timer endTime={timerEndTime} size={100} />}
      </div>
    );
  }

  // ── Power Play Answer ─────────────────────────────────────────────────
  if (phase === "power-play-answer") {
    const selectorName = getPlayerName(players, gameState.selectorSessionId);
    const selectorColor = getPlayerColor(players, gameState.selectorSessionId);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
        <span
          className="font-display text-[clamp(32px,4vw,48px)] font-black"
          style={{
            color: "oklch(0.82 0.2 85)",
            textShadow: "0 0 24px oklch(0.82 0.2 85 / 0.5)",
          }}
        >
          POWER PLAY
        </span>

        {powerPlayWager !== null && (
          <span className="font-mono text-[clamp(28px,3.5vw,44px)] font-bold text-accent-3">
            Wager: ${powerPlayWager.toLocaleString()}
          </span>
        )}

        {gameState.currentClueQuestion && (
          <GlassPanel glow glowColor="oklch(0.82 0.2 85 / 0.25)" className="max-w-4xl px-12 py-8">
            <p className="text-center font-body text-[clamp(28px,3.5vw,48px)] leading-snug text-text-primary">
              {gameState.currentClueQuestion}
            </p>
          </GlassPanel>
        )}

        <div className="flex items-center gap-4">
          <PlayerAvatar name={selectorName} color={selectorColor} size={72} />
          <span className="font-display text-[clamp(32px,4vw,48px)] font-bold text-text-primary">
            {selectorName}
          </span>
        </div>

        <span className="font-body text-[clamp(20px,2.5vw,28px)] text-text-muted">
          is answering...
        </span>

        {timerEndTime && <Timer endTime={timerEndTime} size={100} />}
      </div>
    );
  }

  // ── Clue Result ─────────────────────────────────────────────────────────
  if (phase === "clue-result" && clueResult) {
    const correctCountFromResults = clueResult.results.filter((result) => result.correct).length;
    const correctCount =
      typeof clueResult.correctCount === "number" ? clueResult.correctCount : correctCountFromResults;
    const anyCorrect =
      typeof clueResult.anyCorrect === "boolean"
        ? clueResult.anyCorrect
        : typeof clueResult.correct === "boolean"
          ? clueResult.correct
          : correctCountFromResults > 0;
    const aiReviewed = clueResult.results.filter((result) => result.judgedBy === "ai");
    const sampleAiReview = aiReviewed.find((result) => !!result.judgeExplanation);
    const sampleAiReviewer = sampleAiReview
      ? getPlayerName(players, sampleAiReview.sessionId)
      : null;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
        {clueResult.isPowerPlay && (
          <span
            className="font-display text-[clamp(24px,3vw,36px)] font-bold"
            style={{ color: "oklch(0.82 0.2 85)" }}
          >
            POWER PLAY
          </span>
        )}

        <GlassPanel className="max-w-3xl px-12 py-6">
          <p className="text-center font-body text-[clamp(24px,3vw,36px)] text-text-muted">
            {clueResult.question}
          </p>
        </GlassPanel>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <span className="font-display text-[clamp(20px,2vw,28px)] text-text-muted uppercase tracking-wider">
            Correct Answer
          </span>
          <span className="font-display text-[clamp(36px,4.5vw,56px)] font-bold text-accent-brainboard">
            {clueResult.correctAnswer}
          </span>
        </motion.div>

        {aiReviewed.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl">
            <GlassPanel className="px-6 py-4 border border-accent-brainboard/35">
              <div className="flex flex-col items-center gap-1 text-center">
                <span className="font-display text-[clamp(16px,2vw,24px)] uppercase tracking-wider text-accent-brainboard">
                  AI Judge Used
                </span>
                <span className="font-body text-[clamp(14px,1.7vw,20px)] text-text-muted">
                  {aiReviewed.length === 1
                    ? "Reviewed 1 borderline answer."
                    : `Reviewed ${aiReviewed.length} borderline answers.`}
                </span>
                {sampleAiReview?.judgeExplanation && sampleAiReviewer && (
                  <span className="font-body text-[clamp(14px,1.5vw,18px)] text-text-primary">
                    {sampleAiReviewer}: {sampleAiReview.judgeExplanation}
                  </span>
                )}
              </div>
            </GlassPanel>
          </motion.div>
        )}

        {anyCorrect && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-2"
          >
            <span className="font-display text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary">
              {correctCount > 0
                ? correctCount === 1
                  ? "1 player got it!"
                  : `${correctCount} players got it!`
                : "Correct answer found!"}
            </span>
          </motion.div>
        )}

        {!anyCorrect && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-display text-[clamp(28px,3.5vw,40px)] text-accent-6"
          >
            No one got it!
          </motion.span>
        )}

        <ConfettiBurst trigger={anyCorrect} preset="correct" />
      </div>
    );
  }

  // ── All-In Category ─────────────────────────────────────────────────
  if (phase === "all-in-category") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
        <motion.h1
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 100 }}
          className="font-display text-[clamp(48px,7vw,80px)] font-black text-accent-brainboard"
          style={{
            textShadow: "0 0 40px oklch(0.68 0.22 265 / 0.6), 0 0 80px oklch(0.68 0.22 265 / 0.3)",
          }}
        >
          ALL-IN ROUND
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <GlassPanel glow glowColor="oklch(0.68 0.22 265 / 0.4)" className="px-16 py-10">
            <span className="font-display text-[clamp(32px,4.5vw,56px)] font-bold text-accent-brainboard uppercase text-center">
              {gameState.allInCategory}
            </span>
          </GlassPanel>
        </motion.div>
      </div>
    );
  }

  // ── All-In Wager ────────────────────────────────────────────────
  if (phase === "all-in-wager") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
        <h1
          className="font-display text-[clamp(48px,6vw,72px)] font-black text-accent-brainboard"
          style={{
            textShadow: "0 0 30px oklch(0.68 0.22 265 / 0.5)",
          }}
        >
          ALL-IN ROUND
        </h1>

        <GlassPanel className="px-12 py-6">
          <span className="font-display text-[clamp(24px,3vw,40px)] text-accent-brainboard uppercase">
            {gameState.allInCategory}
          </span>
        </GlassPanel>

        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          className="font-body text-[clamp(28px,3.5vw,44px)] text-text-muted"
        >
          Players are wagering...
        </motion.span>

        {timerEndTime && <Timer endTime={timerEndTime} size={120} />}
      </div>
    );
  }

  // ── All-In Answer ───────────────────────────────────────────────
  if (phase === "all-in-answer") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
        <h1
          className="font-display text-[clamp(48px,6vw,72px)] font-black text-accent-brainboard"
          style={{
            textShadow: "0 0 30px oklch(0.68 0.22 265 / 0.5)",
          }}
        >
          ALL-IN ROUND
        </h1>

        {gameState.allInQuestion && (
          <GlassPanel glow glowColor="oklch(0.68 0.22 265 / 0.3)" className="max-w-4xl px-12 py-8">
            <p className="text-center font-body text-[clamp(28px,3.5vw,48px)] leading-snug text-text-primary">
              {gameState.allInQuestion}
            </p>
          </GlassPanel>
        )}

        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          className="font-body text-[clamp(28px,3.5vw,44px)] text-text-muted"
        >
          Players are answering...
        </motion.span>

        {timerEndTime && <Timer endTime={timerEndTime} size={120} />}
      </div>
    );
  }

  // ── All-In Reveal ───────────────────────────────────────────────
  if (phase === "all-in-reveal" && finalReveal) {
    // Sort results by score ascending (lowest revealed first)
    const sortedResults = [...finalReveal.results].sort((a, b) => {
      const aScore = gameState.standings.find((s) => s.sessionId === a.sessionId)?.score ?? 0;
      const bScore = gameState.standings.find((s) => s.sessionId === b.sessionId)?.score ?? 0;
      return aScore - bScore;
    });
    const aiReviewed = finalReveal.results.filter((result) => result.judgedBy === "ai");
    const sampleAiReview = aiReviewed.find((result) => !!result.judgeExplanation);
    const sampleAiReviewer = sampleAiReview
      ? getPlayerName(players, sampleAiReview.sessionId)
      : null;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <h1
          className="font-display text-[clamp(36px,5vw,56px)] font-black text-accent-brainboard"
          style={{ textShadow: "0 0 24px oklch(0.68 0.22 265 / 0.5)" }}
        >
          ALL-IN REVEAL
        </h1>

        <div className="flex flex-col gap-4 w-full max-w-3xl">
          <AnimatePresence>
            {sortedResults.slice(0, revealIndex).map((result) => {
              const name = getPlayerName(players, result.sessionId);
              const color = getPlayerColor(players, result.sessionId);

              return (
                <motion.div
                  key={result.sessionId}
                  initial={{ opacity: 0, x: -60 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 150, damping: 20 }}
                >
                  <GlassPanel className="flex items-center gap-6 px-8 py-5">
                    <PlayerAvatar name={name} color={color} size={56} />
                    <div className="flex flex-1 flex-col">
                      <span className="font-display text-[clamp(24px,3vw,36px)] font-bold text-text-primary">
                        {name}
                      </span>
                      <span className="font-body text-[clamp(18px,2vw,24px)] text-text-muted">
                        &ldquo;{result.answer || "(no answer)"}&rdquo;
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-body text-[clamp(16px,1.5vw,20px)] text-text-muted">
                        Wager: ${result.wager.toLocaleString()}
                      </span>
                      <span
                        className={`font-mono text-[clamp(24px,3vw,36px)] font-bold ${
                          result.correct ? "text-success" : "text-accent-6"
                        }`}
                      >
                        {result.delta >= 0 ? "+" : ""}${result.delta.toLocaleString()}
                      </span>
                    </div>
                    {result.correct && <ConfettiBurst trigger preset="correct" />}
                  </GlassPanel>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {aiReviewed.length > 0 && (
          <GlassPanel className="max-w-3xl w-full px-6 py-4 border border-accent-brainboard/35">
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="font-display text-[clamp(16px,2vw,24px)] uppercase tracking-wider text-accent-brainboard">
                AI Judge Used
              </span>
              <span className="font-body text-[clamp(14px,1.7vw,20px)] text-text-muted">
                {aiReviewed.length === 1
                  ? "Reviewed 1 all-in answer."
                  : `Reviewed ${aiReviewed.length} all-in answers.`}
              </span>
              {sampleAiReview?.judgeExplanation && sampleAiReviewer && (
                <span className="font-body text-[clamp(14px,1.5vw,18px)] text-text-primary">
                  {sampleAiReviewer}: {sampleAiReview.judgeExplanation}
                </span>
              )}
            </div>
          </GlassPanel>
        )}

        <div className="mt-4">
          <span className="font-display text-[clamp(20px,2vw,28px)] text-text-muted">
            Correct Answer:
          </span>{" "}
          <span className="font-display text-[clamp(24px,3vw,36px)] font-bold text-accent-brainboard">
            {finalReveal.correctAnswer}
          </span>
        </div>
      </div>
    );
  }

  // ── Final Scores ────────────────────────────────────────────────────────
  if (phase === "final-scores") {
    const scores = buildScores(players);
    return (
      <FinalScoresLayout
        scores={scores}
        accentColorClass="text-accent-brainboard"
        gameId="brain-board"
        room={room}
      />
    );
  }

  // ── Fallback ────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="font-display text-[48px] text-text-muted">Brain Board: {phase}</p>
    </div>
  );
}
