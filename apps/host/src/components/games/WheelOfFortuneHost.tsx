"use client";

import type { PlayerData } from "@flimflam/shared";
import { AVATAR_COLORS } from "@flimflam/shared";
import { ConfettiBurst, GlassPanel } from "@flimflam/ui";
import type { Room } from "colyseus.js";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { FinalScoresLayout, buildScores } from "../game/FinalScoresLayout";
import { Timer } from "../game/Timer";

// ─── Game data shapes ───────────────────────────────────────────────────────

interface WheelStanding {
  sessionId: string;
  roundCash: number;
  totalCash: number;
}

interface SpinSegment {
  type: "cash" | "bankrupt" | "lose-a-turn" | "free-play";
  value: number;
  label: string;
}

interface WheelGameState {
  phase: string;
  round: number;
  totalRounds: number;
  category: string;
  hint: string;
  puzzleDisplay: string;
  currentTurnSessionId: string | null;
  standings: WheelStanding[];
  consonantsRemaining: string[];
  vowelsRemaining: string[];
  freePlayActive: boolean;
  lastSpinResult: { segment: SpinSegment } | null;
  bonusPlayerSessionId: string | null;
  bonusSolved: boolean;
  revealedLetters: string[];
}

interface LetterResultData {
  letter: string;
  count: number;
  inPuzzle: boolean;
  earned: number;
  puzzleDisplay: string;
  vowelCost?: number;
}

interface SpinResultData {
  segment: SpinSegment;
  angle: number;
}

interface RoundResultData {
  winnerId: string | null;
  answer: string;
  category: string;
  roundCashEarned: number;
  standings: WheelStanding[];
}

interface BonusRevealData {
  solved: boolean;
  answer: string;
  bonusPrize: number;
  bonusPlayerId: string | null;
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

// ─── Puzzle Board ───────────────────────────────────────────────────────────

function PuzzleBoard({
  display,
  category,
  highlightLetters,
}: {
  display: string;
  category: string;
  highlightLetters?: Set<string>;
}) {
  // Build cells from the display string, preserving word boundaries
  const cells: Array<{ char: string; pos: number; isSpace: boolean }> = [];
  for (let pos = 0; pos < display.length; pos++) {
    const ch = display[pos] ?? "";
    cells.push({ char: ch, pos, isSpace: ch === " " });
  }

  // Group cells into words (split by spaces)
  const wordGroups: Array<typeof cells> = [];
  let current: typeof cells = [];
  for (const cell of cells) {
    if (cell.isSpace) {
      if (current.length > 0) wordGroups.push(current);
      current = [];
    } else {
      current.push(cell);
    }
  }
  if (current.length > 0) wordGroups.push(current);

  return (
    <div className="flex flex-col items-center gap-4">
      <span className="font-display text-[clamp(18px,2vw,28px)] text-accent-wheel uppercase tracking-widest">
        {category}
      </span>
      <div className="flex flex-wrap justify-center gap-2">
        {wordGroups.map((wordCells) => {
          const wordKey = wordCells.map((c) => `${c.pos}`).join("-");
          return (
            <div key={wordKey} className="flex gap-1">
              {wordCells.map((cell) => {
                const ch = cell.char;
                const isLetter = /[A-Z_]/.test(ch);
                const isBlank = ch === "_";
                const isHighlighted = highlightLetters?.has(ch.toUpperCase()) ?? false;
                const cellKey = `cell-${cell.pos}`;

                if (!isLetter) {
                  // punctuation / special chars
                  return (
                    <span
                      key={cellKey}
                      className="font-display text-[clamp(28px,4vw,56px)] text-text-muted"
                    >
                      {ch}
                    </span>
                  );
                }

                return (
                  <motion.div
                    key={cellKey}
                    className={`flex items-center justify-center rounded-md border-2 ${
                      isBlank
                        ? "border-accent-wheel/30 bg-white/10"
                        : isHighlighted
                          ? "border-accent-wheel bg-accent-wheel/30"
                          : "border-accent-wheel/50 bg-bg-elevated"
                    }`}
                    style={{
                      width: "clamp(36px, 5vw, 64px)",
                      height: "clamp(44px, 6vw, 76px)",
                    }}
                    animate={
                      isHighlighted
                        ? { scale: [1, 1.15, 1], transition: { duration: 0.5 } }
                        : undefined
                    }
                  >
                    {!isBlank && (
                      <span
                        className="font-display font-bold text-text-primary"
                        style={{ fontSize: "clamp(24px, 3.5vw, 48px)" }}
                      >
                        {ch}
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Wheel Spinner Visual ───────────────────────────────────────────────────

function WheelSpinner({
  spinning,
  angle,
}: {
  spinning: boolean;
  angle: number;
}) {
  const segments = [
    { color: "#2563eb", label: "$500" },
    { color: "#dc2626", label: "BANKRUPT" },
    { color: "#16a34a", label: "$600" },
    { color: "#eab308", label: "$700" },
    { color: "#7c3aed", label: "$800" },
    { color: "#0891b2", label: "$300" },
    { color: "#ea580c", label: "LOSE" },
    { color: "#059669", label: "$900" },
    { color: "#2563eb", label: "$400" },
    { color: "#dc2626", label: "BANKRUPT" },
    { color: "#f59e0b", label: "$1000" },
    { color: "#6366f1", label: "FREE" },
  ];
  const segAngle = 360 / segments.length;

  return (
    <div className="relative" style={{ width: 280, height: 280 }}>
      {/* Pointer */}
      <div
        className="absolute -top-3 left-1/2 z-10 -translate-x-1/2"
        style={{
          width: 0,
          height: 0,
          borderLeft: "14px solid transparent",
          borderRight: "14px solid transparent",
          borderTop: "28px solid oklch(0.82 0.2 85)",
          filter: "drop-shadow(0 2px 6px oklch(0 0 0 / 0.5))",
        }}
      />
      {/* Wheel */}
      <motion.div
        className="h-full w-full rounded-full border-4 border-accent-wheel/50 overflow-hidden"
        animate={{ rotate: spinning ? angle + 1800 : angle }}
        transition={spinning ? { duration: 3, ease: [0.2, 0.8, 0.3, 1] } : { duration: 0 }}
        style={{ transformOrigin: "center center" }}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full">
          <title>Wheel of Fortune spinner</title>
          {segments.map((seg, i) => {
            const startAngle = (i * segAngle * Math.PI) / 180;
            const endAngle = ((i + 1) * segAngle * Math.PI) / 180;
            const x1 = 100 + 100 * Math.cos(startAngle);
            const y1 = 100 + 100 * Math.sin(startAngle);
            const x2 = 100 + 100 * Math.cos(endAngle);
            const y2 = 100 + 100 * Math.sin(endAngle);
            const largeArc = segAngle > 180 ? 1 : 0;

            const midAngle = ((i + 0.5) * segAngle * Math.PI) / 180;
            const textX = 100 + 60 * Math.cos(midAngle);
            const textY = 100 + 60 * Math.sin(midAngle);
            const textRot = (i + 0.5) * segAngle;

            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: static wheel segments never reorder
              <g key={`seg-${i}`}>
                <path
                  d={`M100,100 L${x1},${y1} A100,100 0 ${largeArc},1 ${x2},${y2} Z`}
                  fill={seg.color}
                  stroke="oklch(0.12 0.025 248)"
                  strokeWidth="1"
                />
                <text
                  x={textX}
                  y={textY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="7"
                  fontWeight="bold"
                  transform={`rotate(${textRot}, ${textX}, ${textY})`}
                >
                  {seg.label}
                </text>
              </g>
            );
          })}
        </svg>
      </motion.div>
    </div>
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface WheelOfFortuneHostProps {
  phase: string;
  round: number;
  totalRounds: number;
  players: PlayerData[];
  payload: Record<string, unknown>;
  timerEndTime: number | null;
  room: Room | null;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function WheelOfFortuneHost({
  phase,
  players,
  timerEndTime,
  room,
}: WheelOfFortuneHostProps) {
  const [gameState, setGameState] = useState<WheelGameState | null>(null);
  const [letterResult, setLetterResult] = useState<LetterResultData | null>(null);
  const [spinResult, setSpinResult] = useState<SpinResultData | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [roundResult, setRoundResult] = useState<RoundResultData | null>(null);
  const [bonusReveal, setBonusReveal] = useState<BonusRevealData | null>(null);
  const [highlightLetters, setHighlightLetters] = useState<Set<string>>(new Set());

  const handleMessage = useCallback((data: Record<string, unknown>) => {
    const type = data.type as string | undefined;
    const action = data.action as string | undefined;

    if (type === "game-state" || action === "game-state") {
      setGameState(data as unknown as WheelGameState);
    } else if (type === "letter-result") {
      const lr = data as unknown as LetterResultData;
      setLetterResult(lr);
      if (lr.inPuzzle) {
        setHighlightLetters(new Set([lr.letter]));
        setTimeout(() => setHighlightLetters(new Set()), 2000);
      }
    } else if (type === "spin-result") {
      setSpinResult(data as unknown as SpinResultData);
      setIsSpinning(true);
      setTimeout(() => setIsSpinning(false), 3500);
    } else if (type === "round-result") {
      setRoundResult(data as unknown as RoundResultData);
    } else if (type === "bonus-reveal") {
      setBonusReveal(data as unknown as BonusRevealData);
    } else if (type === "bonus-letters-revealed") {
      const letters = (data.letters as string[]) ?? [];
      setHighlightLetters(new Set(letters));
      setTimeout(() => setHighlightLetters(new Set()), 2000);
    }
  }, []);

  useEffect(() => {
    if (!room) return;
    room.onMessage("game-data", handleMessage);
  }, [room, handleMessage]);

  if (!gameState) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-display text-[48px] text-accent-wheel animate-glow-pulse">
          Loading Wheel of Fortune...
        </p>
      </div>
    );
  }

  // ── Standings bar ─────────────────────────────────────────────────────
  const standingsBar = (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {gameState.standings.map((s) => {
        const name = getPlayerName(players, s.sessionId);
        const color = getPlayerColor(players, s.sessionId);
        const isCurrent = s.sessionId === gameState.currentTurnSessionId;

        return (
          <div
            key={s.sessionId}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 transition-all ${
              isCurrent ? "bg-accent-wheel/15 border border-accent-wheel/30" : ""
            }`}
          >
            <PlayerAvatar name={name} color={color} size={32} />
            <span className="font-body text-[18px] text-text-primary">{name}</span>
            <span className="font-mono text-[18px] text-accent-wheel">
              ${s.totalCash.toLocaleString()}
            </span>
            {s.roundCash > 0 && (
              <span className="font-mono text-[14px] text-text-muted">
                (${s.roundCash.toLocaleString()})
              </span>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Round Intro ─────────────────────────────────────────────────────────
  if (phase === "round-intro") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
        <motion.h1
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 100 }}
          className="font-display text-[clamp(48px,7vw,80px)] font-black text-accent-wheel"
          style={{
            textShadow: "0 0 30px oklch(0.78 0.2 85 / 0.5), 0 0 60px oklch(0.78 0.2 85 / 0.2)",
          }}
        >
          ROUND {gameState.round}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassPanel glow glowColor="oklch(0.78 0.2 85 / 0.3)" className="px-12 py-6">
            <span className="font-display text-[clamp(24px,3vw,40px)] text-accent-wheel uppercase tracking-wider">
              {gameState.category}
            </span>
          </GlassPanel>
        </motion.div>

        {gameState.hint && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="font-body text-[clamp(20px,2.5vw,32px)] text-text-muted italic"
          >
            Hint: {gameState.hint}
          </motion.span>
        )}
      </div>
    );
  }

  // ── Spinning ────────────────────────────────────────────────────────────
  if (phase === "spinning") {
    const currentName = getPlayerName(players, gameState.currentTurnSessionId);
    const currentColor = getPlayerColor(players, gameState.currentTurnSessionId);
    const lastSpin = gameState.lastSpinResult;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <PuzzleBoard
          display={gameState.puzzleDisplay}
          category={gameState.category}
          highlightLetters={highlightLetters}
        />

        <div className="flex items-center gap-6 mt-4">
          <WheelSpinner spinning={isSpinning} angle={spinResult?.angle ?? 0} />

          <div className="flex flex-col items-center gap-3">
            <PlayerAvatar name={currentName} color={currentColor} size={72} />
            <span className="font-display text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary">
              {currentName}
            </span>
            {lastSpin && !isSpinning && (
              <span
                className={`font-display text-[clamp(24px,3vw,36px)] font-bold ${
                  lastSpin.segment.type === "bankrupt"
                    ? "text-accent-6"
                    : lastSpin.segment.type === "lose-a-turn"
                      ? "text-warning"
                      : lastSpin.segment.type === "free-play"
                        ? "text-success"
                        : "text-accent-wheel"
                }`}
              >
                {lastSpin.segment.label}
              </span>
            )}
            {!lastSpin && !isSpinning && (
              <span className="font-body text-[clamp(20px,2.5vw,28px)] text-text-muted">
                Spin, buy a vowel, or solve!
              </span>
            )}
          </div>
        </div>

        {standingsBar}
      </div>
    );
  }

  // ── Guess Consonant ─────────────────────────────────────────────────────
  if (phase === "guess-consonant") {
    const currentName = getPlayerName(players, gameState.currentTurnSessionId);
    const currentColor = getPlayerColor(players, gameState.currentTurnSessionId);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <PuzzleBoard display={gameState.puzzleDisplay} category={gameState.category} />

        <div className="flex items-center gap-4 mt-4">
          <PlayerAvatar name={currentName} color={currentColor} size={56} />
          <span className="font-display text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary">
            {currentName}
          </span>
        </div>

        <motion.span
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
          className="font-display text-[clamp(24px,3vw,36px)] text-accent-wheel"
        >
          Pick a consonant!
        </motion.span>

        {gameState.freePlayActive && (
          <span className="font-display text-[clamp(20px,2.5vw,28px)] text-success font-bold">
            FREE PLAY!
          </span>
        )}

        {standingsBar}
      </div>
    );
  }

  // ── Buy Vowel ───────────────────────────────────────────────────────────
  if (phase === "buy-vowel") {
    const currentName = getPlayerName(players, gameState.currentTurnSessionId);
    const currentColor = getPlayerColor(players, gameState.currentTurnSessionId);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <PuzzleBoard display={gameState.puzzleDisplay} category={gameState.category} />

        <div className="flex items-center gap-4 mt-4">
          <PlayerAvatar name={currentName} color={currentColor} size={56} />
          <span className="font-display text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary">
            {currentName}
          </span>
        </div>

        <motion.span
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
          className="font-display text-[clamp(24px,3vw,36px)] text-accent-wheel"
        >
          Buying a vowel... ($250)
        </motion.span>

        {standingsBar}
      </div>
    );
  }

  // ── Solve Attempt ───────────────────────────────────────────────────────
  if (phase === "solve-attempt") {
    const currentName = getPlayerName(players, gameState.currentTurnSessionId);
    const currentColor = getPlayerColor(players, gameState.currentTurnSessionId);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <PuzzleBoard display={gameState.puzzleDisplay} category={gameState.category} />

        <div className="flex items-center gap-4 mt-4">
          <PlayerAvatar name={currentName} color={currentColor} size={56} />
          <span className="font-display text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary">
            {currentName}
          </span>
        </div>

        <motion.span
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
          className="font-display text-[clamp(24px,3vw,36px)] text-accent-wheel"
        >
          Solving the puzzle...
        </motion.span>

        {standingsBar}
      </div>
    );
  }

  // ── Letter Result ───────────────────────────────────────────────────────
  if (phase === "letter-result" && letterResult) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <PuzzleBoard
          display={letterResult.puzzleDisplay}
          category={gameState.category}
          highlightLetters={highlightLetters}
        />

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="flex flex-col items-center gap-3"
        >
          <div
            className={`flex items-center justify-center rounded-xl border-4 ${
              letterResult.inPuzzle
                ? "border-success bg-success/15"
                : "border-accent-6 bg-accent-6/15"
            }`}
            style={{ width: 96, height: 96 }}
          >
            <span className="font-display text-[56px] font-black text-text-primary">
              {letterResult.letter}
            </span>
          </div>

          {letterResult.inPuzzle ? (
            <span className="font-display text-[clamp(24px,3vw,36px)] text-success font-bold">
              {letterResult.count} {letterResult.count === 1 ? "time" : "times"}!
              {letterResult.earned > 0 && ` +$${letterResult.earned.toLocaleString()}`}
            </span>
          ) : (
            <span className="font-display text-[clamp(24px,3vw,36px)] text-accent-6 font-bold">
              Not in the puzzle!
            </span>
          )}

          {letterResult.vowelCost !== undefined && (
            <span className="font-body text-[clamp(18px,2vw,24px)] text-text-muted">
              Vowel cost: -${letterResult.vowelCost}
            </span>
          )}
        </motion.div>

        {standingsBar}
      </div>
    );
  }

  // ── Round Result ────────────────────────────────────────────────────────
  if (phase === "round-result" && roundResult) {
    const winnerName = roundResult.winnerId ? getPlayerName(players, roundResult.winnerId) : null;
    const winnerColor = roundResult.winnerId
      ? getPlayerColor(players, roundResult.winnerId)
      : "#999";

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-[clamp(28px,3.5vw,44px)] text-accent-wheel uppercase tracking-wider"
        >
          Round {gameState.round} Complete!
        </motion.h2>

        <GlassPanel glow glowColor="oklch(0.78 0.2 85 / 0.3)" className="px-12 py-8">
          <span className="font-display text-[clamp(32px,4.5vw,56px)] font-bold text-text-primary">
            {roundResult.answer}
          </span>
        </GlassPanel>

        {winnerName && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="flex items-center gap-4"
          >
            <PlayerAvatar name={winnerName} color={winnerColor} size={64} />
            <span className="font-display text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary">
              {winnerName} wins!
            </span>
            <span className="font-mono text-[clamp(24px,3vw,36px)] font-bold text-success">
              +${roundResult.roundCashEarned.toLocaleString()}
            </span>
          </motion.div>
        )}

        {!winnerName && (
          <span className="font-display text-[clamp(28px,3.5vw,40px)] text-text-muted">
            No one solved it!
          </span>
        )}

        <ConfettiBurst trigger={!!winnerName} preset="correct" />

        {standingsBar}
      </div>
    );
  }

  // ── Bonus Round ─────────────────────────────────────────────────────────
  if (phase === "bonus-round") {
    const bonusName = getPlayerName(players, gameState.bonusPlayerSessionId);
    const bonusColor = getPlayerColor(players, gameState.bonusPlayerSessionId);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <motion.h1
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          className="font-display text-[clamp(40px,5.5vw,64px)] font-black text-accent-wheel"
          style={{
            textShadow: "0 0 30px oklch(0.78 0.2 85 / 0.5)",
          }}
        >
          BONUS ROUND
        </motion.h1>

        <PuzzleBoard
          display={gameState.puzzleDisplay}
          category={gameState.category}
          highlightLetters={highlightLetters}
        />

        <div className="flex items-center gap-4 mt-2">
          <PlayerAvatar name={bonusName} color={bonusColor} size={64} />
          <span className="font-display text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary">
            {bonusName}
          </span>
        </div>

        {timerEndTime && <Timer endTime={timerEndTime} size={120} />}
      </div>
    );
  }

  // ── Bonus Reveal ────────────────────────────────────────────────────────
  if (phase === "bonus-reveal" && bonusReveal) {
    const bonusName = getPlayerName(players, bonusReveal.bonusPlayerId);
    const bonusColor = getPlayerColor(players, bonusReveal.bonusPlayerId);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
        <h1
          className="font-display text-[clamp(40px,5.5vw,64px)] font-black text-accent-wheel"
          style={{ textShadow: "0 0 24px oklch(0.78 0.2 85 / 0.4)" }}
        >
          BONUS ROUND
        </h1>

        <GlassPanel
          glow
          glowColor={
            bonusReveal.solved ? "oklch(0.68 0.18 150 / 0.4)" : "oklch(0.68 0.25 20 / 0.3)"
          }
          className="px-12 py-8"
        >
          <span className="font-display text-[clamp(32px,4.5vw,56px)] font-bold text-text-primary">
            {bonusReveal.answer}
          </span>
        </GlassPanel>

        <div className="flex items-center gap-4">
          <PlayerAvatar name={bonusName} color={bonusColor} size={64} />
          <span className="font-display text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary">
            {bonusName}
          </span>
        </div>

        {bonusReveal.solved ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 150 }}
            className="flex flex-col items-center gap-2"
          >
            <span className="font-display text-[clamp(36px,4.5vw,56px)] font-black text-success">
              SOLVED IT!
            </span>
            <span className="font-mono text-[clamp(28px,3.5vw,44px)] font-bold text-accent-wheel">
              +${bonusReveal.bonusPrize.toLocaleString()}
            </span>
          </motion.div>
        ) : (
          <span className="font-display text-[clamp(32px,4vw,48px)] text-accent-6 font-bold">
            Not this time!
          </span>
        )}

        <ConfettiBurst trigger={bonusReveal.solved} preset="win" />
      </div>
    );
  }

  // ── Final Scores ────────────────────────────────────────────────────────
  if (phase === "final-scores") {
    const scores = buildScores(players);
    return (
      <FinalScoresLayout
        scores={scores}
        accentColorClass="text-accent-wheel"
        gameId="wheel-of-fortune"
        room={room}
      />
    );
  }

  // ── Fallback ────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="font-display text-[48px] text-text-muted">Wheel of Fortune: {phase}</p>
    </div>
  );
}
