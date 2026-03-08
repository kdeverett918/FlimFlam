"use client";

import type { PlayerData } from "@flimflam/shared";
import { emitAudioEvent, emitMotionEvent, sounds } from "@flimflam/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  BonusRevealData,
  CategoryVoteTally,
  LetterResultData,
  RoundResultData,
  SpinResultData,
  SpinSegment,
  WheelGameState,
  WheelStanding,
} from "../shared/ll-types";

const BONUS_REVEAL_ACTIVE_MS =
  process.env.NEXT_PUBLIC_FLIMFLAM_E2E === "1" || process.env.FLIMFLAM_E2E === "1" ? 2_500 : 5_200;

export interface UseLuckyLettersStateOptions {
  phase: string;
  round: number;
  totalRounds: number;
  players: PlayerData[];
  gameEvents: Record<string, Record<string, unknown>>;
  privateData: Record<string, unknown> | null;
  room: {
    onMessage: (type: string, cb: (data: Record<string, unknown>) => void) => () => void;
  } | null;
}

export interface LuckyLettersStateResult {
  // Raw state
  gameState: WheelGameState | null;
  letterResult: LetterResultData | null;
  spinResult: SpinResultData | null;
  isSpinning: boolean;
  roundResult: RoundResultData | null;
  bonusReveal: BonusRevealData | null;
  highlightLetters: Set<string>;
  categoryVoteTally: CategoryVoteTally | null;
  idleTimeoutNotice: { message: string; ts: number } | null;

  // Derived state
  gs: Record<string, unknown>;
  controllerSpinResult: { type: string; segment: SpinSegment; angle: number } | undefined;
  controllerLetterResult:
    | {
        letter: string;
        count: number;
        inPuzzle: boolean;
        earned: number;
        vowelCost?: number;
        streak?: number;
      }
    | undefined;
  controllerRoundResult: RoundResultData | undefined;
  controllerBonusReveal: BonusRevealData | undefined;
  controllerBonusPickConfirmed: { letter: string; pickedSoFar: string[] } | undefined;
  puzzleDisplay: string;
  category: string;
  hint: string;
  currentTurnSessionId: string | null;
  standings: WheelStanding[];
  streak: number;
  bonusPlayerSessionId: string | null;
  usedLetters: Set<string>;
  isMyTurn: boolean;
  canBuyVowel: boolean;
  isBonusPlayer: boolean;
  roundCash: number;
  turnPlayerName: string;
  resolvedBonusReveal: BonusRevealData | null;
  shouldShowBonusReveal: boolean;
  totalLetters: number;
  revealedCount: number;
  sharedSpinResult: SpinResultData | null;
  visibleSpinSegment: SpinSegment | null;
  fallbackGameState: WheelGameState | null;
  resolvedGameState: WheelGameState | null;
  resolvedPhase: string;
  resolvedRound: number;
  resolvedTotalRounds: number;
}

export function useLuckyLettersState({
  phase,
  round,
  totalRounds,
  players,
  gameEvents,
  privateData,
  room,
}: UseLuckyLettersStateOptions): LuckyLettersStateResult {
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

  // ─── Derived data from gameEvents (controller-side) ────────────
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

  return {
    gameState,
    letterResult,
    spinResult,
    isSpinning,
    roundResult,
    bonusReveal,
    highlightLetters,
    categoryVoteTally,
    idleTimeoutNotice,
    gs,
    controllerSpinResult,
    controllerLetterResult,
    controllerRoundResult,
    controllerBonusReveal,
    controllerBonusPickConfirmed,
    puzzleDisplay,
    category,
    hint,
    currentTurnSessionId,
    standings,
    streak,
    bonusPlayerSessionId,
    usedLetters,
    isMyTurn,
    canBuyVowel,
    isBonusPlayer,
    roundCash,
    turnPlayerName,
    resolvedBonusReveal,
    shouldShowBonusReveal,
    totalLetters,
    revealedCount,
    sharedSpinResult,
    visibleSpinSegment,
    fallbackGameState,
    resolvedGameState,
    resolvedPhase,
    resolvedRound,
    resolvedTotalRounds,
  };
}
