"use client";

import type { PlayerData } from "@flimflam/shared";
import { sounds } from "@flimflam/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  BrainBoardGameState,
  ClueResultData,
  ClueResultEntry,
  FinalRevealData,
  Standing,
} from "../shared/bb-types";

export interface UseBrainBoardStateOptions {
  phase: string;
  players: PlayerData[];
  gameEvents: Record<string, Record<string, unknown>>;
  privateData: Record<string, unknown> | null;
  room: {
    onMessage: (type: string, cb: (data: Record<string, unknown>) => void) => () => void;
  } | null;
}

export interface BrainBoardStateResult {
  // Raw state
  gameState: BrainBoardGameState | null;
  clueResult: ClueResultData | null;
  finalReveal: FinalRevealData | null;
  powerPlayWager: number | null;
  revealIndex: number;

  // Derived state
  boardState: BrainBoardGameState | null;
  boardCategories: string[];
  topicPreview: string[];
  bbStandings: Standing[];
  currentRound: number;
  resolvedPhase: string;
  doubleDownValues: boolean;
  answeredCount: number;
  totalPlayerCount: number;
  selectorSessionId: string | null;
  selectorName: string | null;
  isMyTurn: boolean;

  /** Accumulated outcomes from clue-result events: "col,row" → "correct"|"wrong" */
  clueOutcomes: Map<string, "correct" | "wrong">;

  // Raw event sources for controller
  gs: Record<string, unknown>;
}

export function useBrainBoardState({
  phase,
  players,
  gameEvents,
  privateData,
  room,
}: UseBrainBoardStateOptions): BrainBoardStateResult {
  const pd = privateData ?? {};

  // ─── Host-side state from room messages ─────────────────────────
  const [gameState, setGameState] = useState<BrainBoardGameState | null>(null);
  const [clueResult, setClueResult] = useState<ClueResultData | null>(null);
  const [finalReveal, setFinalReveal] = useState<FinalRevealData | null>(null);
  const [powerPlayWager, setPowerPlayWager] = useState<number | null>(null);
  const [revealIndex, setRevealIndex] = useState(0);
  const [clueOutcomes, setClueOutcomes] = useState<Map<string, "correct" | "wrong">>(new Map());
  const prevRevealedRef = useRef<Set<string>>(new Set());
  const lastNewClueKeyRef = useRef<string | null>(null);
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
      const newState = data as unknown as BrainBoardGameState;
      setGameState(newState);

      // Track newly revealed clue keys for outcome mapping
      if (Array.isArray(newState.revealedClues)) {
        const newSet = new Set(newState.revealedClues);
        for (const key of newSet) {
          if (!prevRevealedRef.current.has(key)) {
            lastNewClueKeyRef.current = key;
          }
        }
        prevRevealedRef.current = newSet;
      }
    } else if (type === "clue-result") {
      const results = Array.isArray(data.results) ? (data.results as ClueResultEntry[]) : [];
      if (results.some((r) => r.correct)) sounds.correct();
      else sounds.buzz();
      setClueResult({ ...(data as unknown as ClueResultData), results });

      // Map this result to the most recently revealed clue
      const clueKey = lastNewClueKeyRef.current;
      if (clueKey) {
        const anyCorrect = results.some((r) => r.correct);
        setClueOutcomes((prev) => {
          const next = new Map(prev);
          next.set(clueKey, anyCorrect ? "correct" : "wrong");
          return next;
        });
      }
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

  // ─── Derived data from gameEvents (controller-side) ────────────
  const gs = (gameEvents?.["game-state"] ?? {}) as Record<string, unknown>;
  const fallbackState = useMemo(() => {
    if (typeof gs.phase !== "string") return null;
    return gs as unknown as BrainBoardGameState;
  }, [gs]);
  const boardState = gameState ?? fallbackState;

  const boardCategories = useMemo(() => {
    if (Array.isArray(gs.board)) {
      return (gs.board as Array<{ name?: string }>)
        .map((entry) => (typeof entry.name === "string" ? entry.name : ""))
        .filter((name) => name.length > 0);
    }
    return [];
  }, [gs.board]);

  const topicPreview = useMemo(() => {
    const source = Array.isArray(boardState?.personalizationTopics)
      ? boardState.personalizationTopics
      : Array.isArray(gs.personalizationTopics)
        ? (gs.personalizationTopics as unknown[])
        : [];
    return source
      .filter((topic): topic is string => typeof topic === "string" && topic.trim().length > 0)
      .map((topic) => topic.trim())
      .slice(0, 8);
  }, [boardState?.personalizationTopics, gs.personalizationTopics]);

  const bbStandings = useMemo(() => {
    const source = boardState?.standings ?? gs.standings;
    return Array.isArray(source) ? (source as Standing[]) : [];
  }, [boardState?.standings, gs.standings]);

  const currentRound =
    typeof boardState?.currentRound === "number"
      ? boardState.currentRound
      : typeof gs.currentRound === "number"
        ? gs.currentRound
        : 1;

  const resolvedPhase =
    typeof boardState?.phase === "string"
      ? boardState.phase
      : typeof gs.phase === "string"
        ? gs.phase
        : phase;

  const doubleDownValues = boardState?.doubleDownValues === true || gs.doubleDownValues === true;

  const answeredCount =
    typeof boardState?.answeredCount === "number"
      ? boardState.answeredCount
      : typeof gs.answeredCount === "number"
        ? gs.answeredCount
        : 0;

  const totalPlayerCount =
    typeof boardState?.totalPlayerCount === "number"
      ? boardState.totalPlayerCount
      : typeof gs.totalPlayerCount === "number"
        ? gs.totalPlayerCount
        : 0;

  const selectorSessionId =
    typeof boardState?.selectorSessionId === "string"
      ? boardState.selectorSessionId
      : typeof gs.selectorSessionId === "string"
        ? gs.selectorSessionId
        : null;

  const selectorName = selectorSessionId
    ? (players.find((p) => p.sessionId === selectorSessionId)?.name ?? null)
    : null;

  const isMyTurn = pd.isSelector === true || pd.isPowerPlayPlayer === true;

  return {
    gameState,
    clueResult,
    finalReveal,
    powerPlayWager,
    revealIndex,
    boardState,
    boardCategories,
    topicPreview,
    bbStandings,
    currentRound,
    resolvedPhase,
    doubleDownValues,
    answeredCount,
    totalPlayerCount,
    selectorSessionId,
    selectorName,
    isMyTurn,
    clueOutcomes,
    gs,
  };
}
