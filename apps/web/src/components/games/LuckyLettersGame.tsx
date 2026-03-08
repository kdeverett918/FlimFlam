"use client";

import type { PlayerData } from "@flimflam/shared";
import { AVATAR_COLORS, generateAwards } from "@flimflam/shared";
import {
  ANIMATION_DURATIONS,
  ANIMATION_EASINGS,
  AnimatedCounter,
  ConfettiBurst,
  GlassPanel,
  emitAudioEvent,
  emitMotionEvent,
  sounds,
  useReducedMotion,
} from "@flimflam/ui";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FinalScoresLayout, buildScores } from "@/components/game/FinalScoresLayout";
import { GameBoard } from "@/components/game/GameBoard";
import { PlayerStatus } from "@/components/game/PlayerStatus";

// Controls
import { CategoryVoteCards } from "@/components/controls/CategoryVoteCards";
import { LetterPicker } from "@/components/controls/LetterPicker";
import { LetterResult as MobileLetterResult } from "@/components/controls/LetterResult";
import { MobileWheel } from "@/components/controls/MobileWheel";
import { PuzzleBoard as MobilePuzzleBoard } from "@/components/controls/PuzzleBoard";
import { SpinResult as MobileSpinResult } from "@/components/controls/SpinResult";
import { Standings as MobileStandings } from "@/components/controls/Standings";
import { TextInput } from "@/components/controls/TextInput";
import { WaitingScreen } from "@/components/game/WaitingScreen";

// ─── Types ──────────────────────────────────────────────────────────────────

interface LuckyLettersGameProps {
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

interface WheelStanding {
  sessionId: string;
  roundCash: number;
  totalCash: number;
}

interface SpinSegment {
  type: "cash" | "bust" | "pass" | "wild";
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
  wildActive: boolean;
  lastSpinResult: { segment: SpinSegment } | null;
  bonusPlayerSessionId: string | null;
  bonusSolved: boolean;
  revealedLetters: string[];
  availableCategories?: string[];
  selectedCategories?: string[];
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
  solveBonusAwarded?: number;
  standings: WheelStanding[];
}

interface BonusRevealData {
  solved: boolean;
  answer: string;
  bonusPrize: number;
  bonusPlayerId: string | null;
}

const BONUS_REVEAL_ACTIVE_MS =
  process.env.NEXT_PUBLIC_FLIMFLAM_E2E === "1" || process.env.FLIMFLAM_E2E === "1" ? 2_500 : 5_200;

interface CategoryVoteTally {
  voteCounts: Record<string, number>;
  totalVoters: number;
  votedCount: number;
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

// ─── Host Puzzle Board (TV-quality) ─────────────────────────────────────────

function HostPuzzleBoard({
  display,
  category,
  highlightLetters,
  reducedMotion = false,
}: { display: string; category: string; highlightLetters?: Set<string>; reducedMotion?: boolean }) {
  const cells: Array<{ char: string; pos: number; isSpace: boolean }> = [];
  for (let pos = 0; pos < display.length; pos++) {
    const ch = display[pos] ?? "";
    cells.push({ char: ch, pos, isSpace: ch === " " });
  }
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
      <span className="font-display text-[clamp(18px,2vw,28px)] text-accent-luckyletters uppercase tracking-widest">
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
                    data-testid="lucky-letter-tile"
                    data-reveal-style={reducedMotion ? "fade" : "flip"}
                    className={`relative flex items-center justify-center overflow-hidden rounded-md border-2 ${isBlank ? "border-accent-luckyletters/30 bg-white/10" : isHighlighted ? "border-accent-luckyletters bg-accent-luckyletters/30" : "border-accent-luckyletters/50 bg-bg-elevated"}`}
                    style={{ width: "clamp(36px, 5vw, 64px)", height: "clamp(44px, 6vw, 76px)" }}
                    animate={
                      isHighlighted
                        ? reducedMotion
                          ? {
                              opacity: [1, 0.82, 1],
                              transition: { duration: ANIMATION_DURATIONS.reveal },
                            }
                          : {
                              scale: [1, 1.18, 1],
                              rotateX: [0, -8, 0],
                              boxShadow: [
                                "0 0 0 rgba(245, 158, 11, 0)",
                                "0 0 30px rgba(245, 158, 11, 0.55)",
                                "0 0 14px rgba(245, 158, 11, 0.18)",
                              ],
                              transition: {
                                duration: 0.72,
                                ease: ANIMATION_EASINGS.crispOut,
                                delay: (cell.pos % 6) * 0.04,
                              },
                            }
                        : undefined
                    }
                  >
                    {isHighlighted && !reducedMotion && (
                      <motion.div
                        aria-hidden="true"
                        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.6),rgba(255,255,255,0))]"
                        initial={{ opacity: 0, scale: 0.4 }}
                        animate={{
                          opacity: [0, 0.9, 0],
                          scale: [0.45, 1.15, 1.45],
                        }}
                        transition={{
                          duration: 0.6,
                          ease: ANIMATION_EASINGS.crispOut,
                          delay: (cell.pos % 6) * 0.04,
                        }}
                      />
                    )}
                    {!isBlank && (
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={`${cellKey}-${ch}`}
                          initial={
                            reducedMotion
                              ? { opacity: 0 }
                              : { rotateX: -110, opacity: 0, scale: 0.8, y: 8 }
                          }
                          animate={
                            reducedMotion
                              ? { opacity: 1 }
                              : { rotateX: 0, opacity: 1, scale: 1, y: 0 }
                          }
                          exit={
                            reducedMotion
                              ? { opacity: 0 }
                              : { rotateX: 110, opacity: 0, scale: 0.92, y: -6 }
                          }
                          transition={{
                            duration: reducedMotion
                              ? ANIMATION_DURATIONS.standard
                              : ANIMATION_DURATIONS.reveal,
                            ease: reducedMotion
                              ? ANIMATION_EASINGS.smoothInOut
                              : ANIMATION_EASINGS.crispOut,
                            delay:
                              !reducedMotion && isHighlighted ? (cell.pos % 6) * 0.04 + 0.04 : 0,
                          }}
                          className="font-display font-bold text-text-primary"
                          style={{
                            fontSize: "clamp(24px, 3.5vw, 48px)",
                            transformOrigin: reducedMotion ? undefined : "center bottom",
                          }}
                        >
                          {ch}
                        </motion.span>
                      </AnimatePresence>
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

// ─── Host Wheel Spinner ─────────────────────────────────────────────────────

const CASH_COLORS = [
  "#16a34a",
  "#059669",
  "#2563eb",
  "#0891b2",
  "#15803d",
  "#0d9488",
  "#2563eb",
  "#0891b2",
];
function getSegmentColor(type: string, cashIndex: number): string {
  switch (type) {
    case "bust":
      return "#dc2626";
    case "pass":
      return "#ea580c";
    case "wild":
      return "#7c3aed";
    default:
      return CASH_COLORS[cashIndex % CASH_COLORS.length] ?? "#16a34a";
  }
}

const WHEEL_VISUAL_SEGMENTS: Array<{ type: string; label: string; color: string }> = (() => {
  const segments = [
    { type: "cash", label: "$500" },
    { type: "cash", label: "$550" },
    { type: "cash", label: "$600" },
    { type: "cash", label: "$650" },
    { type: "cash", label: "$700" },
    { type: "cash", label: "$800" },
    { type: "cash", label: "$900" },
    { type: "cash", label: "$2,500" },
    { type: "bust", label: "BUST" },
    { type: "cash", label: "$500" },
    { type: "cash", label: "$600" },
    { type: "cash", label: "$700" },
    { type: "cash", label: "$300" },
    { type: "cash", label: "$450" },
    { type: "cash", label: "$350" },
    { type: "wild", label: "WILD" },
    { type: "cash", label: "$500" },
    { type: "cash", label: "$850" },
    { type: "cash", label: "$550" },
    { type: "pass", label: "PASS" },
    { type: "cash", label: "$650" },
    { type: "cash", label: "$750" },
    { type: "bust", label: "BUST" },
    { type: "cash", label: "$400" },
  ];
  let cashIdx = 0;
  return segments.map((s) => {
    const color = getSegmentColor(s.type, cashIdx);
    if (s.type === "cash") cashIdx++;
    return { ...s, color };
  });
})();

function HostWheelSpinner({
  spinning,
  angle,
  landed,
}: { spinning: boolean; angle: number; landed?: { type: string; label: string } | null }) {
  const segments = WHEEL_VISUAL_SEGMENTS;
  const segAngle = 360 / segments.length;
  const wheelSize = 420;
  return (
    <div
      className="relative"
      style={{ width: wheelSize, height: wheelSize }}
      data-testid="lucky-wheel"
    >
      <div
        className="absolute -top-4 left-1/2 z-10 -translate-x-1/2"
        style={{
          width: 0,
          height: 0,
          borderLeft: "16px solid transparent",
          borderRight: "16px solid transparent",
          borderTop: "34px solid oklch(0.82 0.2 85)",
          filter: "drop-shadow(0 3px 8px oklch(0 0 0 / 0.6))",
        }}
      />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow: spinning
            ? "0 0 60px oklch(0.82 0.18 85 / 0.4)"
            : landed
              ? `0 0 40px ${landed.type === "bust" ? "oklch(0.68 0.25 20 / 0.5)" : "oklch(0.82 0.18 85 / 0.3)"}`
              : "0 0 20px oklch(0.82 0.18 85 / 0.15)",
          transition: "box-shadow 0.5s ease",
        }}
      />
      <motion.div
        className="relative h-full w-full rounded-full border-4 border-accent-luckyletters/60 overflow-hidden"
        animate={{ rotate: spinning ? angle + 1800 : angle }}
        transition={spinning ? { duration: 3.5, ease: [0.15, 0.85, 0.25, 1] } : { duration: 0 }}
        style={{ transformOrigin: "center center" }}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full">
          <title>Lucky Letters spinner</title>
          {segments.map((seg, i) => {
            const startAngle = (i * segAngle * Math.PI) / 180;
            const endAngle = ((i + 1) * segAngle * Math.PI) / 180;
            const x1 = 100 + 98 * Math.cos(startAngle);
            const y1 = 100 + 98 * Math.sin(startAngle);
            const x2 = 100 + 98 * Math.cos(endAngle);
            const y2 = 100 + 98 * Math.sin(endAngle);
            const midAngle = ((i + 0.5) * segAngle * Math.PI) / 180;
            const textX = 100 + 62 * Math.cos(midAngle);
            const textY = 100 + 62 * Math.sin(midAngle);
            const textRot = (i + 0.5) * segAngle;
            return (
              <g key={`seg-${i}-${seg.label}-${seg.color}`} data-testid="lucky-wheel-segment">
                <path
                  d={`M100,100 L${x1},${y1} A98,98 0 0,1 ${x2},${y2} Z`}
                  fill={seg.color}
                  stroke="oklch(0.08 0.02 248)"
                  strokeWidth="0.5"
                />
                <text
                  x={textX}
                  y={textY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={seg.type === "cash" ? "5" : "5.5"}
                  fontWeight="bold"
                  transform={`rotate(${textRot}, ${textX}, ${textY})`}
                >
                  {seg.label}
                </text>
              </g>
            );
          })}
          <circle
            cx="100"
            cy="100"
            r="12"
            fill="oklch(0.15 0.02 248)"
            stroke="oklch(0.82 0.18 85)"
            strokeWidth="2"
          />
          <circle cx="100" cy="100" r="4" fill="oklch(0.82 0.18 85)" />
        </svg>
      </motion.div>
      {landed && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: ANIMATION_EASINGS.crispOut }}
          className="pointer-events-none absolute left-1/2 top-full mt-4 -translate-x-1/2"
        >
          <GlassPanel
            glow
            glowColor={landed.type === "cash" ? "oklch(0.82 0.18 85 / 0.25)" : undefined}
            className="flex min-w-[200px] flex-col items-center gap-1 px-5 py-3"
          >
            <span className="font-body text-xs uppercase tracking-[0.35em] text-text-muted">
              {spinning ? "Prize In Play" : "Landed On"}
            </span>
            <span className="font-display text-2xl font-black text-accent-luckyletters">
              {landed.label}
            </span>
          </GlassPanel>
        </motion.div>
      )}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function LuckyLettersGame({
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
}: LuckyLettersGameProps) {
  const reducedMotion = useReducedMotion();
  const effectiveReducedMotion =
    reducedMotion ||
    (typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const pd = privateData ?? {};

  // ─── Host-side state ────────────────────────────────────────────
  const [gameState, setGameState] = useState<WheelGameState | null>(null);
  const [letterResult, setLetterResult] = useState<LetterResultData | null>(null);
  const [spinResult, setSpinResult] = useState<SpinResultData | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [roundResult, setRoundResult] = useState<RoundResultData | null>(null);
  const [bonusReveal, setBonusReveal] = useState<BonusRevealData | null>(null);
  const [bonusRevealActive, setBonusRevealActive] = useState(false);
  const [highlightLetters, setHighlightLetters] = useState<Set<string>>(new Set());
  const [categoryVoteTally, setCategoryVoteTally] = useState<CategoryVoteTally | null>(null);
  const [idleTimeoutNotice, setIdleTimeoutNotice] = useState<{
    message: string;
    ts: number;
  } | null>(null);
  const [_lastSubmittedText, setLastSubmittedText] = useState<string | null>(null);
  const bonusRevealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMessage = useCallback((data: Record<string, unknown>) => {
    const type = data.type as string | undefined;
    const action = data.action as string | undefined;
    if (type === "game-state" || action === "game-state") {
      setGameState(data as unknown as WheelGameState);
    } else if (type === "letter-result") {
      const lr = data as unknown as LetterResultData;
      setLetterResult(lr);
      if (lr.inPuzzle) {
        sounds.correct();
        setHighlightLetters(new Set([lr.letter]));
        setTimeout(() => setHighlightLetters(new Set()), 2000);
      } else sounds.buzz();
    } else if (type === "spin-result") {
      const spin = data as unknown as SpinResultData;
      setSpinResult(spin);
      setIsSpinning(true);
      emitMotionEvent("lucky.wheel.spin.start", { angle: spin.angle });
      sounds.whoosh();
      setTimeout(() => {
        setIsSpinning(false);
        emitMotionEvent("lucky.wheel.spin.stop", { angle: spin.angle });
        const segType = spin.segment?.type;
        if (segType === "cash") emitAudioEvent("audio.lucky.prize.cash", { segment: spin.segment });
        else if (segType === "bust")
          emitAudioEvent("audio.lucky.prize.bust", { segment: spin.segment });
        else if (segType === "pass")
          emitAudioEvent("audio.lucky.prize.pass", { segment: spin.segment });
        else if (segType === "wild")
          emitAudioEvent("audio.lucky.prize.wild", { segment: spin.segment });
      }, 3500);
    } else if (type === "idle-timeout") {
      const timedPhase = typeof data.phase === "string" ? data.phase : "";
      const message =
        timedPhase === "category-vote"
          ? "Time's up. Locking in categories."
          : timedPhase === "spinning"
            ? "Time's up. Auto-spinning to keep the game moving."
            : "Time's up. Passing the turn.";
      setIdleTimeoutNotice({ message, ts: Date.now() });
      setTimeout(() => setIdleTimeoutNotice(null), 4500);
      sounds.tick();
    } else if (type === "round-result") {
      const rr = data as unknown as RoundResultData;
      setRoundResult(rr);
      if (rr.winnerId) sounds.win();
    } else if (type === "bonus-reveal") {
      const br = data as unknown as BonusRevealData;
      setBonusReveal(br);
      if (br.solved) sounds.win();
      else sounds.buzz();
    } else if (type === "category-vote-tally") {
      setCategoryVoteTally(data as unknown as CategoryVoteTally);
    } else if (type === "categories-selected") {
      sounds.reveal();
    } else if (type === "bonus-letters-revealed") {
      const letters = (data.letters as string[]) ?? [];
      sounds.reveal();
      setHighlightLetters(new Set(letters));
      setTimeout(() => setHighlightLetters(new Set()), 2000);
    }
  }, []);

  useEffect(() => {
    if (!room) return;
    const unsub = room.onMessage("game-data", handleMessage);
    return () => unsub();
  }, [room, handleMessage]);

  useEffect(
    () => () => {
      if (bonusRevealTimeoutRef.current) {
        clearTimeout(bonusRevealTimeoutRef.current);
      }
    },
    [],
  );

  // ─── Controller handlers ────────────────────────────────────────
  const handleSpin = useCallback(() => sendMessage("player:spin"), [sendMessage]);
  const handleConsonantPick = useCallback(
    (letter: string) => {
      setLastSubmittedText(letter);
      sendMessage("player:guess-consonant", { letter });
    },
    [sendMessage],
  );
  const handleVowelPick = useCallback(
    (letter: string) => {
      setLastSubmittedText(letter);
      sendMessage("player:buy-vowel", { letter });
    },
    [sendMessage],
  );
  const handleSolveSubmit = useCallback(
    (text: string) => {
      setLastSubmittedText(text.trim());
      sendMessage("player:solve", { answer: text });
    },
    [sendMessage],
  );
  const handleChooseBuyVowel = useCallback(
    () => sendMessage("player:choose-action", { action: "buy-vowel" }),
    [sendMessage],
  );
  const handleChooseSolve = useCallback(
    () => sendMessage("player:choose-action", { action: "solve" }),
    [sendMessage],
  );

  // ─── Derived data ───────────────────────────────────────────────
  const gs = (gameEvents?.["game-state"] ?? {}) as Record<string, unknown>;
  const controllerSpinResult = gameEvents?.["spin-result"] as
    | { type: string; segment: SpinSegment; angle: number }
    | undefined;
  const controllerLetterResult = gameEvents?.["letter-result"] as
    | {
        letter: string;
        count: number;
        inPuzzle: boolean;
        earned: number;
        vowelCost?: number;
        streak?: number;
      }
    | undefined;
  const controllerRoundResult = gameEvents?.["round-result"] as RoundResultData | undefined;
  const controllerBonusReveal = gameEvents?.["bonus-reveal"] as BonusRevealData | undefined;
  const controllerBonusPickConfirmed = gameEvents?.["bonus-pick-confirmed"] as
    | { letter: string; pickedSoFar: string[] }
    | undefined;
  const lastSpinResultFromState =
    gs.lastSpinResult &&
    typeof gs.lastSpinResult === "object" &&
    "segment" in gs.lastSpinResult &&
    gs.lastSpinResult.segment
      ? ((gs.lastSpinResult as { segment: SpinSegment }).segment ?? null)
      : null;

  const puzzleDisplay = typeof gs.puzzleDisplay === "string" ? gs.puzzleDisplay : "";
  const category = typeof gs.category === "string" ? gs.category : "";
  const hint = typeof gs.hint === "string" ? gs.hint : "";
  const currentTurnSessionId =
    typeof gs.currentTurnSessionId === "string" ? gs.currentTurnSessionId : null;
  const standings = useMemo(
    () => (Array.isArray(gs.standings) ? (gs.standings as WheelStanding[]) : []),
    [gs.standings],
  );
  const streak = typeof gs.streak === "number" ? gs.streak : 0;
  const bonusPlayerSessionId =
    typeof gs.bonusPlayerSessionId === "string" ? gs.bonusPlayerSessionId : null;
  const usedLetters = useMemo(() => {
    const letters = Array.isArray(pd.revealedLetters) ? pd.revealedLetters : [];
    return new Set(letters.filter((l): l is string => typeof l === "string"));
  }, [pd.revealedLetters]);

  const isMyTurn = pd.isMyTurn === true;
  const canBuyVowel = pd.canBuyVowel === true;
  const isBonusPlayer = pd.isBonusPlayer === true;
  const roundCash = typeof pd.roundCash === "number" ? pd.roundCash : 0;
  const turnPlayerName =
    players.find((p) => p.sessionId === currentTurnSessionId)?.name ?? "Player";
  const resolvedBonusReveal = bonusReveal ?? controllerBonusReveal ?? null;
  const shouldShowBonusReveal =
    Boolean(resolvedBonusReveal) && (phase === "bonus-reveal" || bonusRevealActive);
  useEffect(() => {
    if (!resolvedBonusReveal) return;

    setBonusRevealActive(true);
    if (bonusRevealTimeoutRef.current) {
      clearTimeout(bonusRevealTimeoutRef.current);
    }
    bonusRevealTimeoutRef.current = setTimeout(() => {
      setBonusRevealActive(false);
      bonusRevealTimeoutRef.current = null;
    }, BONUS_REVEAL_ACTIVE_MS);
  }, [resolvedBonusReveal]);
  const totalLetters = puzzleDisplay
    ? puzzleDisplay.split("").filter((ch) => /[A-Z_]/.test(ch)).length
    : 0;
  const revealedCount = puzzleDisplay
    ? puzzleDisplay.split("").filter((ch) => /[A-Z]/.test(ch)).length
    : 0;
  const sharedSpinResult = spinResult ?? controllerSpinResult ?? null;
  const visibleSpinSegment = sharedSpinResult?.segment ?? lastSpinResultFromState ?? null;
  const fallbackGameState = useMemo<WheelGameState | null>(() => {
    if (!gs || Object.keys(gs).length === 0) return null;

    return {
      phase: typeof gs.phase === "string" ? gs.phase : phase,
      round: typeof gs.round === "number" ? gs.round : round,
      totalRounds: typeof gs.totalRounds === "number" ? gs.totalRounds : totalRounds,
      category,
      hint,
      puzzleDisplay,
      currentTurnSessionId,
      standings,
      consonantsRemaining: Array.isArray(gs.consonantsRemaining)
        ? (gs.consonantsRemaining as string[])
        : [],
      vowelsRemaining: Array.isArray(gs.vowelsRemaining) ? (gs.vowelsRemaining as string[]) : [],
      wildActive: gs.wildActive === true,
      lastSpinResult: visibleSpinSegment ? { segment: visibleSpinSegment } : null,
      bonusPlayerSessionId,
      bonusSolved: gs.bonusSolved === true,
      revealedLetters: Array.isArray(gs.revealedLetters) ? (gs.revealedLetters as string[]) : [],
      availableCategories: Array.isArray(gs.availableCategories)
        ? (gs.availableCategories as string[])
        : undefined,
      selectedCategories: Array.isArray(gs.selectedCategories)
        ? (gs.selectedCategories as string[])
        : undefined,
    };
  }, [
    bonusPlayerSessionId,
    category,
    currentTurnSessionId,
    gs,
    hint,
    phase,
    puzzleDisplay,
    round,
    standings,
    totalRounds,
    visibleSpinSegment,
  ]);
  const resolvedGameState = gameState ?? fallbackGameState;
  const resolvedPhase =
    typeof resolvedGameState?.phase === "string" ? resolvedGameState.phase : phase;
  const resolvedRound =
    typeof resolvedGameState?.round === "number" ? resolvedGameState.round : round;
  const resolvedTotalRounds =
    typeof resolvedGameState?.totalRounds === "number"
      ? resolvedGameState.totalRounds
      : totalRounds;

  // ─── Standings bar (board) ──────────────────────────────────────
  const standingsBar = gameState ? (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {gameState.standings.map((s) => {
        const name = getPlayerName(players, s.sessionId);
        const color = getPlayerColor(players, s.sessionId);
        const isCurrent = s.sessionId === gameState.currentTurnSessionId;
        return (
          <div
            key={s.sessionId}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 transition-all ${isCurrent ? "bg-accent-luckyletters/15 border border-accent-luckyletters/30" : ""}`}
          >
            <PlayerAvatar name={name} color={color} size={32} />
            <span className="font-body text-[18px] text-text-primary">{name}</span>
            <AnimatedCounter
              value={s.totalCash}
              duration={900}
              className="text-[18px] font-bold text-accent-luckyletters"
              format={(v) => `$${v.toLocaleString()}`}
            />
            {s.roundCash > 0 && (
              <AnimatedCounter
                value={s.roundCash}
                duration={700}
                className="text-[14px] text-text-muted"
                format={(v) => `($${v.toLocaleString()})`}
              />
            )}
          </div>
        );
      })}
    </div>
  ) : null;

  // Mobile puzzle board for controls section
  const mobilePuzzle = puzzleDisplay ? (
    <MobilePuzzleBoard
      puzzleDisplay={puzzleDisplay}
      category={category}
      hint={hint}
      highlightLetters={[...highlightLetters]}
      revealedCount={revealedCount}
      totalLetters={totalLetters}
    />
  ) : null;

  // ─── BOARD renderer ─────────────────────────────────────────────
  function renderBoard(): React.ReactNode {
    const state = gameState ?? fallbackGameState;

    if (!state) {
      return (
        <div className="flex items-center justify-center p-8">
          <p className="font-display text-[48px] text-accent-luckyletters animate-glow-pulse">
            Loading Lucky Letters...
          </p>
        </div>
      );
    }

    // ── Category Vote ──
    if (phase === "category-vote") {
      const categories = state.availableCategories ?? [];
      const voteCounts = categoryVoteTally?.voteCounts ?? {};
      const votedCount = categoryVoteTally?.votedCount ?? 0;
      const totalVoters = categoryVoteTally?.totalVoters ?? 0;
      return (
        <div className="flex flex-col items-center justify-center gap-8 p-8">
          <motion.h1
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 100 }}
            className="font-display text-[clamp(40px,5.5vw,64px)] font-black text-accent-luckyletters"
            style={{ textShadow: "0 0 30px oklch(0.78 0.2 85 / 0.5)" }}
          >
            Choose Your Categories
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="font-body text-[clamp(18px,2.5vw,28px)] text-text-muted"
          >
            Vote on your phones! ({votedCount}/{totalVoters} voted)
          </motion.p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 max-w-4xl">
            {categories.map((cat) => {
              const votes = voteCounts[cat] ?? 0;
              return (
                <motion.div
                  key={cat}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <GlassPanel
                    className={`flex flex-col items-center gap-2 px-6 py-4 ${votes > 0 ? "border-accent-luckyletters/40" : ""}`}
                  >
                    <span className="font-display text-[clamp(16px,2vw,24px)] font-bold text-text-primary text-center">
                      {cat}
                    </span>
                    {votes > 0 && (
                      <span className="rounded-full bg-accent-luckyletters/20 px-3 py-0.5 font-mono text-sm font-bold text-accent-luckyletters">
                        {votes} {votes === 1 ? "vote" : "votes"}
                      </span>
                    )}
                  </GlassPanel>
                </motion.div>
              );
            })}
          </div>
        </div>
      );
    }

    // ── Round Intro ──
    if (phase === "round-intro") {
      return (
        <div className="flex flex-col items-center justify-center gap-8 p-8">
          <motion.h1
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 100 }}
            className="font-display text-[clamp(48px,7vw,80px)] font-black text-accent-luckyletters"
            style={{ textShadow: "0 0 30px oklch(0.78 0.2 85 / 0.5)" }}
          >
            ROUND {state.round}
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlassPanel glow glowColor="oklch(0.78 0.2 85 / 0.3)" className="px-12 py-6">
              <span className="font-display text-[clamp(24px,3vw,40px)] text-accent-luckyletters uppercase tracking-wider">
                {state.category}
              </span>
            </GlassPanel>
          </motion.div>
          {state.hint && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="font-body text-[clamp(20px,2.5vw,32px)] text-text-muted italic"
            >
              Hint: {state.hint}
            </motion.span>
          )}
        </div>
      );
    }

    // ── Spinning ──
    if (phase === "spinning") {
      const currentName = getPlayerName(players, state.currentTurnSessionId);
      const currentColor = getPlayerColor(players, state.currentTurnSessionId);
      const lastSpin = state.lastSpinResult;
      return (
        <div className="flex flex-col items-center justify-center gap-6 p-8">
          <HostPuzzleBoard
            display={state.puzzleDisplay}
            category={state.category}
            highlightLetters={highlightLetters}
            reducedMotion={effectiveReducedMotion}
          />
          <div className="flex items-center gap-6 mt-4">
            <HostWheelSpinner
              spinning={isSpinning}
              angle={spinResult?.angle ?? 0}
              landed={
                spinResult?.segment
                  ? { type: spinResult.segment.type, label: spinResult.segment.label }
                  : !isSpinning && lastSpin
                    ? { type: lastSpin.segment.type, label: lastSpin.segment.label }
                    : null
              }
            />
            <div className="flex flex-col items-center gap-3">
              <PlayerAvatar name={currentName} color={currentColor} size={72} />
              <span className="font-display text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary">
                {currentName}
              </span>
              {lastSpin && !isSpinning && (
                <span
                  data-testid="lucky-prize-label"
                  className={`font-display text-[clamp(24px,3vw,36px)] font-bold ${lastSpin.segment.type === "bust" ? "text-accent-6" : lastSpin.segment.type === "pass" ? "text-warning" : lastSpin.segment.type === "wild" ? "text-success" : "text-accent-luckyletters"}`}
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

    // ── Guess Consonant / Buy Vowel / Solve Attempt ──
    if (phase === "guess-consonant" || phase === "buy-vowel" || phase === "solve-attempt") {
      const currentName = getPlayerName(players, state.currentTurnSessionId);
      const currentColor = getPlayerColor(players, state.currentTurnSessionId);
      const label =
        phase === "guess-consonant"
          ? "Pick a consonant!"
          : phase === "buy-vowel"
            ? "Buying a vowel... ($250)"
            : "Solving the puzzle...";
      return (
        <div className="flex flex-col items-center justify-center gap-6 p-8">
          <HostPuzzleBoard
            display={state.puzzleDisplay}
            category={state.category}
            reducedMotion={effectiveReducedMotion}
          />
          <div className="flex items-center gap-4 mt-4">
            <PlayerAvatar name={currentName} color={currentColor} size={56} />
            <span className="font-display text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary">
              {currentName}
            </span>
          </div>
          <motion.span
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
            className="font-display text-[clamp(24px,3vw,36px)] text-accent-luckyletters"
          >
            {label}
          </motion.span>
          {phase === "guess-consonant" && state.wildActive && (
            <span className="font-display text-[clamp(20px,2.5vw,28px)] text-success font-bold">
              WILD!
            </span>
          )}
          {standingsBar}
        </div>
      );
    }

    // ── Letter Result ──
    if (phase === "letter-result" && letterResult) {
      return (
        <div className="flex flex-col items-center justify-center gap-6 p-8">
          <HostPuzzleBoard
            display={letterResult.puzzleDisplay}
            category={state.category}
            highlightLetters={highlightLetters}
            reducedMotion={effectiveReducedMotion}
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="flex flex-col items-center gap-3"
          >
            <div
              className={`flex items-center justify-center rounded-xl border-4 ${letterResult.inPuzzle ? "border-success bg-success/15" : "border-accent-6 bg-accent-6/15"}`}
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
          </motion.div>
          {standingsBar}
        </div>
      );
    }

    // ── Round Result ──
    if (phase === "round-result" && roundResult) {
      const winnerName = roundResult.winnerId ? getPlayerName(players, roundResult.winnerId) : null;
      const winnerColor = roundResult.winnerId
        ? getPlayerColor(players, roundResult.winnerId)
        : "#999";
      return (
        <div className="flex flex-col items-center justify-center gap-8 p-8">
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-[clamp(28px,3.5vw,44px)] text-accent-luckyletters uppercase tracking-wider"
          >
            Round {state.round} Complete!
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
          {(roundResult.solveBonusAwarded ?? 0) > 0 && (
            <span data-testid="lucky-solve-bonus" className="font-body text-base text-emerald-400">
              Solve bonus +${(roundResult.solveBonusAwarded ?? 0).toLocaleString()}
            </span>
          )}
          {!winnerName && (
            <span
              data-testid="lucky-timeout-banner"
              className="font-display text-[clamp(28px,3.5vw,40px)] text-text-muted"
            >
              Time&apos;s up. No one solved it!
            </span>
          )}
          <ConfettiBurst trigger={!!winnerName} preset="correct" />
          {standingsBar}
        </div>
      );
    }

    // ── Bonus Reveal ──
    if (shouldShowBonusReveal && resolvedBonusReveal) {
      const bonusName = getPlayerName(players, resolvedBonusReveal.bonusPlayerId);
      const bonusColor = getPlayerColor(players, resolvedBonusReveal.bonusPlayerId);
      return (
        <div className="flex flex-col items-center justify-center gap-8 p-8">
          <h1
            className="font-display text-[clamp(40px,5.5vw,64px)] font-black text-accent-luckyletters"
            style={{ textShadow: "0 0 24px oklch(0.78 0.2 85 / 0.4)" }}
          >
            BONUS ROUND
          </h1>
          <GlassPanel
            glow
            glowColor={
              resolvedBonusReveal.solved
                ? "oklch(0.68 0.18 150 / 0.4)"
                : "oklch(0.68 0.25 20 / 0.3)"
            }
            className="px-12 py-8"
          >
            <span className="font-display text-[clamp(32px,4.5vw,56px)] font-bold text-text-primary">
              {resolvedBonusReveal.answer}
            </span>
          </GlassPanel>
          <div className="flex items-center gap-4">
            <PlayerAvatar name={bonusName} color={bonusColor} size={64} />
            <span className="font-display text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary">
              {bonusName}
            </span>
          </div>
          {resolvedBonusReveal.solved ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 150 }}
              className="flex flex-col items-center gap-2"
            >
              <span className="font-display text-[clamp(36px,4.5vw,56px)] font-black text-success">
                SOLVED IT!
              </span>
              <span className="font-mono text-[clamp(28px,3.5vw,44px)] font-bold text-accent-luckyletters">
                +${resolvedBonusReveal.bonusPrize.toLocaleString()}
              </span>
            </motion.div>
          ) : (
            <span className="font-display text-[clamp(32px,4vw,48px)] text-accent-6 font-bold">
              Not this time!
            </span>
          )}
          <ConfettiBurst trigger={resolvedBonusReveal.solved} preset="win" />
        </div>
      );
    }

    // ── Bonus Round ──
    if (phase === "bonus-round") {
      const bonusName = getPlayerName(players, state.bonusPlayerSessionId);
      const bonusColor = getPlayerColor(players, state.bonusPlayerSessionId);
      return (
        <div className="flex flex-col items-center justify-center gap-6 p-8">
          <motion.h1
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            className="font-display text-[clamp(40px,5.5vw,64px)] font-black text-accent-luckyletters"
            style={{ textShadow: "0 0 30px oklch(0.78 0.2 85 / 0.5)" }}
          >
            BONUS ROUND
          </motion.h1>
          <HostPuzzleBoard
            display={state.puzzleDisplay}
            category={state.category}
            highlightLetters={highlightLetters}
            reducedMotion={effectiveReducedMotion}
          />
          <div className="flex items-center gap-4 mt-2">
            <PlayerAvatar name={bonusName} color={bonusColor} size={64} />
            <span className="font-display text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary">
              {bonusName}
            </span>
          </div>
        </div>
      );
    }

    // ── Final Scores ──
    if (phase === "final-scores" && !shouldShowBonusReveal) {
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
        "lucky-letters",
      );
      return (
        <FinalScoresLayout
          scores={scores}
          accentColorClass="text-accent-luckyletters"
          gameId="lucky-letters"
          gameAwards={awards}
          room={room as any}
        />
      );
    }

    return (
      <div className="flex items-center justify-center p-8">
        <p className="font-display text-[48px] text-text-muted">Lucky Letters: {phase}</p>
      </div>
    );
  }

  // ─── CONTROLS renderer ──────────────────────────────────────────
  function renderControls(): React.ReactNode {
    const safeScrollMarginBottom =
      "calc(var(--hud-safe-bottom, env(safe-area-inset-bottom)) + 1rem)";

    // ── Category Vote ──
    if (phase === "category-vote") {
      const availableCategories = Array.isArray(gs.availableCategories)
        ? (gs.availableCategories as string[])
        : [];
      const categoryVoteData = gameEvents?.["category-vote"] as
        | { categories: string[] }
        | undefined;
      const cats = categoryVoteData?.categories ?? availableCategories;
      return (
        <div className="flex flex-col gap-4 pb-4 pt-6">
          <p
            className="text-center font-display text-xl font-black uppercase"
            style={{ color: "oklch(0.78 0.2 85)", textShadow: "0 0 24px oklch(0.78 0.2 85 / 0.5)" }}
          >
            Pick Categories
          </p>
          <CategoryVoteCards
            categories={cats}
            maxSelections={3}
            onVote={(selected) => sendMessage("player:category-vote", { categories: selected })}
          />
        </div>
      );
    }

    // ── Round Intro ──
    if (phase === "round-intro") {
      return (
        <div className="flex flex-col items-center gap-5 px-4 pb-4 pt-6">
          <GlassPanel glow className="flex w-full max-w-sm flex-col items-center gap-4 px-6 py-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-accent-luckyletters/40 bg-accent-luckyletters/15">
              <span className="font-display text-xl font-black text-accent-luckyletters">
                {round}
              </span>
            </div>
            <p className="font-display text-lg font-bold text-text-primary uppercase tracking-wider">
              Round {round} of {totalRounds}
            </p>
            {category && (
              <span className="rounded-full bg-accent-luckyletters/15 px-4 py-1.5 font-display text-sm font-bold text-accent-luckyletters uppercase tracking-wider">
                {category}
              </span>
            )}
            {hint && (
              <p className="text-center font-body text-sm text-text-muted italic">
                &ldquo;{hint}&rdquo;
              </p>
            )}
          </GlassPanel>
          {standings.length > 0 && (
            <MobileStandings
              standings={standings}
              currentTurnSessionId={currentTurnSessionId}
              mySessionId={mySessionId}
              players={players}
            />
          )}
        </div>
      );
    }

    // ── Spinning ──
    if (phase === "spinning") {
      if (isMyTurn) {
        return (
          <div
            className="flex flex-col gap-4 px-4 pt-2"
            style={{
              paddingBottom: "calc(var(--hud-safe-bottom, env(safe-area-inset-bottom)) + 0.75rem)",
            }}
          >
            {mobilePuzzle}
            {roundCash > 0 && (
              <div className="flex justify-center">
                <span className="rounded-full bg-red-500/10 px-3 py-1 font-mono text-xs font-bold text-red-400">
                  At Risk: ${roundCash.toLocaleString()}
                </span>
              </div>
            )}
            {visibleSpinSegment && (
              <MobileSpinResult
                segment={visibleSpinSegment}
                currentTurnName="You"
                isMyTurn={true}
                roundCashAtRisk={roundCash}
              />
            )}
            <MobileWheel
              onSpin={handleSpin}
              spinResult={sharedSpinResult ? { angle: sharedSpinResult.angle } : null}
              landedSegment={visibleSpinSegment}
            />
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              {canBuyVowel && (
                <button
                  type="button"
                  onClick={handleChooseBuyVowel}
                  data-testid="lucky-buy-vowel-action"
                  className="min-h-[48px] rounded-xl border border-accent-luckyletters/40 bg-accent-luckyletters/15 px-5 py-2 font-display text-sm font-bold text-accent-luckyletters uppercase tracking-wider transition-all active:scale-95"
                  style={{ scrollMarginBottom: safeScrollMarginBottom }}
                >
                  Buy a Vowel ($250)
                </button>
              )}
              <button
                type="button"
                onClick={handleChooseSolve}
                data-testid="lucky-solve-action"
                className="min-h-[48px] rounded-xl border border-primary/40 bg-primary/15 px-5 py-2 font-display text-sm font-bold text-primary uppercase tracking-wider transition-all active:scale-95"
                style={{ scrollMarginBottom: safeScrollMarginBottom }}
              >
                Solve
              </button>
            </div>
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-4 pb-4 pt-4">
          {mobilePuzzle}
          <MobileWheel
            onSpin={() => {}}
            spinResult={sharedSpinResult ? { angle: sharedSpinResult.angle } : null}
            landedSegment={visibleSpinSegment}
            disabled
          />
          <GlassPanel
            data-testid="controller-context-card"
            className="mx-4 flex flex-col items-center gap-2 px-4 py-3"
          >
            <p className="text-center font-body text-sm text-text-muted">
              {turnPlayerName}&apos;s turn
            </p>
          </GlassPanel>
          {visibleSpinSegment && (
            <MobileSpinResult
              segment={visibleSpinSegment}
              currentTurnName={turnPlayerName}
              isMyTurn={false}
            />
          )}
        </div>
      );
    }

    // ── Guess Consonant ──
    if (phase === "guess-consonant") {
      if (isMyTurn) {
        return (
          <div className="flex flex-col gap-3 pb-4 pt-2">
            {mobilePuzzle}
            <LetterPicker mode="consonant" usedLetters={usedLetters} onPick={handleConsonantPick} />
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-4 pb-4 pt-4">
          {mobilePuzzle}
          <GlassPanel
            data-testid="controller-context-card"
            className="mx-4 flex flex-col items-center gap-2 px-4 py-3"
          >
            <p className="text-center font-body text-sm text-text-muted">
              {turnPlayerName} is picking a consonant...
            </p>
          </GlassPanel>
        </div>
      );
    }

    // ── Buy Vowel ──
    if (phase === "buy-vowel") {
      if (isMyTurn) {
        return (
          <div className="flex flex-col gap-3 pb-4 pt-2">
            {mobilePuzzle}
            <LetterPicker
              mode="vowel"
              usedLetters={usedLetters}
              onPick={handleVowelPick}
              roundCash={roundCash}
            />
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-4 pb-4 pt-4">
          {mobilePuzzle}
          <GlassPanel
            data-testid="controller-context-card"
            className="mx-4 flex flex-col items-center gap-2 px-4 py-3"
          >
            <p className="text-center font-body text-sm text-text-muted">
              {turnPlayerName} is buying a vowel...
            </p>
          </GlassPanel>
        </div>
      );
    }

    // ── Solve Attempt ──
    if (phase === "solve-attempt") {
      if (isMyTurn) {
        return (
          <div className="flex flex-col gap-3 pb-4 pt-2">
            {mobilePuzzle}
            <TextInput
              prompt="Solve the puzzle:"
              placeholder="Type the full phrase..."
              onSubmit={handleSolveSubmit}
              resetNonce={errorNonce}
            />
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-4 pb-4 pt-4">
          {mobilePuzzle}
          <MobileWheel
            onSpin={() => {}}
            spinResult={sharedSpinResult ? { angle: sharedSpinResult.angle } : null}
            landedSegment={visibleSpinSegment}
            disabled
          />
          <GlassPanel
            data-testid="controller-context-card"
            className="mx-4 flex flex-col items-center gap-2 px-4 py-3"
          >
            <p className="text-center font-body text-sm text-text-muted">
              {turnPlayerName} is solving...
            </p>
          </GlassPanel>
        </div>
      );
    }

    // ── Letter Result ──
    if (phase === "letter-result") {
      return (
        <div className="flex flex-col gap-4 pb-4 pt-4">
          {mobilePuzzle}
          {controllerLetterResult && (
            <MobileLetterResult
              letter={controllerLetterResult.letter}
              count={controllerLetterResult.count}
              inPuzzle={controllerLetterResult.inPuzzle}
              earned={controllerLetterResult.earned}
              vowelCost={controllerLetterResult.vowelCost}
              streak={controllerLetterResult.streak ?? streak}
            />
          )}
        </div>
      );
    }

    // ── Round Result ──
    if (phase === "round-result") {
      const rrStandings = controllerRoundResult?.standings ?? standings;
      const winnerName = controllerRoundResult?.winnerId
        ? (players.find((p) => p.sessionId === controllerRoundResult.winnerId)?.name ?? null)
        : null;
      return (
        <div className="flex flex-col gap-4 pb-4 pt-4">
          <ConfettiBurst trigger={true} preset="win" />
          {controllerRoundResult?.answer && (
            <GlassPanel className="mx-4 flex flex-col items-center gap-2 px-4 py-4">
              <p className="font-body text-xs text-text-muted uppercase tracking-wider">
                The answer was
              </p>
              <p className="text-center font-display text-lg font-black text-text-primary">
                {controllerRoundResult.answer}
              </p>
            </GlassPanel>
          )}
          {winnerName && (
            <p className="text-center font-display text-base font-bold text-accent-luckyletters">
              {winnerName} won the round!
              {controllerRoundResult?.roundCashEarned
                ? ` +$${controllerRoundResult.roundCashEarned.toLocaleString()}`
                : ""}
            </p>
          )}
          {(controllerRoundResult?.solveBonusAwarded ?? 0) > 0 && (
            <p
              data-testid="lucky-solve-bonus"
              className="text-center font-body text-sm text-emerald-400"
            >
              Solve bonus +${(controllerRoundResult?.solveBonusAwarded ?? 0).toLocaleString()}
            </p>
          )}
          {!winnerName && (
            <p
              data-testid="lucky-timeout-banner"
              className="text-center font-body text-sm text-text-muted"
            >
              Time&apos;s up. No solve this round.
            </p>
          )}
          {rrStandings.length > 0 && (
            <MobileStandings standings={rrStandings} mySessionId={mySessionId} players={players} />
          )}
        </div>
      );
    }

    // ── Bonus Reveal ──
    if (shouldShowBonusReveal && resolvedBonusReveal) {
      const brSolved = resolvedBonusReveal.solved ?? false;
      const brAnswer = resolvedBonusReveal.answer ?? "";
      const brPrize = resolvedBonusReveal.bonusPrize ?? 0;
      const brPlayerName = resolvedBonusReveal.bonusPlayerId
        ? (players.find((p) => p.sessionId === resolvedBonusReveal.bonusPlayerId)?.name ?? "Player")
        : "Player";
      return (
        <div className="flex flex-col gap-4 pb-4 pt-4">
          {brSolved && <ConfettiBurst trigger={true} preset="celebration" />}
          <GlassPanel className="mx-4 flex flex-col items-center gap-3 px-6 py-5">
            <p
              className={`font-display text-2xl font-black uppercase ${brSolved ? "text-emerald-400" : "text-red-400"}`}
            >
              {brSolved ? "Solved!" : "Not Solved"}
            </p>
            {brAnswer && (
              <p className="text-center font-display text-base font-bold text-text-primary">
                {brAnswer}
              </p>
            )}
            {brSolved && brPrize > 0 && (
              <p className="font-mono text-lg font-bold text-emerald-400">
                {brPlayerName} wins ${brPrize.toLocaleString()}!
              </p>
            )}
          </GlassPanel>
        </div>
      );
    }

    // ── Bonus Round ──
    if (phase === "bonus-round") {
      const bonusName = players.find((p) => p.sessionId === bonusPlayerSessionId)?.name ?? "Player";
      if (isBonusPlayer) {
        const pickedLetters = controllerBonusPickConfirmed?.pickedSoFar ?? [];
        return (
          <div className="flex flex-col gap-3 pb-4 pt-2">
            <p
              className="text-center font-display text-xl font-black uppercase"
              style={{
                color: "oklch(0.78 0.2 85)",
                textShadow: "0 0 24px oklch(0.78 0.2 85 / 0.5)",
              }}
            >
              Bonus Round!
            </p>
            {mobilePuzzle}
            {pickedLetters.length > 0 && (
              <div className="flex items-center justify-center gap-1 px-4">
                <span className="font-body text-xs text-text-muted">Picked:</span>
                {pickedLetters.map((l) => (
                  <span
                    key={l}
                    className="flex h-7 w-7 items-center justify-center rounded border border-accent-luckyletters/40 bg-accent-luckyletters/15 font-display text-xs font-bold text-accent-luckyletters"
                  >
                    {l}
                  </span>
                ))}
              </div>
            )}
            <LetterPicker
              mode="bonus"
              usedLetters={usedLetters}
              onPick={(letter) => sendMessage("player:bonus-pick", { letter })}
            />
            <div className="px-4">
              <TextInput
                prompt="Solve the bonus puzzle:"
                placeholder="Type the full phrase..."
                onSubmit={(text) => sendMessage("player:bonus-solve", { answer: text })}
              />
            </div>
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-4 pb-4 pt-4">
          <p
            className="text-center font-display text-xl font-black uppercase"
            style={{ color: "oklch(0.78 0.2 85)", textShadow: "0 0 24px oklch(0.78 0.2 85 / 0.5)" }}
          >
            Bonus Round!
          </p>
          {mobilePuzzle}
          <GlassPanel
            data-testid="controller-context-card"
            className="mx-4 flex flex-col items-center gap-2 px-4 py-3"
          >
            <p className="text-center font-body text-sm text-text-muted">
              {bonusName} is playing for $25,000!
            </p>
          </GlassPanel>
        </div>
      );
    }

    // ── Final Scores ──
    if (phase === "final-scores" && !shouldShowBonusReveal) {
      return (
        <div className="flex flex-col items-center gap-4 px-4 pb-4 pt-4">
          <p className="text-center font-body text-sm text-text-muted">
            Check the board for full results!
          </p>
        </div>
      );
    }

    return (
      <WaitingScreen
        phase={phase}
        gameId="lucky-letters"
        score={typeof pd.totalCash === "number" ? pd.totalCash : undefined}
      />
    );
  }

  // ─── Layout ──────────────────────────────────────────────────────
  if (resolvedPhase === "final-scores" && !shouldShowBonusReveal) {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col"
        data-testid="lucky-host-state"
        data-phase={resolvedPhase}
        data-round={resolvedRound}
        data-total-rounds={resolvedTotalRounds}
      >
        {renderBoard()}
      </div>
    );
  }

  return (
    <div
      data-testid="lucky-host-state"
      data-phase={resolvedPhase}
      data-round={resolvedRound}
      data-total-rounds={resolvedTotalRounds}
    >
      <GameBoard
        board={renderBoard()}
        controls={
          <>
            <PlayerStatus
              turnPlayerName={isMyTurn ? null : turnPlayerName}
              isMyTurn={isMyTurn}
              message={
                isMyTurn
                  ? "Your turn!"
                  : phase === "category-vote"
                    ? "Vote for categories"
                    : undefined
              }
            />
            {renderControls()}
          </>
        }
        overlay={
          idleTimeoutNotice ? (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-4">
              <motion.div
                data-testid="lucky-timeout-banner"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: ANIMATION_EASINGS.smoothInOut }}
                className="w-full max-w-md"
              >
                <GlassPanel
                  glow
                  glowColor="oklch(0.78 0.2 85 / 0.16)"
                  className="px-4 py-3 text-center"
                >
                  <p className="font-display text-sm font-bold text-text-primary">
                    {idleTimeoutNotice.message}
                  </p>
                </GlassPanel>
              </motion.div>
            </div>
          ) : null
        }
      />
    </div>
  );
}
