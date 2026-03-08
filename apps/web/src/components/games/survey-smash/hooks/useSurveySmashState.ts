"use client";

import type { PlayerData } from "@flimflam/shared";
import { ANIMATION_DURATIONS, emitMotionEvent, sounds, useReducedMotion } from "@flimflam/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { FeudGameState, TeamData } from "../shared/ss-types";

// ─── Options ────────────────────────────────────────────────────────────────

export interface UseSurveySmashStateOptions {
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
  room: {
    onMessage: (type: string, cb: (data: Record<string, unknown>) => void) => () => void;
  } | null;
}

// ─── Result ─────────────────────────────────────────────────────────────────

export interface SurveySmashStateResult {
  reducedMotion: boolean;
  canonicalGameState: FeudGameState | null;
  canonicalPhase: string;
  controllerPhase: string;
  hasActiveAction: boolean;
  showStrikeOverlay: boolean;
  dramaticStage: "idle" | "pause" | "build" | "reveal";
  sequentialRevealCount: number;
  lastPrivateAction: string | null;
  isTeamRosterOpen: boolean;
  setIsTeamRosterOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Derived controller flags
  isFaceOffPlayer: boolean;
  isCurrentGuesser: boolean;
  isSnagTeam: boolean;
  isLightningPlayer: boolean;
  isGuessAlongPlayer: boolean;

  // Team data
  surveyTeams: TeamData[];
  myTeamId: string | null;
  myTeamLabel: string | null;
  guessAlongPoints: number | null;

  // Round data
  canonicalRound: number | undefined;
  canonicalTotalRounds: number | undefined;
  hostRound: string | undefined;
  hostTotalRounds: string | undefined;

  // Lightning data
  controlLightningQuestionIndex: string | undefined;
  controlLightningQuestionCount: string | undefined;

  // Render key
  controlRenderKey: string;

  // Raw event/payload sources
  gs: Record<string, unknown>;
  pd: Record<string, unknown>;
  roomPhase: string | undefined;
  eventPhase: string | undefined;
  gameStatePhase: string | undefined;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useSurveySmashState({
  phase,
  round,
  totalRounds,
  players,
  gamePayload,
  privateData,
  gameEvents,
  mySessionId,
  isHost,
  timerEndTime: _timerEndTime,
  room,
}: UseSurveySmashStateOptions): SurveySmashStateResult {
  const reducedMotion = useReducedMotion();
  const pd = privateData ?? {};
  const payloadGameState =
    typeof gamePayload?.action === "string" ? (gamePayload as unknown as FeudGameState) : null;
  const eventGameState = (gameEvents?.["game-state"] ??
    gameEvents?.["survey-smash-state"] ??
    null) as FeudGameState | null;
  const roomPhase = typeof phase === "string" && phase.length > 0 ? phase : undefined;
  const eventPhase =
    typeof eventGameState?.phase === "string" && eventGameState.phase.length > 0
      ? eventGameState.phase
      : undefined;

  // ─── Host state ──────────────────────────────────────────────────
  const [gameState, setGameState] = useState<FeudGameState | null>(null);
  const [showStrikeOverlay, setShowStrikeOverlay] = useState(false);
  const [strikeFxNonce, setStrikeFxNonce] = useState(0);
  const [dramaticStage, setDramaticStage] = useState<"idle" | "pause" | "build" | "reveal">("idle");
  const [sequentialRevealCount, setSequentialRevealCount] = useState(0);
  const [lastPrivateAction, setLastPrivateAction] = useState<string | null>(null);
  const [isTeamRosterOpen, setIsTeamRosterOpen] = useState(false);
  const prevStrikesRef = useRef(0);
  const prevPhaseRef = useRef(phase);
  const revealTimersRef = useRef<number[]>([]);

  const gameStatePhase =
    typeof gameState?.phase === "string" && gameState.phase.length > 0
      ? gameState.phase
      : undefined;
  const canonicalGameState = gameState ?? eventGameState ?? payloadGameState;
  const canonicalStatePhase =
    gameStatePhase ??
    eventPhase ??
    (typeof payloadGameState?.phase === "string" && payloadGameState.phase.length > 0
      ? payloadGameState.phase
      : null);
  const canonicalPhase = canonicalStatePhase ?? roomPhase ?? phase;

  const clearRevealTimers = useCallback(() => {
    for (const timerId of revealTimersRef.current) {
      window.clearTimeout(timerId);
      window.clearInterval(timerId);
    }
    revealTimersRef.current = [];
  }, []);

  const handleMessage = useCallback(
    (data: Record<string, unknown>) => {
      const action = data.action as string | undefined;
      if (action === "survey-smash-state") {
        const newState = data as unknown as FeudGameState;
        setGameState(newState);
        if (newState.strikes > prevStrikesRef.current && newState.phase === "strike") {
          setShowStrikeOverlay(true);
          setStrikeFxNonce((n) => n + 1);
          emitMotionEvent(reducedMotion ? "survey.strike.reduced" : "survey.strike", {
            shakeApplied: !reducedMotion,
            strikes: newState.strikes,
          });
          sounds.strike();
          window.setTimeout(() => setShowStrikeOverlay(false), 1200);
        }
        prevStrikesRef.current = newState.strikes;
      }
    },
    [reducedMotion],
  );

  useEffect(() => {
    if (!room) return;
    const unsub = room.onMessage("game-data", handleMessage);
    return () => unsub();
  }, [room, handleMessage]);

  useEffect(() => {
    if (prevPhaseRef.current !== canonicalPhase) {
      if (["question-reveal", "face-off", "answer-reveal"].includes(canonicalPhase))
        sounds.reveal();
      if (["round-result", "lightning-round-reveal"].includes(canonicalPhase)) sounds.win();
      prevPhaseRef.current = canonicalPhase;
    }
  }, [canonicalPhase]);

  useEffect(() => {
    if (strikeFxNonce <= 0 || typeof document === "undefined" || reducedMotion) return;
    document.body.classList.add("survey-strike-shake");
    const timer = window.setTimeout(
      () => document.body.classList.remove("survey-strike-shake"),
      460,
    );
    return () => {
      window.clearTimeout(timer);
      document.body.classList.remove("survey-strike-shake");
    };
  }, [strikeFxNonce, reducedMotion]);

  useEffect(() => {
    clearRevealTimers();
    if (!canonicalGameState || canonicalPhase !== "answer-reveal") {
      setDramaticStage("idle");
      setSequentialRevealCount(0);
      return;
    }
    setDramaticStage("pause");
    setSequentialRevealCount(0);
    const pauseTimer = window.setTimeout(() => {
      setDramaticStage("build");
      sounds.tick();
      const buildTimer = window.setTimeout(() => {
        setDramaticStage("reveal");
        const total = canonicalGameState.allAnswers?.length || canonicalGameState.answerCount || 0;
        if (total <= 0) return;
        let revealIndex = 0;
        const seqTimer = window.setInterval(() => {
          revealIndex += 1;
          setSequentialRevealCount(revealIndex);
          sounds.reveal();
          if (revealIndex >= total) window.clearInterval(seqTimer);
        }, ANIMATION_DURATIONS.sequentialStepMs);
        revealTimersRef.current.push(seqTimer);
      }, ANIMATION_DURATIONS.dramaticBuildMs);
      revealTimersRef.current.push(buildTimer);
    }, ANIMATION_DURATIONS.dramaticPauseMs);
    revealTimersRef.current.push(pauseTimer);
    return clearRevealTimers;
  }, [canonicalPhase, canonicalGameState, clearRevealTimers]);

  useEffect(() => clearRevealTimers, [clearRevealTimers]);

  // ─── Private action tracking ─────────────────────────────────────
  useEffect(() => {
    if (typeof pd.action === "string" && pd.action.length > 0) {
      setLastPrivateAction(pd.action);
    }
  }, [pd.action]);

  // ─── Derived controller data ─────────────────────────────────────
  const gs = (canonicalGameState ?? {}) as unknown as Record<string, unknown>;
  const isFaceOffPlayer = pd.action === "face-off-your-turn";
  const isCurrentGuesser = pd.action === "your-turn-to-guess";
  const isSnagTeam = pd.action === "snag-your-turn";
  const publicPhase = canonicalStatePhase;
  const publicLightningPlayerId =
    typeof gs.lightningPlayerId === "string" ? (gs.lightningPlayerId as string) : null;
  const privateLightningQuestionIndex =
    typeof pd.questionIndex === "number" && Number.isFinite(pd.questionIndex)
      ? pd.questionIndex
      : null;
  const privateLightningQuestionCount =
    typeof pd.totalQuestions === "number" && Number.isFinite(pd.totalQuestions)
      ? pd.totalQuestions
      : null;
  const publicLightningQuestionIndex =
    typeof canonicalGameState?.lightningCurrentIndex === "number" &&
    Number.isFinite(canonicalGameState.lightningCurrentIndex)
      ? canonicalGameState.lightningCurrentIndex
      : null;
  const publicLightningQuestionCount =
    typeof canonicalGameState?.lightningQuestionCount === "number" &&
    Number.isFinite(canonicalGameState.lightningQuestionCount)
      ? canonicalGameState.lightningQuestionCount
      : null;
  const isAssignedLightningPlayer = mySessionId !== null && publicLightningPlayerId === mySessionId;
  const hasLightningQuestionBank =
    (privateLightningQuestionCount !== null && privateLightningQuestionCount > 0) ||
    (publicLightningQuestionCount !== null && publicLightningQuestionCount > 0);
  const hasPendingLightningQuestion =
    (privateLightningQuestionIndex !== null &&
      privateLightningQuestionCount !== null &&
      privateLightningQuestionIndex < privateLightningQuestionCount) ||
    (publicLightningQuestionIndex !== null &&
      publicLightningQuestionCount !== null &&
      publicLightningQuestionIndex < publicLightningQuestionCount);
  const lightningRoundStillInteractive =
    publicPhase !== "lightning-round-reveal" &&
    publicPhase !== "final-scores" &&
    roomPhase !== "lightning-round-reveal" &&
    roomPhase !== "final-scores";
  const isLightningPlayer =
    pd.action === "lightning-question" ||
    (hasLightningQuestionBank &&
      isAssignedLightningPlayer &&
      hasPendingLightningQuestion &&
      lightningRoundStillInteractive);
  const isGuessAlongPlayer = pd.action === "guess-along";

  const controllerPhase = useMemo(() => {
    if (isHost) return canonicalPhase;

    if (pd.action === "lightning-question") return "lightning-round";

    if (roomPhase === "lightning-round") return "lightning-round";

    if (publicPhase === "lightning-round") return "lightning-round";

    if (publicPhase === "lightning-round-reveal") return "lightning-round-reveal";

    if (isLightningPlayer) return "lightning-round";

    if (
      roomPhase === "question-reveal" ||
      roomPhase === "face-off" ||
      roomPhase === "guessing" ||
      roomPhase === "strike" ||
      roomPhase === "steal-chance" ||
      roomPhase === "answer-reveal" ||
      roomPhase === "round-result" ||
      roomPhase === "final-scores"
    ) {
      return roomPhase;
    }

    if (
      publicPhase === "question-reveal" ||
      publicPhase === "face-off" ||
      publicPhase === "guessing" ||
      publicPhase === "strike" ||
      publicPhase === "steal-chance" ||
      publicPhase === "answer-reveal" ||
      publicPhase === "round-result" ||
      publicPhase === "final-scores"
    ) {
      return publicPhase;
    }

    if (isSnagTeam) return "steal-chance";
    if (isFaceOffPlayer) return "face-off";
    if (isCurrentGuesser || isGuessAlongPlayer) return "guessing";
    return canonicalPhase;
  }, [
    canonicalPhase,
    isCurrentGuesser,
    isFaceOffPlayer,
    isGuessAlongPlayer,
    isHost,
    isLightningPlayer,
    isSnagTeam,
    pd.action,
    publicPhase,
    roomPhase,
  ]);

  const hasActiveAction = useMemo(() => {
    switch (controllerPhase) {
      case "face-off":
        return isFaceOffPlayer;
      case "guessing":
        return isCurrentGuesser || isGuessAlongPlayer;
      case "steal-chance":
        return isSnagTeam;
      case "lightning-round":
        return isLightningPlayer;
      default:
        return false;
    }
  }, [
    controllerPhase,
    isCurrentGuesser,
    isFaceOffPlayer,
    isGuessAlongPlayer,
    isLightningPlayer,
    isSnagTeam,
  ]);

  const surveyTeams = useMemo(
    () => (Array.isArray(gs.teams) ? (gs.teams as TeamData[]) : []),
    [gs.teams],
  );
  const myTeamId = useMemo(() => {
    const fromPd = typeof pd.yourTeamId === "string" ? pd.yourTeamId : null;
    if (fromPd) return fromPd;
    const myPlayer = players.find((p) => p.sessionId === mySessionId);
    if (typeof myPlayer?.role === "string") return myPlayer.role;
    return surveyTeams.find((t) => t.members.includes(mySessionId ?? ""))?.id ?? null;
  }, [pd.yourTeamId, players, mySessionId, surveyTeams]);

  const myTeamLabel =
    myTeamId === "team-a" ? "Team A" : myTeamId === "team-b" ? "Team B" : myTeamId ? "Solo" : null;
  const guessAlongPoints = typeof pd.guessAlongPoints === "number" ? pd.guessAlongPoints : null;
  const canonicalRound =
    typeof round === "number" && Number.isFinite(round) ? round : canonicalGameState?.round;
  const canonicalTotalRounds =
    typeof totalRounds === "number" && Number.isFinite(totalRounds)
      ? totalRounds
      : canonicalGameState?.totalRounds;
  const hostRound = Number.isFinite(canonicalRound)
    ? String(canonicalRound)
    : Number.isFinite(round)
      ? String(round)
      : undefined;
  const hostTotalRounds = Number.isFinite(canonicalTotalRounds)
    ? String(canonicalTotalRounds)
    : Number.isFinite(totalRounds)
      ? String(totalRounds)
      : undefined;
  const controlLightningQuestionIndex =
    typeof pd.questionIndex === "number"
      ? String(pd.questionIndex)
      : typeof canonicalGameState?.lightningCurrentIndex === "number"
        ? String(canonicalGameState.lightningCurrentIndex)
        : undefined;
  const controlLightningQuestionCount =
    typeof pd.totalQuestions === "number"
      ? String(pd.totalQuestions)
      : typeof canonicalGameState?.lightningQuestionCount === "number"
        ? String(canonicalGameState.lightningQuestionCount)
        : undefined;
  const controlRenderKey = `${controllerPhase}:${typeof pd.action === "string" ? pd.action : "idle"}:${canonicalRound ?? "na"}`;

  return {
    reducedMotion,
    canonicalGameState,
    canonicalPhase,
    controllerPhase,
    hasActiveAction,
    showStrikeOverlay,
    dramaticStage,
    sequentialRevealCount,
    lastPrivateAction,
    isTeamRosterOpen,
    setIsTeamRosterOpen,
    isFaceOffPlayer,
    isCurrentGuesser,
    isSnagTeam,
    isLightningPlayer,
    isGuessAlongPlayer,
    surveyTeams,
    myTeamId,
    myTeamLabel,
    guessAlongPoints,
    canonicalRound,
    canonicalTotalRounds,
    hostRound,
    hostTotalRounds,
    controlLightningQuestionIndex,
    controlLightningQuestionCount,
    controlRenderKey,
    gs,
    pd,
    roomPhase,
    eventPhase,
    gameStatePhase,
  };
}
