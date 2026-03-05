"use client";

import type { PlayerData } from "@flimflam/shared";
import { AVATAR_COLORS, generateAwards } from "@flimflam/shared";
import {
  ANIMATION_DURATIONS,
  ANIMATION_EASINGS,
  ANIMATION_STAGGERS,
  AnimatedCounter,
  ConfettiBurst,
  GlassPanel,
  sounds,
  useReducedMotion,
} from "@flimflam/ui";
import { Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FinalScoresLayout, buildScores } from "@/components/game/FinalScoresLayout";
import { GameBoard } from "@/components/game/GameBoard";
import { PlayerStatus } from "@/components/game/PlayerStatus";
import { Timer } from "@/components/game/Timer";

// Controls
import { BrainBoardChat } from "@/components/controls/BrainBoardChat";
import { BrainBoardClueResult } from "@/components/controls/BrainBoardClueResult";
import { BrainBoardStandings } from "@/components/controls/BrainBoardStandings";
import { CategoryReveal } from "@/components/controls/CategoryReveal";
import { ClueGrid } from "@/components/controls/ClueGrid";
import { NumberInput } from "@/components/controls/NumberInput";
import { TextInput } from "@/components/controls/TextInput";
import { WaitingScreen } from "@/components/game/WaitingScreen";

// ─── Types ──────────────────────────────────────────────────────────────────

interface BrainBoardGameProps {
  phase: string;
  round: number;
  totalRounds: number;
  players: PlayerData[];
  gamePayload: Record<string, unknown>;
  privateData: Record<string, unknown> | null;
  gameEvents: Record<string, Record<string, unknown>>;
  mySessionId: string | null;
  isHost: boolean;
  timerEndTime: number | null;
  sendMessage: (type: string, data?: Record<string, unknown>) => void;
  room: {
    onMessage: (type: string, cb: (data: Record<string, unknown>) => void) => () => void;
  } | null;
  errorNonce?: number;
}

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
  chatMessages?: Array<{
    id: string;
    sender: string;
    senderSessionId: string;
    message: string;
    isAI: boolean;
    timestamp: number;
  }>;
  serverTimeOffset?: number;
  timerEndsAt?: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPlayerName(players: PlayerData[], sessionId: string | null): string {
  if (!sessionId) return "???";
  return players.find((p) => p.sessionId === sessionId)?.name ?? "???";
}

function getPlayerColor(players: PlayerData[], sessionId: string | null): string {
  if (!sessionId) return AVATAR_COLORS[0] ?? "#FF3366";
  const player = players.find((p) => p.sessionId === sessionId);
  if (player?.avatarColor) return player.avatarColor;
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

export function BrainBoardGame({
  phase,
  round,
  totalRounds,
  players,
  privateData,
  gameEvents,
  mySessionId,
  isHost,
  timerEndTime,
  sendMessage,
  room,
  errorNonce,
}: BrainBoardGameProps) {
  const reducedMotion = useReducedMotion();
  const pd = privateData ?? {};

  // ─── Host-side state from room messages ─────────────────────────
  const [gameState, setGameState] = useState<BrainBoardGameState | null>(null);
  const [clueResult, setClueResult] = useState<ClueResultData | null>(null);
  const [finalReveal, setFinalReveal] = useState<FinalRevealData | null>(null);
  const [powerPlayWager, setPowerPlayWager] = useState<number | null>(null);
  const [revealIndex, setRevealIndex] = useState(0);
  const [_lastSubmittedText, setLastSubmittedText] = useState<string | null>(null);
  const prevPhaseRef = useRef(phase);

  // Reset reveal index on all-in-reveal
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
      sounds.reveal();
    }, 3000);
    return () => clearTimeout(timer);
  }, [phase, finalReveal, revealIndex]);

  // Listen for game-data messages (board state from server)
  const handleMessage = useCallback((data: Record<string, unknown>) => {
    const type = data.type as string | undefined;
    if (type === "game-state") {
      setGameState(data as unknown as BrainBoardGameState);
    } else if (type === "clue-result") {
      const results = Array.isArray(data.results) ? (data.results as ClueResultEntry[]) : [];
      if (results.some((r) => r.correct)) sounds.correct();
      else sounds.buzz();
      setClueResult({ ...(data as unknown as ClueResultData), results });
    } else if (type === "all-in-reveal") {
      setFinalReveal(data as unknown as FinalRevealData);
      sounds.reveal();
    } else if (type === "power-play-wager-set") {
      setPowerPlayWager((data.wager as number) ?? null);
      sounds.tick();
    }
  }, []);

  useEffect(() => {
    if (!room) return;
    const unsub = room.onMessage("game-data", handleMessage);
    return () => unsub();
  }, [room, handleMessage]);

  // ─── Controller message handlers ───────────────────────────────
  const handleBrainBoardAnswer = useCallback(
    (text: string) => {
      setLastSubmittedText(text.trim());
      sendMessage("player:answer", { answer: text });
    },
    [sendMessage],
  );

  const handleClueSelect = useCallback(
    (clueId: string) => {
      const [catStr, clueStr] = clueId.split(",");
      const categoryIndex = Number(catStr);
      const clueIndex = Number(clueStr);
      if (!Number.isNaN(categoryIndex) && !Number.isNaN(clueIndex)) {
        sendMessage("player:select-clue", { categoryIndex, clueIndex });
      }
    },
    [sendMessage],
  );

  const handlePowerPlayWagerSubmit = useCallback(
    (wager: number) => sendMessage("player:power-play-wager", { wager }),
    [sendMessage],
  );

  const handlePowerPlayAnswer = useCallback(
    (text: string) => {
      setLastSubmittedText(text.trim());
      sendMessage("player:power-play-answer", { answer: text });
    },
    [sendMessage],
  );

  const handleAllInWager = useCallback(
    (wager: number) => sendMessage("player:all-in-wager", { wager }),
    [sendMessage],
  );

  const handleAllInAnswer = useCallback(
    (text: string) => {
      setLastSubmittedText(text.trim());
      sendMessage("player:all-in-answer", { answer: text });
    },
    [sendMessage],
  );

  const handleConfirmCategories = useCallback(
    () => sendMessage("player:confirm-categories"),
    [sendMessage],
  );
  const handleRerollBoard = useCallback(() => sendMessage("player:reroll-board"), [sendMessage]);
  const handleChatMessage = useCallback(
    (text: string) => sendMessage("player:chat-message", { message: text }),
    [sendMessage],
  );

  // ─── Derived data from gameEvents (controller-side) ────────────
  const gs = (gameEvents?.["game-state"] ?? {}) as Record<string, unknown>;
  const boardCategories = useMemo(() => {
    if (Array.isArray(gs.board)) {
      return (gs.board as Array<{ name?: string }>)
        .map((entry) => (typeof entry.name === "string" ? entry.name : ""))
        .filter((name) => name.length > 0);
    }
    return [];
  }, [gs.board]);

  const bbStandings = useMemo(() => {
    return Array.isArray(gs.standings) ? (gs.standings as Standing[]) : [];
  }, [gs.standings]);

  const currentRound = typeof gs.currentRound === "number" ? gs.currentRound : 1;
  const doubleDownValues = gs.doubleDownValues === true;
  const answeredCount = typeof gs.answeredCount === "number" ? gs.answeredCount : 0;
  const totalPlayerCount = typeof gs.totalPlayerCount === "number" ? gs.totalPlayerCount : 0;

  const selectorSessionId = typeof gs.selectorSessionId === "string" ? gs.selectorSessionId : null;
  const selectorName = selectorSessionId
    ? (players.find((p) => p.sessionId === selectorSessionId)?.name ?? null)
    : null;

  const isMyTurn = pd.isSelector === true || pd.isPowerPlayPlayer === true;

  // ─── Render helpers ─────────────────────────────────────────────

  function renderBoard(): React.ReactNode {
    // Use host gameState if available (from room messages), else fallback to gameEvents
    const state = gameState;

    // ── Topic Chat ──
    if (phase === "topic-chat") {
      const chatMessages =
        state?.chatMessages ??
        (Array.isArray(gs.chatMessages)
          ? (gs.chatMessages as BrainBoardGameState["chatMessages"])
          : []) ??
        [];

      return (
        <div className="flex flex-col items-center justify-center gap-8 p-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-[clamp(36px,5vw,56px)] font-bold text-accent-brainboard"
            style={{ textShadow: "0 0 40px oklch(0.68 0.22 265 / 0.4)" }}
          >
            Topic Lab
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="font-body text-[clamp(18px,2.5vw,28px)] text-text-muted"
          >
            Chat with AI about tonight's topics...
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex w-full max-w-3xl flex-col gap-4"
          >
            {(chatMessages ?? []).slice(-8).map((msg, idx) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: msg.isAI ? -30 : 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1, type: "spring", stiffness: 300, damping: 25 }}
              >
                <GlassPanel
                  glow={msg.isAI}
                  glowColor={msg.isAI ? "oklch(0.68 0.22 265 / 0.2)" : undefined}
                  className={`px-6 py-4 ${msg.isAI ? "border border-accent-brainboard/30" : ""}`}
                >
                  <p
                    className={`font-display text-sm font-bold uppercase tracking-wider ${msg.isAI ? "text-accent-brainboard" : "text-text-muted"}`}
                  >
                    {msg.isAI ? "AI Host" : msg.sender}
                  </p>
                  <p className="mt-1 font-body text-[clamp(16px,2vw,24px)] text-text-primary">
                    {msg.message}
                  </p>
                </GlassPanel>
              </motion.div>
            ))}
          </motion.div>
          {timerEndTime && <Timer endTime={timerEndTime} />}
        </div>
      );
    }

    // ── Generating Board ──
    if (phase === "generating-board") {
      return (
        <div className="flex flex-col items-center justify-center gap-8 p-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="h-20 w-20 rounded-full border-4 border-accent-brainboard/30 border-t-accent-brainboard"
          />
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-display text-[clamp(36px,5vw,56px)] font-bold text-accent-brainboard"
            style={{ textShadow: "0 0 40px oklch(0.68 0.22 265 / 0.4)" }}
          >
            Building Your Board
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="font-body text-[clamp(18px,2.5vw,28px)] text-text-muted"
          >
            AI is crafting custom trivia from your topics...
          </motion.p>
        </div>
      );
    }

    // For remaining phases, need game state
    if (!state) {
      return (
        <div className="flex items-center justify-center p-8">
          <p className="font-display text-[48px] text-accent-brainboard animate-glow-pulse">
            Loading Brain Board...
          </p>
        </div>
      );
    }

    // ── Category Reveal ──
    if (phase === "category-reveal") {
      return (
        <div className="flex flex-col items-center justify-center gap-8 p-8">
          <motion.h1
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="font-display text-[clamp(48px,6vw,72px)] font-bold text-accent-brainboard"
          >
            {state.currentRound === 2 ? "DOUBLE DOWN!" : "BRAIN BOARD!"}
          </motion.h1>
          <div className="flex flex-wrap justify-center gap-4">
            {state.board.map((cat, i) => (
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

    // ── Clue Select (Board) ──
    if (phase === "clue-select") {
      const revealedSet = new Set(state.revealedClues);
      const selName = getPlayerName(players, state.selectorSessionId);
      const selColor = getPlayerColor(players, state.selectorSessionId);
      const sortedStandings = [...state.standings].sort((a, b) => b.score - a.score);
      const values = state.doubleDownValues
        ? [400, 800, 1200, 1600, 2000]
        : [200, 400, 600, 800, 1000];

      return (
        <div className="flex flex-col items-center p-4">
          <div className="mb-4 flex items-center gap-4">
            <PlayerAvatar name={selName} color={selColor} size={48} />
            <span className="font-display text-[clamp(24px,3vw,36px)] text-accent-brainboard">
              {selName}&apos;s pick
            </span>
          </div>
          <div className="w-full overflow-x-auto pb-2">
            <div className="mx-auto grid min-w-[740px] max-w-[1400px] grid-cols-6 gap-2">
              {state.board.map((cat) => (
                <div
                  key={cat.name}
                  className="flex min-h-[64px] sm:min-h-[80px] items-center justify-center rounded-lg bg-accent-brainboard/20 border border-accent-brainboard/30 p-1.5 sm:p-2"
                >
                  <span className="font-display text-[clamp(10px,1.3vw,20px)] font-bold text-accent-brainboard text-center uppercase leading-tight break-words">
                    {cat.name}
                  </span>
                </div>
              ))}
              {values.map((value, rowIdx) =>
                state.board.map((_, colIdx) => {
                  const key = `${colIdx},${rowIdx}`;
                  const isRevealed = revealedSet.has(key);
                  return (
                    <motion.div
                      key={key}
                      className={`flex min-h-[64px] sm:min-h-[80px] items-center justify-center rounded-lg border transition-all ${
                        isRevealed
                          ? "bg-bg-surface/50 border-white/10"
                          : "bg-accent-brainboard/20 border-accent-brainboard/35"
                      }`}
                    >
                      <span
                        className={`font-display text-[clamp(14px,2vw,36px)] font-bold ${isRevealed ? "text-text-dim line-through" : "text-accent-3"}`}
                      >
                        ${value}
                      </span>
                    </motion.div>
                  );
                }),
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            <AnimatePresence mode="popLayout">
              {sortedStandings.map((s, idx) => {
                const name = getPlayerName(players, s.sessionId);
                const color = getPlayerColor(players, s.sessionId);
                return (
                  <motion.div
                    key={s.sessionId}
                    layout={!reducedMotion}
                    initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
                    animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                    transition={
                      reducedMotion
                        ? {
                            delay: idx * ANIMATION_STAGGERS.tight,
                            duration: ANIMATION_DURATIONS.quick,
                            ease: ANIMATION_EASINGS.smoothInOut,
                          }
                        : { delay: idx * ANIMATION_STAGGERS.tight, type: "spring", stiffness: 180 }
                    }
                    className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/6 px-3 py-2"
                  >
                    <span className="font-mono text-sm text-text-muted">#{idx + 1}</span>
                    <PlayerAvatar name={name} color={color} size={36} />
                    <span className="font-body text-[20px] text-text-primary">{name}</span>
                    <AnimatedCounter
                      value={s.score}
                      duration={850}
                      className={`text-[20px] font-bold ${s.score >= 0 ? "text-accent-3" : "text-accent-6"}`}
                      format={(v) => `$${v.toLocaleString()}`}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      );
    }

    // ── Answering ──
    if (phase === "answering") {
      const answered = state.answeredCount ?? 0;
      const total = state.totalPlayerCount ?? 0;
      const nonHostPlayers = players.filter((p) => !p.isHost);
      const connectedPlayers = nonHostPlayers.filter((p) => p.connected !== false);
      const submissionTarget = Math.max(
        1,
        connectedPlayers.length > 0 ? connectedPlayers.length : total,
      );
      const submitted = Math.min(answered, submissionTarget);

      return (
        <div className="flex flex-col items-center justify-center gap-8 p-8">
          <span className="font-display text-[clamp(20px,2.5vw,32px)] text-accent-brainboard uppercase tracking-wider">
            {state.currentCategoryName} &mdash; ${state.currentClueValue}
          </span>
          {state.currentClueQuestion && (
            <GlassPanel
              glow
              glowColor="oklch(0.68 0.22 265 / 0.25)"
              className="max-w-4xl px-12 py-8"
            >
              <p className="text-center font-body text-[clamp(28px,3.5vw,48px)] leading-snug text-text-primary">
                {state.currentClueQuestion}
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
          {submissionTarget > 0 && (
            <div className="flex flex-col items-center gap-2">
              <div className="h-3 w-64 overflow-hidden rounded-full bg-white/[0.12]">
                <motion.div
                  className="h-full rounded-full bg-accent-brainboard"
                  initial={{ width: 0 }}
                  animate={{ width: `${(submitted / submissionTarget) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="font-mono text-[clamp(16px,2vw,24px)] text-text-muted">
                {submitted}/{submissionTarget} submitted
              </span>
            </div>
          )}
          {timerEndTime && <Timer endTime={timerEndTime} size={100} />}
        </div>
      );
    }

    // ── Round Transition ──
    if (phase === "round-transition") {
      return (
        <div className="flex flex-col items-center justify-center gap-8 p-8">
          <motion.h1
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 100 }}
            className="font-display text-[clamp(56px,8vw,96px)] font-black text-accent-brainboard"
            style={{
              textShadow:
                "0 0 40px oklch(0.68 0.22 265 / 0.6), 0 0 80px oklch(0.68 0.22 265 / 0.3)",
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

    // ── Power Play Wager ──
    if (phase === "power-play-wager") {
      const selName = getPlayerName(players, state.selectorSessionId);
      const selColor = getPlayerColor(players, state.selectorSessionId);
      return (
        <div className="flex flex-col items-center justify-center gap-8 p-8">
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
            <PlayerAvatar name={selName} color={selColor} size={72} />
            <span className="font-display text-[clamp(32px,4vw,48px)] font-bold text-text-primary">
              {selName}
            </span>
          </div>
          <span className="font-body text-[clamp(24px,3vw,36px)] text-text-muted">
            is wagering...
          </span>
          {timerEndTime && <Timer endTime={timerEndTime} size={100} />}
        </div>
      );
    }

    // ── Power Play Answer ──
    if (phase === "power-play-answer") {
      const selName = getPlayerName(players, state.selectorSessionId);
      const selColor = getPlayerColor(players, state.selectorSessionId);
      return (
        <div className="flex flex-col items-center justify-center gap-8 p-8">
          <span
            className="font-display text-[clamp(32px,4vw,48px)] font-black"
            style={{ color: "oklch(0.82 0.2 85)", textShadow: "0 0 24px oklch(0.82 0.2 85 / 0.5)" }}
          >
            POWER PLAY
          </span>
          {powerPlayWager !== null && (
            <span className="font-mono text-[clamp(28px,3.5vw,44px)] font-bold text-accent-3">
              Wager: ${powerPlayWager.toLocaleString()}
            </span>
          )}
          {state.currentClueQuestion && (
            <GlassPanel glow glowColor="oklch(0.82 0.2 85 / 0.25)" className="max-w-4xl px-12 py-8">
              <p className="text-center font-body text-[clamp(28px,3.5vw,48px)] leading-snug text-text-primary">
                {state.currentClueQuestion}
              </p>
            </GlassPanel>
          )}
          <div className="flex items-center gap-4">
            <PlayerAvatar name={selName} color={selColor} size={72} />
            <span className="font-display text-[clamp(32px,4vw,48px)] font-bold text-text-primary">
              {selName}
            </span>
          </div>
          <span className="font-body text-[clamp(20px,2.5vw,28px)] text-text-muted">
            is answering...
          </span>
          {timerEndTime && <Timer endTime={timerEndTime} size={100} />}
        </div>
      );
    }

    // ── Clue Result ──
    if (phase === "clue-result" && clueResult) {
      const correctCountFromResults = clueResult.results.filter((r) => r.correct).length;
      const correctCount =
        typeof clueResult.correctCount === "number"
          ? clueResult.correctCount
          : correctCountFromResults;
      const anyCorrect =
        typeof clueResult.anyCorrect === "boolean"
          ? clueResult.anyCorrect
          : typeof clueResult.correct === "boolean"
            ? clueResult.correct
            : correctCountFromResults > 0;

      return (
        <div className="flex flex-col items-center justify-center gap-8 p-8">
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
          {anyCorrect ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center gap-2"
            >
              <span className="font-display text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary">
                {correctCount === 1 ? "1 player got it!" : `${correctCount} players got it!`}
              </span>
            </motion.div>
          ) : (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-display text-[clamp(28px,3.5vw,40px)] text-accent-6"
            >
              No one got it!
            </motion.span>
          )}
          {clueResult.results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap justify-center gap-3 max-w-4xl"
            >
              {clueResult.results.map((result) => {
                const pName = getPlayerName(players, result.sessionId);
                const pColor = getPlayerColor(players, result.sessionId);
                return (
                  <div
                    key={result.sessionId}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 ${result.correct ? "bg-success/15 border border-success/30" : result.answer ? "bg-accent-6/10 border border-accent-6/20" : "bg-white/5 border border-white/10"}`}
                  >
                    <PlayerAvatar name={pName} color={pColor} size={28} />
                    <span className="font-body text-[16px] text-text-primary">{pName}</span>
                    <span
                      className={`font-body text-[14px] italic ${result.correct ? "text-success" : "text-text-muted"}`}
                    >
                      {result.answer || "(no answer)"}
                    </span>
                    {result.delta !== 0 && (
                      <span
                        className={`font-mono text-[14px] font-bold ${result.delta > 0 ? "text-success" : "text-accent-6"}`}
                      >
                        {result.delta > 0 ? "+" : ""}
                        {result.delta}
                      </span>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}
          <ConfettiBurst trigger={anyCorrect} preset="correct" />
        </div>
      );
    }

    // ── All-In Category ──
    if (phase === "all-in-category") {
      return (
        <div className="flex flex-col items-center justify-center gap-8 p-8">
          <motion.h1
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 100 }}
            className="font-display text-[clamp(48px,7vw,80px)] font-black text-accent-brainboard"
            style={{
              textShadow:
                "0 0 40px oklch(0.68 0.22 265 / 0.6), 0 0 80px oklch(0.68 0.22 265 / 0.3)",
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
                {state.allInCategory}
              </span>
            </GlassPanel>
          </motion.div>
        </div>
      );
    }

    // ── All-In Wager ──
    if (phase === "all-in-wager") {
      return (
        <div className="flex flex-col items-center justify-center gap-8 p-8">
          <h1
            className="font-display text-[clamp(48px,6vw,72px)] font-black text-accent-brainboard"
            style={{ textShadow: "0 0 30px oklch(0.68 0.22 265 / 0.5)" }}
          >
            ALL-IN ROUND
          </h1>
          <GlassPanel className="px-12 py-6">
            <span className="font-display text-[clamp(24px,3vw,40px)] text-accent-brainboard uppercase">
              {state.allInCategory}
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

    // ── All-In Answer ──
    if (phase === "all-in-answer") {
      return (
        <div className="flex flex-col items-center justify-center gap-8 p-8">
          <h1
            className="font-display text-[clamp(48px,6vw,72px)] font-black text-accent-brainboard"
            style={{ textShadow: "0 0 30px oklch(0.68 0.22 265 / 0.5)" }}
          >
            ALL-IN ROUND
          </h1>
          {state.allInQuestion && (
            <GlassPanel
              glow
              glowColor="oklch(0.68 0.22 265 / 0.3)"
              className="max-w-4xl px-12 py-8"
            >
              <p className="text-center font-body text-[clamp(28px,3.5vw,48px)] leading-snug text-text-primary">
                {state.allInQuestion}
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

    // ── All-In Reveal ──
    if (phase === "all-in-reveal" && finalReveal) {
      const sortedResults = [...finalReveal.results].sort((a, b) => {
        const aScore = state.standings.find((s) => s.sessionId === a.sessionId)?.score ?? 0;
        const bScore = state.standings.find((s) => s.sessionId === b.sessionId)?.score ?? 0;
        return aScore - bScore;
      });

      return (
        <div className="flex flex-col items-center justify-center gap-6 p-8">
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
                          className={`font-mono text-[clamp(24px,3vw,36px)] font-bold ${result.correct ? "text-success" : "text-accent-6"}`}
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

    // ── Final Scores ──
    if (phase === "final-scores") {
      const scores = buildScores(players);
      const awards = generateAwards(
        players
          .filter((p) => !p.isHost)
          .map((p) => ({
            name: p.name,
            sessionId: p.sessionId,
            score: p.score,
            correctCount: p.progressOrCustomInt,
          })),
        "brain-board",
      );
      return (
        <FinalScoresLayout
          scores={scores}
          accentColorClass="text-accent-brainboard"
          gameId="brain-board"
          gameAwards={awards}
          room={room as any}
        />
      );
    }

    // ── Fallback ──
    return (
      <div className="flex items-center justify-center p-8">
        <p className="font-display text-[48px] text-text-muted">Brain Board: {phase}</p>
      </div>
    );
  }

  function renderControls(): React.ReactNode {
    // ── Topic Chat controls ──
    if (phase === "topic-chat") {
      const chatMessages =
        gameState?.chatMessages ??
        (Array.isArray(gs.chatMessages)
          ? (gs.chatMessages as BrainBoardGameState["chatMessages"])
          : []) ??
        [];
      const serverTimeOffset = typeof gs.serverTimeOffset === "number" ? gs.serverTimeOffset : 0;
      const timerEndsAt = typeof gs.timerEndsAt === "number" ? gs.timerEndsAt : 0;

      return (
        <div className="flex flex-col gap-2 pb-4 pt-2" style={{ minHeight: "240px" }}>
          <BrainBoardChat
            messages={chatMessages ?? []}
            players={players}
            mySessionId={mySessionId}
            onSendMessage={handleChatMessage}
            timerEndsAt={timerEndsAt}
            serverTimeOffset={serverTimeOffset}
          />
        </div>
      );
    }

    // ── Generating Board ──
    if (phase === "generating-board") {
      return (
        <div className="flex flex-col items-center gap-4 px-4 py-6">
          <GlassPanel
            glow
            glowColor="oklch(0.68 0.22 265 / 0.3)"
            className="flex flex-col items-center gap-5 px-8 py-6"
          >
            <div className="relative">
              <div className="h-12 w-12 animate-spin-slow rounded-full border-2 border-accent-brainboard/30 border-t-accent-brainboard" />
              <Zap className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-accent-brainboard" />
            </div>
            <p className="font-display text-lg font-bold text-text-primary">Building Your Board</p>
            <p className="text-center font-body text-sm text-text-muted">
              AI is crafting custom trivia from your topics...
            </p>
          </GlassPanel>
        </div>
      );
    }

    // ── Category Reveal ──
    if (phase === "category-reveal") {
      const revealCategories = Array.isArray(pd.categories)
        ? pd.categories.filter((c): c is string => typeof c === "string")
        : [];
      if (pd.isSelector === true && revealCategories.length > 0) {
        return (
          <CategoryReveal
            categories={revealCategories}
            isSelector={true}
            onConfirm={handleConfirmCategories}
            onReroll={handleRerollBoard}
          />
        );
      }
      return (
        <div className="flex flex-col items-center gap-4 px-4 py-6">
          <GlassPanel className="flex w-full max-w-sm flex-col items-center gap-3 px-4 py-5">
            <p className="text-center font-display text-lg font-bold text-text-primary">
              Categories revealed. Selector is choosing...
            </p>
          </GlassPanel>
        </div>
      );
    }

    // ── Clue Select ──
    if (phase === "clue-select") {
      if (pd.isSelector) {
        const categories = Array.isArray(pd.categories)
          ? pd.categories.filter((c): c is string => typeof c === "string")
          : [];
        const answeredClues = Array.isArray(pd.answeredClues)
          ? pd.answeredClues.filter((c): c is string => typeof c === "string")
          : [];
        return (
          <div className="flex flex-col gap-4 pb-4 pt-4">
            <div className="mx-4 flex justify-center">
              <span className="rounded-full border border-accent-brainboard/30 bg-accent-brainboard/15 px-4 py-1.5 font-display text-xs font-bold text-accent-brainboard uppercase">
                Your pick!
              </span>
            </div>
            <ClueGrid
              categories={categories}
              answeredClues={answeredClues}
              onSelect={handleClueSelect}
            />
          </div>
        );
      }
      const answeredClues = Array.isArray(gs.revealedClues) ? (gs.revealedClues as string[]) : [];
      return (
        <div className="flex flex-col gap-4 pb-4 pt-4">
          <div className="mx-4 flex justify-center">
            <span className="rounded-full border border-accent-brainboard/30 bg-accent-brainboard/15 px-4 py-1.5 font-display text-xs font-bold text-accent-brainboard uppercase">
              {selectorName ? `${selectorName}'s pick` : "Selector is picking..."}
            </span>
          </div>
          <ClueGrid
            categories={boardCategories}
            answeredClues={answeredClues}
            onSelect={handleClueSelect}
            readOnly
          />
          {bbStandings.length > 0 && (
            <div className="mt-2">
              <BrainBoardStandings
                standings={bbStandings}
                players={players}
                mySessionId={mySessionId}
                currentRound={currentRound}
                doubleDownValues={doubleDownValues}
              />
            </div>
          )}
        </div>
      );
    }

    // ── Answering ──
    if (phase === "answering") {
      if (pd.hasAnswered) {
        const clueQ = typeof gs.currentClueQuestion === "string" ? gs.currentClueQuestion : "";
        return (
          <div className="flex flex-col items-center gap-4 px-4 pb-4 pt-4">
            <GlassPanel className="flex w-full max-w-sm flex-col items-center gap-3 px-6 py-5">
              <p className="font-display text-lg font-bold text-accent-brainboard">Locked In!</p>
              <p className="text-center font-body text-sm text-text-muted">{clueQ}</p>
              {totalPlayerCount > 0 && (
                <div className="mt-2 flex flex-col items-center gap-1">
                  <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-accent-brainboard transition-all duration-500"
                      style={{
                        width: `${totalPlayerCount > 0 ? (answeredCount / totalPlayerCount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="font-mono text-xs text-text-dim">
                    {answeredCount}/{totalPlayerCount} answered
                  </p>
                </div>
              )}
            </GlassPanel>
          </div>
        );
      }
      const clueQ = typeof pd.clueQuestion === "string" ? pd.clueQuestion : "";
      const clueCat = typeof pd.clueCategory === "string" ? pd.clueCategory : "";
      const clueVal = typeof pd.clueValue === "number" ? pd.clueValue : 0;
      return (
        <div className="flex flex-col gap-4 pb-4 pt-4">
          {clueCat && (
            <div className="mx-4 flex justify-center">
              <span className="rounded-lg border border-accent-brainboard/30 bg-accent-brainboard/15 px-4 py-2 font-display text-sm font-bold text-accent-brainboard uppercase">
                {clueCat} — ${clueVal}
              </span>
            </div>
          )}
          {clueQ && (
            <div className="px-4">
              <GlassPanel glow glowColor="oklch(0.68 0.22 265 / 0.2)" className="px-4 py-4">
                <p className="text-center font-body text-lg font-medium text-text-primary">
                  {clueQ}
                </p>
              </GlassPanel>
            </div>
          )}
          <TextInput
            prompt="Your answer:"
            placeholder="Answer..."
            onSubmit={handleBrainBoardAnswer}
            resetNonce={errorNonce}
          />
        </div>
      );
    }

    // ── Power Play Wager ──
    if (phase === "power-play-wager") {
      if (pd.isPowerPlayPlayer) {
        const maxWager = typeof pd.maxWager === "number" ? pd.maxWager : 1000;
        return (
          <div className="flex flex-col gap-4 pb-4 pt-4">
            <div className="mx-4 rounded-2xl border border-amber-400/30 animate-power-play-pulse">
              <div className="flex flex-col items-center gap-3 px-6 py-5">
                <div className="flex items-center gap-2">
                  <Zap className="h-6 w-6" style={{ color: "oklch(0.82 0.2 85)" }} />
                  <p
                    className="font-display text-2xl font-black uppercase"
                    style={{
                      color: "oklch(0.82 0.2 85)",
                      textShadow: "0 0 24px oklch(0.82 0.2 85 / 0.5)",
                    }}
                  >
                    Power Play!
                  </p>
                  <Zap className="h-6 w-6" style={{ color: "oklch(0.82 0.2 85)" }} />
                </div>
                <p className="font-body text-sm text-text-muted">Only you can answer this one</p>
              </div>
            </div>
            <NumberInput
              min={5}
              max={maxWager}
              label="Set your wager:"
              onSubmit={handlePowerPlayWagerSubmit}
            />
          </div>
        );
      }
      return <WaitingScreen phase={phase} gameId="brain-board" />;
    }

    // ── Power Play Answer ──
    if (phase === "power-play-answer") {
      if (pd.isPowerPlayPlayer) {
        const clueQ = typeof pd.clueQuestion === "string" ? pd.clueQuestion : "";
        return (
          <div className="flex flex-col gap-4 pb-4 pt-4">
            <div className="mx-4 rounded-2xl border border-amber-400/30 animate-power-play-pulse">
              <div className="flex flex-col items-center gap-2 px-6 py-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5" style={{ color: "oklch(0.82 0.2 85)" }} />
                  <p
                    className="font-display text-xl font-black uppercase"
                    style={{
                      color: "oklch(0.82 0.2 85)",
                      textShadow: "0 0 24px oklch(0.82 0.2 85 / 0.5)",
                    }}
                  >
                    Power Play!
                  </p>
                </div>
                {clueQ && (
                  <p className="text-center font-body text-sm text-text-primary">{clueQ}</p>
                )}
              </div>
            </div>
            <TextInput
              prompt="Your answer:"
              placeholder="Answer..."
              onSubmit={handlePowerPlayAnswer}
              resetNonce={errorNonce}
            />
          </div>
        );
      }
      return <WaitingScreen phase={phase} gameId="brain-board" />;
    }

    // ── Clue Result ──
    if (phase === "clue-result") {
      const clueResultEvent = (gameEvents?.["clue-result"] ?? null) as {
        results?: ClueResultEntry[];
        correctAnswer?: string;
        question?: string;
        value?: number;
        isPowerPlay?: boolean;
      } | null;
      if (clueResultEvent?.results && clueResultEvent.correctAnswer) {
        return (
          <BrainBoardClueResult
            clueResult={{
              results: clueResultEvent.results,
              correctAnswer: clueResultEvent.correctAnswer,
              question: clueResultEvent.question ?? "",
              value: clueResultEvent.value ?? 0,
              isPowerPlay: clueResultEvent.isPowerPlay ?? false,
            }}
            players={players}
            mySessionId={mySessionId}
          />
        );
      }
      return <WaitingScreen phase={phase} gameId="brain-board" />;
    }

    // ── Round Transition ──
    if (phase === "round-transition") {
      return (
        <div className="flex flex-col items-center gap-6 px-4 pb-4 pt-8">
          <GlassPanel
            glow
            glowColor="oklch(0.82 0.18 85 / 0.3)"
            className="flex flex-col items-center gap-4 px-8 py-8"
          >
            <p
              className="font-display text-3xl font-black uppercase"
              style={{
                color: "oklch(0.82 0.18 85)",
                textShadow: "0 0 32px oklch(0.82 0.18 85 / 0.6)",
              }}
            >
              Double Down!
            </p>
            <p className="font-body text-sm text-text-muted">
              Values are doubled. Stakes are higher.
            </p>
          </GlassPanel>
          {bbStandings.length > 0 && (
            <BrainBoardStandings
              standings={bbStandings}
              players={players}
              mySessionId={mySessionId}
              currentRound={2}
              doubleDownValues
            />
          )}
        </div>
      );
    }

    // ── All-In Category ──
    if (phase === "all-in-category") {
      return (
        <div className="flex flex-col items-center gap-4 px-4 pb-4 pt-8">
          <GlassPanel
            glow
            glowColor="oklch(0.68 0.22 265 / 0.3)"
            className="flex flex-col items-center gap-4 px-8 py-8 animate-all-in-glow"
          >
            <p
              className="font-display text-2xl font-black uppercase text-accent-brainboard"
              style={{ textShadow: "0 0 24px oklch(0.68 0.22 265 / 0.5)" }}
            >
              All-In Round
            </p>
            <p className="font-body text-sm text-text-muted">
              One final question. Wager everything.
            </p>
          </GlassPanel>
        </div>
      );
    }

    // ── All-In Wager ──
    if (phase === "all-in-wager") {
      if (pd.canWagerFinal) {
        const playerScore = typeof pd.score === "number" ? pd.score : 0;
        const allInCat = typeof pd.allInCategory === "string" ? pd.allInCategory : "";
        return (
          <div className="flex flex-col gap-4 pb-4 pt-4">
            <div className="mx-4 rounded-2xl border border-accent-brainboard/30 animate-all-in-glow">
              <div className="flex flex-col items-center gap-2 px-6 py-5">
                <p
                  className="font-display text-2xl font-black uppercase text-accent-brainboard"
                  style={{ textShadow: "0 0 24px oklch(0.68 0.22 265 / 0.5)" }}
                >
                  All-In Round
                </p>
                {allInCat && (
                  <p className="font-display text-sm font-bold text-accent-brainboard uppercase">
                    {allInCat}
                  </p>
                )}
                <p className="font-body text-xs text-text-muted">Risk it all on one final clue</p>
              </div>
            </div>
            <NumberInput
              min={0}
              max={playerScore}
              label="Set your wager:"
              onSubmit={handleAllInWager}
            />
          </div>
        );
      }
      return <WaitingScreen phase={phase} gameId="brain-board" />;
    }

    // ── All-In Answer ──
    if (phase === "all-in-answer") {
      if (pd.canAnswerFinal) {
        const allInCat = typeof pd.allInCategory === "string" ? pd.allInCategory : "";
        const allInQ = typeof gs.allInQuestion === "string" ? gs.allInQuestion : "";
        return (
          <div className="flex flex-col gap-4 pb-4 pt-4">
            <div className="mx-4 rounded-2xl border border-accent-brainboard/30 animate-all-in-glow">
              <div className="flex flex-col items-center gap-2 px-6 py-4">
                <p
                  className="font-display text-xl font-black uppercase text-accent-brainboard"
                  style={{ textShadow: "0 0 24px oklch(0.68 0.22 265 / 0.5)" }}
                >
                  All-In Round
                </p>
                {allInCat && (
                  <p className="font-display text-xs font-bold text-accent-brainboard uppercase">
                    {allInCat}
                  </p>
                )}
                {allInQ && (
                  <p className="text-center font-body text-sm text-text-primary">{allInQ}</p>
                )}
              </div>
            </div>
            <TextInput
              prompt="Your answer:"
              placeholder="Answer..."
              onSubmit={handleAllInAnswer}
              resetNonce={errorNonce}
            />
          </div>
        );
      }
      return <WaitingScreen phase={phase} gameId="brain-board" />;
    }

    // ── All-In Reveal ──
    if (phase === "all-in-reveal") {
      const allInRevealEvent = (gameEvents?.["all-in-reveal"] ?? null) as {
        results?: Array<{
          sessionId: string;
          answer: string;
          correct: boolean;
          delta: number;
          wager?: number;
        }>;
        correctAnswer?: string;
        question?: string;
      } | null;
      if (allInRevealEvent?.results && allInRevealEvent.correctAnswer) {
        return (
          <BrainBoardClueResult
            clueResult={{
              results: allInRevealEvent.results.map((r) => ({
                ...r,
                judgedBy: undefined,
                judgeExplanation: undefined,
              })),
              correctAnswer: allInRevealEvent.correctAnswer,
              question: allInRevealEvent.question ?? "",
              value: 0,
              isPowerPlay: false,
            }}
            players={players}
            mySessionId={mySessionId}
          />
        );
      }
      return <WaitingScreen phase={phase} gameId="brain-board" />;
    }

    // ── Final Scores ──
    if (phase === "final-scores") {
      return (
        <div className="flex flex-col gap-4 pb-4 pt-2">
          {bbStandings.length > 0 && (
            <BrainBoardStandings
              standings={bbStandings}
              players={players}
              mySessionId={mySessionId}
              currentRound={currentRound}
              doubleDownValues={doubleDownValues}
            />
          )}
        </div>
      );
    }

    // ── Default ──
    return <WaitingScreen phase={phase} gameId="brain-board" />;
  }

  // ─── Layout ──────────────────────────────────────────────────────

  // For final-scores, render full-screen (no split)
  if (phase === "final-scores") {
    return (
      <div className="flex min-h-dvh flex-col">
        {renderBoard()}
        <div className="border-t border-white/10 bg-bg-deep/80 backdrop-blur-sm p-4">
          {renderControls()}
        </div>
      </div>
    );
  }

  return (
    <GameBoard
      board={renderBoard()}
      controls={
        <>
          <PlayerStatus
            turnPlayerName={selectorName}
            isMyTurn={isMyTurn}
            message={
              phase === "answering"
                ? pd.hasAnswered
                  ? "Answer locked in!"
                  : "Answer now!"
                : phase === "topic-chat"
                  ? "Chat with AI about topics"
                  : undefined
            }
          />
          {renderControls()}
        </>
      }
    />
  );
}
