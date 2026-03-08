"use client";

import type { PlayerData, ScoreEntry } from "@flimflam/shared";
import { AVATAR_COLORS, generateAwards } from "@flimflam/shared";
import {
  ANIMATION_DURATIONS,
  ANIMATION_EASINGS,
  AnimatedCounter,
  ConfettiBurst,
  GlassPanel,
  emitMotionEvent,
  sounds,
  useReducedMotion,
} from "@flimflam/ui";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FinalScoresLayout, buildScores } from "@/components/game/FinalScoresLayout";
import { GameBoard } from "@/components/game/GameBoard";
import { PlayerStatus } from "@/components/game/PlayerStatus";
import { Timer } from "@/components/game/Timer";

import { QuickGuessInput } from "@/components/controls/QuickGuessInput";
// Controls
import { TextInput } from "@/components/controls/TextInput";
import { WaitingScreen } from "@/components/game/WaitingScreen";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SurveySmashGameProps {
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

interface TeamData {
  id: string;
  members: string[];
  score: number;
}
interface RevealedAnswer {
  text: string;
  points: number;
  rank: number;
}
interface FaceOffEntry {
  sessionId: string;
  answer: string;
  matchedRank: number | null;
}
interface LightningAnswer {
  question: string;
  answer: string;
  points: number;
  matched: boolean;
}
interface SurveyAnswer {
  text: string;
  points: number;
  rank: number;
}

interface FeudGameState {
  phase: string;
  round: number;
  totalRounds: number;
  teamMode: boolean;
  teams: TeamData[];
  question: string;
  answerCount: number;
  revealedAnswers: RevealedAnswer[];
  strikes: number;
  controllingTeamId: string;
  faceOffPlayers: string[];
  faceOffEntries: FaceOffEntry[];
  guessingOrder: string[];
  currentGuesserIndex: number;
  snagTeamId: string;
  lightningPlayerId: string;
  lightningCurrentIndex: number;
  lightningQuestionCount?: number;
  lightningAnswers: LightningAnswer[];
  lightningTotalPoints: number;
  roundGuesses: Array<{
    sessionId: string;
    answer: string;
    source: "face-off" | "guessing" | "steal";
    outcome: "match" | "miss" | "duplicate";
    matchedRank: number | null;
  }>;
  allAnswers: SurveyAnswer[];
  guessAlongSubmissions?: number;
  guessAlongEligible?: number;
  guessAlongPoints?: Array<{ sessionId: string; points: number }>;
  lastGuessAlongWinners?: string[];
  lastGuessAlongAnswer?: string | null;
  leaderboard?: ScoreEntry[];
}

const TEAM_COLORS: Record<string, { text: string; border: string; bg: string }> = {
  "team-a": {
    text: "oklch(0.72 0.24 25)",
    border: "oklch(0.72 0.24 25 / 0.4)",
    bg: "oklch(0.72 0.24 25 / 0.12)",
  },
  "team-b": {
    text: "oklch(0.72 0.2 250)",
    border: "oklch(0.72 0.2 250 / 0.45)",
    bg: "oklch(0.72 0.2 250 / 0.12)",
  },
};

const LR_SLOTS = ["lr0", "lr1", "lr2", "lr3", "lr4"];

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
function getTeamDisplayName(team: TeamData, players: PlayerData[], teamMode: boolean): string {
  if (teamMode) return team.id === "team-a" ? "Team A" : "Team B";
  const member = team.members[0];
  return member ? getPlayerName(players, member) : "???";
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

// ─── Answer Board (Host display) ────────────────────────────────────────────

function AnswerBoard({
  totalCount,
  revealedAnswers,
  allAnswers,
  showAll,
  maxRevealRank,
  revealStep,
  reducedMotion = false,
}: {
  totalCount: number;
  revealedAnswers: RevealedAnswer[];
  allAnswers?: SurveyAnswer[];
  showAll?: boolean;
  maxRevealRank?: number;
  revealStep?: number;
  reducedMotion?: boolean;
}) {
  const revealedRanks = new Set(revealedAnswers.map((a) => a.rank));
  const rows = Array.from({ length: totalCount }, (_, i) => i + 1);
  return (
    <div data-testid="survey-answer-board" className="flex w-full max-w-3xl flex-col gap-2">
      {rows.map((rank) => {
        const revealed = revealedAnswers.find((a) => a.rank === rank);
        const fullAnswer = allAnswers?.find((a) => a.rank === rank);
        const isRevealed = revealedRanks.has(rank);
        const canSequentiallyReveal = typeof maxRevealRank === "number";
        const shouldShow =
          isRevealed ||
          (showAll &&
            fullAnswer &&
            (!canSequentiallyReveal || rank <= (maxRevealRank ?? Number.POSITIVE_INFINITY)));
        const answer = revealed ?? fullAnswer;
        return (
          <motion.div
            key={rank}
            data-testid="survey-answer-tile"
            data-rank={rank}
            className="relative overflow-hidden rounded-lg"
          >
            <AnimatePresence mode="wait">
              {shouldShow && answer ? (
                <motion.div
                  key={`revealed-${rank}`}
                  initial={reducedMotion ? { opacity: 0 } : { rotateX: -90, opacity: 0 }}
                  animate={reducedMotion ? { opacity: 1 } : { rotateX: 0, opacity: 1 }}
                  transition={{
                    duration: reducedMotion
                      ? ANIMATION_DURATIONS.standard
                      : ANIMATION_DURATIONS.reveal,
                    ease: ANIMATION_EASINGS.crispOut,
                  }}
                  className="flex items-center justify-between rounded-lg border-2 border-accent-surveysmash/40 bg-bg-elevated px-6 py-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-surveysmash/20 font-display text-sm font-bold text-accent-surveysmash">
                      {rank}
                    </span>
                    <span className="font-display text-[clamp(18px,2.5vw,28px)] font-bold text-text-primary">
                      {answer.text}
                    </span>
                  </div>
                  <span className="font-mono text-[clamp(20px,2.5vw,28px)] font-bold text-accent-surveysmash">
                    {answer.points}
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key={`hidden-${rank}`}
                  className="flex items-center justify-between rounded-lg border border-white/12 bg-bg-surface px-6 py-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 font-display text-sm font-bold text-text-muted">
                      {rank}
                    </span>
                    <span className="font-body text-[clamp(16px,2vw,24px)] text-text-dim">
                      ? ? ?
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

function StrikeDisplay({ strikes }: { strikes: number }) {
  return (
    <div className="flex gap-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`flex h-16 w-16 items-center justify-center rounded-lg border-2 ${i < strikes ? "border-accent-6 bg-accent-6/20" : "border-white/15 bg-white/5"}`}
        >
          <span
            className={`font-display text-[32px] font-black ${i < strikes ? "text-accent-6" : "text-text-dim"}`}
          >
            X
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function SurveySmashGame({
  phase,
  round,
  totalRounds,
  players,
  gamePayload,
  privateData,
  gameEvents,
  mySessionId,
  isHost,
  timerEndTime,
  sendMessage,
  room,
  errorNonce,
}: SurveySmashGameProps) {
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
  const [_lastSubmittedText, setLastSubmittedText] = useState<string | null>(null);
  const [lastPrivateAction, setLastPrivateAction] = useState<string | null>(null);
  const [isTeamRosterOpen, setIsTeamRosterOpen] = useState(false);
  const prevStrikesRef = useRef(0);
  const prevPhaseRef = useRef(phase);
  const revealTimersRef = useRef<number[]>([]);
  const gameStatePhase =
    typeof gameState?.phase === "string" && gameState.phase.length > 0
      ? gameState.phase
      : undefined;
  const payloadPhase =
    typeof payloadGameState?.phase === "string" && payloadGameState.phase.length > 0
      ? payloadGameState.phase
      : null;
  const freshestSharedPhase = eventPhase ?? payloadPhase ?? gameStatePhase ?? null;
  const canonicalStatePhase =
    freshestSharedPhase === "lightning-round" ||
    freshestSharedPhase === "lightning-round-reveal" ||
    freshestSharedPhase === "final-scores"
      ? freshestSharedPhase
      : roomPhase ?? freshestSharedPhase;
  const baseCanonicalGameState = eventGameState ?? payloadGameState ?? gameState;
  const canonicalGameState =
    baseCanonicalGameState && canonicalStatePhase && baseCanonicalGameState.phase !== canonicalStatePhase
      ? { ...baseCanonicalGameState, phase: canonicalStatePhase }
      : baseCanonicalGameState;
  const canonicalPhase = canonicalStatePhase ?? phase;

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

  // ─── Controller handlers ────────────────────────────────────────
  const handleTextSubmit = useCallback(
    (text: string) => {
      setLastSubmittedText(text.trim());
      sendMessage("player:submit", { content: text });
    },
    [sendMessage],
  );
  const handleGuessAlongSubmit = useCallback(
    (text: string) => {
      setLastSubmittedText(text.trim());
      sendMessage("player:guess-along", { content: text });
    },
    [sendMessage],
  );

  useEffect(() => {
    if (typeof pd.action === "string" && pd.action.length > 0) {
      setLastPrivateAction(pd.action);
    }
  }, [pd.action]);

  // ─── Derived controller data ────────────────────────────────────
  const gs = (canonicalGameState ?? {}) as unknown as Record<string, unknown>;
  const isFaceOffPlayer = pd.action === "face-off-your-turn";
  const isCurrentGuesser = pd.action === "your-turn-to-guess";
  const isSnagTeam = pd.action === "snag-your-turn";
  const privatePhase =
    typeof pd.phase === "string" && pd.phase.length > 0 ? (pd.phase as string) : undefined;
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

    if (
      privatePhase === "question-reveal" ||
      privatePhase === "face-off" ||
      privatePhase === "guessing" ||
      privatePhase === "strike" ||
      privatePhase === "steal-chance" ||
      privatePhase === "answer-reveal" ||
      privatePhase === "round-result" ||
      privatePhase === "final-scores"
    ) {
      return privatePhase;
    }

    // Keep lightning interaction alive until the shared room phase exits the
    // round. Public game-data can jump to reveal slightly ahead of the room
    // patch, and the selected controller must not lose its input surface in
    // that gap.
    if (roomPhase === "lightning-round") return "lightning-round";

    // Public lightning phase is still authoritative when a single controller
    // lags on the room phase and would otherwise stay stranded on guessing UI.
    if (publicPhase === "lightning-round") return "lightning-round";

    if (publicPhase === "lightning-round-reveal") return "lightning-round-reveal";

    if (isLightningPlayer) return "lightning-round";

    // The shared room phase is the source of truth. Private action flags only decide
    // who is active inside interactive phases, so stale controller actions cannot
    // keep rendering an old input surface after the game has advanced.
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
    privatePhase,
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
  const boardWithState = (
    <div
      data-testid="survey-smash-host-state"
      data-phase={canonicalPhase}
      data-round={hostRound}
      data-total-rounds={hostTotalRounds}
      data-strikes={
        typeof canonicalGameState?.strikes === "number"
          ? String(canonicalGameState.strikes)
          : undefined
      }
      data-current-guesser-index={
        typeof canonicalGameState?.currentGuesserIndex === "number"
          ? String(canonicalGameState.currentGuesserIndex)
          : undefined
      }
      data-faceoff-submissions={
        Array.isArray(canonicalGameState?.faceOffEntries)
          ? String(canonicalGameState.faceOffEntries.length)
          : undefined
      }
      data-revealed-answer-count={
        Array.isArray(canonicalGameState?.revealedAnswers)
          ? String(canonicalGameState.revealedAnswers.length)
          : undefined
      }
      data-lightning-question-index={
        typeof canonicalGameState?.lightningCurrentIndex === "number"
          ? String(canonicalGameState.lightningCurrentIndex)
          : undefined
      }
      data-lightning-player-id={
        typeof canonicalGameState?.lightningPlayerId === "string"
          ? canonicalGameState.lightningPlayerId
          : undefined
      }
      className="contents"
    >
      {renderBoard()}
    </div>
  );

  const wrapControls = (controls: React.ReactNode) => (
    <div
      data-testid="survey-smash-control-state"
      data-phase={controllerPhase}
      data-my-session-id={mySessionId ?? undefined}
      data-is-host={isHost ? "true" : "false"}
      data-is-lightning-player={isLightningPlayer ? "true" : "false"}
      data-last-private-action={lastPrivateAction ?? undefined}
      data-room-phase={roomPhase}
      data-event-phase={eventPhase}
      data-game-state-phase={gameStatePhase}
      data-lightning-question-index={controlLightningQuestionIndex}
      data-lightning-question-count={controlLightningQuestionCount}
    >
      <div key={controlRenderKey}>{controls}</div>
    </div>
  );

  // ─── Board renderer ─────────────────────────────────────────────
  function renderBoard(): React.ReactNode {
    const state = canonicalGameState;
    if (!state) {
      return (
        <div className="flex items-center justify-center p-8">
          <p className="font-display text-[48px] text-accent-surveysmash animate-glow-pulse">
            Loading Survey Smash...
          </p>
        </div>
      );
    }

    const teams = Array.isArray(state.teams) ? state.teams : [];
    const teamMode = Boolean(state.teamMode);
    const question = typeof state.question === "string" ? state.question : "";
    const revealedAnswers = Array.isArray(state.revealedAnswers) ? state.revealedAnswers : [];
    const answerCount =
      typeof state.answerCount === "number" && Number.isFinite(state.answerCount)
        ? state.answerCount
        : revealedAnswers.length;
    const faceOffPlayers = Array.isArray(state.faceOffPlayers) ? state.faceOffPlayers : [];
    const faceOffEntries = Array.isArray(state.faceOffEntries) ? state.faceOffEntries : [];
    const guessingOrder = Array.isArray(state.guessingOrder) ? state.guessingOrder : [];
    const currentGuesserIndex =
      typeof state.currentGuesserIndex === "number" && Number.isFinite(state.currentGuesserIndex)
        ? state.currentGuesserIndex
        : 0;
    const activeGuesser = guessingOrder[currentGuesserIndex] ?? null;
    const strikes =
      typeof state.strikes === "number" && Number.isFinite(state.strikes) ? state.strikes : 0;
    const controllingTeamId =
      typeof state.controllingTeamId === "string" ? state.controllingTeamId : "";
    const snagTeamId = typeof state.snagTeamId === "string" ? state.snagTeamId : "";
    const lightningAnswers = Array.isArray(state.lightningAnswers) ? state.lightningAnswers : [];

    const teamScoreBar = (
      <div className="flex justify-center gap-8 mt-4">
        {teams.map((team) => {
          const displayName = getTeamDisplayName(team, players, teamMode);
          const isControlling = team.id === controllingTeamId;
          const visual = TEAM_COLORS[team.id] ?? {
            text: "oklch(0.74 0.25 25)",
            border: "oklch(0.74 0.25 25 / 0.3)",
            bg: "oklch(0.74 0.25 25 / 0.12)",
          };
          return (
            <div
              key={team.id}
              className="flex items-center gap-3 rounded-xl px-6 py-3 transition-all"
              style={{
                backgroundColor: isControlling ? visual.bg : "oklch(1 0 0 / 0.08)",
                border: `1px solid ${isControlling ? visual.border : "oklch(1 0 0 / 0.1)"}`,
              }}
            >
              <span className="font-display text-[clamp(20px,2.5vw,28px)] font-bold text-text-primary">
                {displayName}
              </span>
              <AnimatedCounter
                value={team.score}
                duration={900}
                className="text-[clamp(20px,2.5vw,28px)] font-bold"
                style={{ color: visual.text }}
              />
            </div>
          );
        })}
      </div>
    );

    const strikeOverlay = showStrikeOverlay && (
      <motion.div
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
        animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
        className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: reducedMotion ? [0, 0.2, 0] : [0, 0.3, 0] }}
          transition={{
            duration: reducedMotion ? ANIMATION_DURATIONS.standard : 0.45,
            ease: ANIMATION_EASINGS.snapIn,
          }}
          className="absolute inset-0 bg-accent-6"
        />
        <span
          className="font-display text-[200px] font-black text-accent-6"
          style={{ textShadow: "0 0 60px oklch(0.68 0.25 20 / 0.6)" }}
        >
          X
        </span>
      </motion.div>
    );

    // ── Question Reveal ──
    if (canonicalPhase === "question-reveal") {
      return (
        <div className="flex flex-col items-center justify-center gap-8 p-8">
          {strikeOverlay}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-[clamp(24px,3vw,36px)] text-accent-surveysmash uppercase tracking-wider"
          >
            Round {state.round} of {state.totalRounds}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
          >
            <GlassPanel
              glow
              glowColor="oklch(0.68 0.25 25 / 0.3)"
              className="max-w-4xl px-12 py-10"
            >
              <p className="text-center font-display text-[clamp(32px,4.5vw,56px)] font-bold leading-snug text-text-primary">
                {question}
              </p>
            </GlassPanel>
          </motion.div>
          {teamScoreBar}
        </div>
      );
    }

    // ── Face-Off ──
    if (canonicalPhase === "face-off") {
      const player1 = faceOffPlayers[0];
      const player2 = faceOffPlayers[1];
      const name1 = getPlayerName(players, player1 ?? null);
      const name2 = getPlayerName(players, player2 ?? null);
      const color1 = getPlayerColor(players, player1 ?? null);
      const color2 = getPlayerColor(players, player2 ?? null);
      const submittedCount = faceOffEntries.length;
      const expectedCount = faceOffPlayers.length;
      return (
        <div className="flex flex-col items-center justify-center gap-6 p-8">
          {strikeOverlay}
          <GlassPanel className="max-w-4xl px-10 py-6 mb-4">
            <p className="text-center font-display text-[clamp(24px,3vw,40px)] font-bold text-text-primary">
              {question}
            </p>
          </GlassPanel>
          <div className="flex items-center gap-8">
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 120 }}
              className="flex flex-col items-center gap-3"
            >
              <PlayerAvatar name={name1} color={color1} size={80} />
              <span className="font-display text-[clamp(24px,3vw,36px)] font-bold text-text-primary">
                {name1}
              </span>
              {faceOffEntries.some((e) => e.sessionId === player1) && (
                <motion.span
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="font-display text-[20px] text-success"
                >
                  Answered!
                </motion.span>
              )}
            </motion.div>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="font-display text-[clamp(48px,7vw,80px)] font-black text-accent-surveysmash"
              style={{ textShadow: "0 0 30px oklch(0.68 0.25 25 / 0.5)" }}
            >
              VS
            </motion.span>
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 120 }}
              className="flex flex-col items-center gap-3"
            >
              <PlayerAvatar name={name2} color={color2} size={80} />
              <span className="font-display text-[clamp(24px,3vw,36px)] font-bold text-text-primary">
                {name2}
              </span>
              {faceOffEntries.some((e) => e.sessionId === player2) && (
                <motion.span
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="font-display text-[20px] text-success"
                >
                  Answered!
                </motion.span>
              )}
            </motion.div>
          </div>
          <GlassPanel
            data-testid="submission-progress"
            className="flex flex-col items-center gap-1 px-5 py-3"
          >
            <span className="font-display text-xs font-bold uppercase tracking-[0.18em] text-accent-surveysmash">
              Submission Progress
            </span>
            <span className="font-body text-sm text-text-muted">
              {submittedCount}/{expectedCount} submitted
            </span>
          </GlassPanel>
          {timerEndTime && <Timer endTime={timerEndTime} size={100} />}
          {teamScoreBar}
        </div>
      );
    }

    // ── Guessing ──
    if (canonicalPhase === "guessing") {
      const guesserName = getPlayerName(players, activeGuesser);
      const guesserColor = getPlayerColor(players, activeGuesser);
      const guessAlongEligible = state.guessAlongEligible ?? 0;
      const guessAlongSubmissions = state.guessAlongSubmissions ?? 0;
      return (
        <div className="flex flex-col items-center justify-center gap-6 p-6">
          {strikeOverlay}
          <GlassPanel className="max-w-3xl px-8 py-4">
            <p className="text-center font-display text-[clamp(20px,2.5vw,32px)] font-bold text-text-primary">
              {question}
            </p>
          </GlassPanel>
          <div className="flex items-start gap-8 w-full max-w-5xl">
            <div className="flex-1">
              <AnswerBoard
                totalCount={answerCount}
                revealedAnswers={revealedAnswers}
                reducedMotion={reducedMotion}
              />
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <PlayerAvatar name={guesserName} color={guesserColor} size={56} />
                <div className="flex flex-col">
                  <span className="font-display text-[clamp(24px,3vw,32px)] font-bold text-text-primary">
                    {guesserName}
                  </span>
                  <span className="font-body text-[18px] text-text-muted">is guessing...</span>
                </div>
              </div>
              {guessAlongEligible > 0 && (
                <GlassPanel
                  data-testid="guess-along-status"
                  className="flex flex-col items-center gap-1 px-4 py-3"
                >
                  <span className="font-display text-xs font-bold uppercase tracking-[0.18em] text-accent-surveysmash">
                    Guess Along
                  </span>
                  <span className="font-body text-sm text-text-muted">
                    {guessAlongSubmissions}/{guessAlongEligible} spectators submitted
                  </span>
                </GlassPanel>
              )}
              <StrikeDisplay strikes={strikes} />
              {timerEndTime && <Timer endTime={timerEndTime} size={100} />}
            </div>
          </div>
          {teamScoreBar}
        </div>
      );
    }

    // ── Strike ──
    if (canonicalPhase === "strike") {
      const guesserName = getPlayerName(players, activeGuesser);
      const guesserColor = getPlayerColor(players, activeGuesser);
      return (
        <div className="flex flex-col items-center justify-center gap-6 p-6">
          {strikeOverlay}
          <GlassPanel className="max-w-3xl px-8 py-4">
            <p className="text-center font-display text-[clamp(20px,2.5vw,32px)] font-bold text-text-primary">
              {question}
            </p>
          </GlassPanel>
          <div className="flex items-start gap-8 w-full max-w-5xl">
            <div className="flex-1">
              <AnswerBoard
                totalCount={answerCount}
                revealedAnswers={revealedAnswers}
                reducedMotion={reducedMotion}
              />
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <PlayerAvatar name={guesserName} color={guesserColor} size={56} />
                <span className="font-display text-[clamp(24px,3vw,32px)] font-bold text-text-primary">
                  {guesserName}
                </span>
              </div>
              <StrikeDisplay strikes={strikes} />
            </div>
          </div>
          {teamScoreBar}
        </div>
      );
    }

    // ── Steal Chance ──
    if (canonicalPhase === "steal-chance") {
      const snagTeam = teams.find((t) => t.id === snagTeamId);
      const snagName = snagTeam ? getTeamDisplayName(snagTeam, players, teamMode) : "???";
      return (
        <div className="flex flex-col items-center justify-center gap-6 p-6">
          {strikeOverlay}
          <GlassPanel className="max-w-3xl px-8 py-4">
            <p className="text-center font-display text-[clamp(20px,2.5vw,32px)] font-bold text-text-primary">
              {question}
            </p>
          </GlassPanel>
          <div className="flex items-start gap-8 w-full max-w-5xl">
            <div className="flex-1">
              <AnswerBoard
                totalCount={answerCount}
                revealedAnswers={revealedAnswers}
                reducedMotion={reducedMotion}
              />
            </div>
            <div className="flex flex-col items-center gap-6">
              <StrikeDisplay strikes={strikes} />
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 150 }}
                className="flex flex-col items-center gap-3"
              >
                <span className="font-display text-[clamp(28px,3.5vw,40px)] font-black text-accent-surveysmash uppercase">
                  SNAG!
                </span>
                <span className="font-display text-[clamp(24px,3vw,36px)] font-bold text-text-primary">
                  {snagName}
                </span>
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                  className="font-body text-[clamp(18px,2vw,24px)] text-text-muted"
                >
                  Can they snag the points?
                </motion.span>
              </motion.div>
              {timerEndTime && <Timer endTime={timerEndTime} size={100} />}
            </div>
          </div>
          {teamScoreBar}
        </div>
      );
    }

    // ── Answer Reveal ──
    if (canonicalPhase === "answer-reveal") {
      const totalAnswers = state.allAnswers?.length || state.answerCount || 0;
      const resolvedCount = Math.min(totalAnswers, sequentialRevealCount);
      return (
        <div className="flex flex-col items-center justify-center gap-6 p-8">
          {strikeOverlay}
          <h2 className="font-display text-[clamp(32px,4vw,48px)] text-accent-surveysmash font-bold uppercase tracking-wider">
            The People Say...
          </h2>
          <GlassPanel className="max-w-3xl px-8 py-4 mb-2">
            <p className="text-center font-display text-[clamp(20px,2.5vw,32px)] font-bold text-text-primary">
              {question}
            </p>
          </GlassPanel>
          <AnswerBoard
            totalCount={answerCount}
            revealedAnswers={revealedAnswers}
            allAnswers={state.allAnswers}
            showAll
            maxRevealRank={dramaticStage === "reveal" ? sequentialRevealCount : 0}
            revealStep={resolvedCount}
            reducedMotion={reducedMotion}
          />
          {teamScoreBar}
        </div>
      );
    }

    // ── Round Result ──
    if (canonicalPhase === "round-result") {
      const controllingTeam = teams.find((t) => t.id === controllingTeamId);
      const winnerName = controllingTeam
        ? getTeamDisplayName(controllingTeam, players, teamMode)
        : "Nobody";
      return (
        <div className="flex flex-col items-center justify-center gap-8 p-8">
          {strikeOverlay}
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-[clamp(32px,4vw,48px)] text-accent-surveysmash font-bold uppercase"
          >
            Round {state.round} Complete!
          </motion.h2>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="flex flex-col items-center gap-3"
          >
            <span className="font-display text-[clamp(36px,4.5vw,56px)] font-black text-text-primary">
              {winnerName} wins!
            </span>
          </motion.div>
          <div className="flex gap-8">
            {teams.map((team) => {
              const displayName = getTeamDisplayName(team, players, teamMode);
              return (
                <GlassPanel
                  key={team.id}
                  glow={team.id === controllingTeamId}
                  glowColor="oklch(0.68 0.25 25 / 0.3)"
                  className="flex flex-col items-center gap-2 px-10 py-6"
                >
                  <span className="font-display text-[clamp(24px,3vw,36px)] font-bold text-text-primary">
                    {displayName}
                  </span>
                  <span className="font-mono text-[clamp(32px,4vw,48px)] font-bold text-accent-surveysmash">
                    {team.score.toLocaleString()}
                  </span>
                </GlassPanel>
              );
            })}
          </div>
          <ConfettiBurst trigger preset="correct" />
        </div>
      );
    }

    // ── Lightning Round ──
    if (canonicalPhase === "lightning-round") {
      const lrPlayerName = getPlayerName(players, state.lightningPlayerId);
      const lrPlayerColor = getPlayerColor(players, state.lightningPlayerId);
      return (
        <div className="flex flex-col items-center justify-center gap-6 p-8">
          <motion.h1
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="font-display text-[clamp(40px,5.5vw,64px)] font-black text-accent-surveysmash"
            style={{ textShadow: "0 0 30px oklch(0.68 0.25 25 / 0.5)" }}
          >
            LIGHTNING ROUND!
          </motion.h1>
          <div className="flex items-center gap-4">
            <PlayerAvatar name={lrPlayerName} color={lrPlayerColor} size={64} />
            <span className="font-display text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary">
              {lrPlayerName}
            </span>
          </div>
          <div className="flex gap-3">
            {LR_SLOTS.map((slotKey, i) => {
              const answer = lightningAnswers[i];
              return (
                <div
                  key={slotKey}
                  className={`flex items-center justify-center rounded-lg border ${answer ? (answer.matched ? "border-success bg-success/15" : "border-accent-6 bg-accent-6/10") : i === state.lightningCurrentIndex ? "border-accent-surveysmash bg-accent-surveysmash/10" : "border-white/[0.15] bg-white/[0.10]"}`}
                  style={{ width: 56, height: 56 }}
                >
                  <span
                    className={`font-mono text-[24px] font-bold ${answer ? (answer.matched ? "text-success" : "text-accent-6") : "text-text-muted"}`}
                  >
                    {answer ? answer.points : i + 1}
                  </span>
                </div>
              );
            })}
          </div>
          <span className="font-mono text-[clamp(28px,3.5vw,44px)] font-bold text-accent-surveysmash">
            Total: {state.lightningTotalPoints} pts
          </span>
          {timerEndTime && <Timer endTime={timerEndTime} size={100} />}
        </div>
      );
    }

    // ── Lightning Round Reveal ──
    if (canonicalPhase === "lightning-round-reveal") {
      const lrPlayerName = getPlayerName(players, state.lightningPlayerId);
      const lrPlayerColor = getPlayerColor(players, state.lightningPlayerId);
      const hitThreshold = state.lightningTotalPoints >= 200;
      return (
        <div className="flex flex-col items-center justify-center gap-6 p-8">
          <h1
            className="font-display text-[clamp(36px,5vw,56px)] font-black text-accent-surveysmash"
            style={{ textShadow: "0 0 24px oklch(0.68 0.25 25 / 0.4)" }}
          >
            LIGHTNING ROUND RESULTS
          </h1>
          <div className="flex items-center gap-4">
            <PlayerAvatar name={lrPlayerName} color={lrPlayerColor} size={56} />
            <span className="font-display text-[clamp(24px,3vw,36px)] font-bold text-text-primary">
              {lrPlayerName}
            </span>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-2xl">
            {lightningAnswers.map((answer, i) => (
              <motion.div
                key={`lra-${answer.question}`}
                data-testid="survey-smash-lightning-result-row"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.3 }}
              >
                <GlassPanel className="flex items-center justify-between px-6 py-3">
                  <div className="flex flex-col">
                    <span className="font-body text-[clamp(14px,1.5vw,18px)] text-text-muted">
                      {answer.question}
                    </span>
                    <span className="font-display text-[clamp(20px,2.5vw,28px)] font-bold text-text-primary">
                      {answer.answer}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-[clamp(24px,3vw,36px)] font-bold ${answer.matched ? "text-success" : "text-accent-6"}`}
                  >
                    {answer.points}
                  </span>
                </GlassPanel>
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.5 }}
            className="flex flex-col items-center gap-2"
          >
            <span
              data-testid="survey-smash-lightning-total"
              className="font-mono text-[clamp(36px,4.5vw,56px)] font-black text-accent-surveysmash"
            >
              {state.lightningTotalPoints} POINTS
            </span>
            {hitThreshold && (
              <span className="font-display text-[clamp(24px,3vw,36px)] text-success font-bold">
                BONUS UNLOCKED! +10,000 pts
              </span>
            )}
          </motion.div>
          <ConfettiBurst trigger={hitThreshold} preset="win" />
        </div>
      );
    }

    // ── Final Scores ──
    if (canonicalPhase === "final-scores") {
      const scores: ScoreEntry[] = state.leaderboard ?? buildScores(players);
      const awards = generateAwards(
        players
          .filter((p) => !p.isHost)
          .map((p) => ({
            name: p.name,
            sessionId: p.sessionId,
            score: p.score,
            correctCount: p.progressOrCustomInt,
          })),
        "survey-smash",
      );
      return (
        <div>
          {teamMode && (
            <div className="flex justify-center gap-8 pt-8">
              {teams.map((team) => (
                <GlassPanel
                  key={team.id}
                  glow
                  glowColor="oklch(0.68 0.25 25 / 0.3)"
                  className="flex flex-col items-center gap-2 px-8 py-4"
                >
                  <span className="font-display text-[clamp(20px,2.5vw,28px)] font-bold text-text-primary">
                    {getTeamDisplayName(team, players, teamMode)}
                  </span>
                  <span className="font-mono text-[clamp(28px,3.5vw,40px)] font-bold text-accent-surveysmash">
                    {team.score.toLocaleString()}
                  </span>
                </GlassPanel>
              ))}
            </div>
          )}
          <FinalScoresLayout
            scores={scores}
            accentColorClass="text-accent-surveysmash"
            gameId="survey-smash"
            gameAwards={awards}
            room={room as any}
          />
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center p-8">
        <p className="font-display text-[48px] text-text-muted">Survey Smash: {canonicalPhase}</p>
      </div>
    );
  }

  // ─── Controls renderer ──────────────────────────────────────────
  function renderControls(): React.ReactNode {
    const question =
      typeof pd.question === "string"
        ? pd.question
        : typeof gs.question === "string"
          ? gs.question
          : "";
    const activePhase = controllerPhase;

    // Team badge for controls
    const teamBadge = myTeamLabel ? (
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => setIsTeamRosterOpen((o) => !o)}
          data-testid="team-pill"
          className="rounded-full border border-accent-surveysmash/35 bg-accent-surveysmash/15 px-3 py-1 font-display text-xs font-bold uppercase tracking-wider text-accent-surveysmash transition-all active:scale-95"
        >
          {myTeamLabel}
        </button>
        {isTeamRosterOpen && surveyTeams.length > 0 && (
          <GlassPanel
            data-testid="team-roster-sheet"
            className="w-[min(92vw,360px)] rounded-2xl border border-accent-surveysmash/30 px-4 py-3"
          >
            <p className="mb-2 text-center font-display text-xs font-bold uppercase tracking-wider text-accent-surveysmash">
              Team Roster
            </p>
            <div className="flex flex-col gap-2">
              {surveyTeams.map((team, idx) => {
                const label =
                  team.id === "team-a"
                    ? "Team A"
                    : team.id === "team-b"
                      ? "Team B"
                      : `Team ${idx + 1}`;
                const isMine = myTeamId !== null && team.id === myTeamId;
                const names =
                  team.members.length > 0
                    ? team.members
                        .map((sid) => players.find((p) => p.sessionId === sid)?.name ?? "Player")
                        .join(", ")
                    : "No players";
                return (
                  <div
                    key={`roster-${team.id}`}
                    className={`rounded-lg border px-3 py-2 ${isMine ? "border-accent-surveysmash/45 bg-accent-surveysmash/12" : "border-white/10 bg-white/5"}`}
                  >
                    <p className="font-display text-[11px] font-bold uppercase tracking-wide text-text-primary">
                      {label}
                      {isMine ? " (You)" : ""}
                    </p>
                    <p className="font-body text-xs text-text-muted">{names}</p>
                  </div>
                );
              })}
            </div>
          </GlassPanel>
        )}
      </div>
    ) : null;

    // ── Face-Off ──
    if (activePhase === "face-off") {
      if (isFaceOffPlayer) {
        return (
          <div data-testid="survey-smash-faceoff-input" className="flex flex-col gap-4 pb-4 pt-4">
            {teamBadge}
            <TextInput
              prompt={question || "Name the top answer!"}
              placeholder="Type your answer..."
              onSubmit={handleTextSubmit}
              resetNonce={errorNonce}
            />
          </div>
        );
      }
      return (
        <div className="flex flex-col items-center gap-4 px-4 pb-4 pt-6">
          <GlassPanel className="flex flex-col items-center gap-3 px-6 py-5">
            <p className="font-display text-base font-bold uppercase text-accent-surveysmash">
              Face-Off
            </p>
            {question && (
              <p className="text-center font-display text-sm font-bold text-text-primary">
                {question}
              </p>
            )}
          </GlassPanel>
          {teamBadge}
        </div>
      );
    }

    // ── Guessing ──
    if (activePhase === "guessing") {
      if (isCurrentGuesser) {
        return (
          <div data-testid="survey-smash-guesser-input" className="flex flex-col gap-4 pb-4 pt-4">
            {teamBadge}
            <TextInput
              prompt={question || "Name something..."}
              placeholder="Type your answer..."
              onSubmit={handleTextSubmit}
              resetNonce={errorNonce}
            />
          </div>
        );
      }
      if (isGuessAlongPlayer) {
        return (
          <div
            data-testid="survey-smash-guess-along-input"
            className="flex flex-col gap-4 pb-4 pt-4"
          >
            {teamBadge}
            {guessAlongPoints !== null && (
              <div className="mx-4 flex justify-center">
                <span className="rounded-full border border-accent-surveysmash/30 bg-accent-surveysmash/12 px-3 py-1 font-mono text-xs font-bold text-accent-surveysmash">
                  Guess Along: {guessAlongPoints.toLocaleString()} pts
                </span>
              </div>
            )}
            <TextInput
              prompt={`Guess Along: ${question}`}
              placeholder="Predict a board answer..."
              onSubmit={handleGuessAlongSubmit}
              resetNonce={errorNonce}
            />
          </div>
        );
      }
      return (
        <div className="flex flex-col items-center gap-4 px-4 pb-4 pt-6">
          <GlassPanel
            data-testid="controller-context-card"
            className="flex flex-col items-center gap-3 px-6 py-5"
          >
            {question && (
              <p className="text-center font-display text-sm font-bold text-text-primary">
                {question}
              </p>
            )}
            <p className="font-body text-xs text-text-muted">Watching the guesses...</p>
          </GlassPanel>
          {teamBadge}
        </div>
      );
    }

    // ── Steal Chance ──
    if (activePhase === "steal-chance") {
      if (isSnagTeam) {
        return (
          <div className="flex flex-col gap-4 pb-4 pt-4" data-testid="survey-smash-steal-input">
            {teamBadge}
            <TextInput
              prompt={`Snag it! ${question}`}
              placeholder="Type your snag answer..."
              onSubmit={handleTextSubmit}
              resetNonce={errorNonce}
            />
          </div>
        );
      }
      return (
        <div className="flex flex-col items-center gap-4 px-4 pb-4 pt-6">
          <GlassPanel
            data-testid="controller-context-card"
            className="flex flex-col items-center gap-3 px-6 py-5"
          >
            <p className="font-display text-xs font-bold text-accent-surveysmash uppercase">
              Snag attempt!
            </p>
            {question && (
              <p className="text-center font-body text-sm text-text-muted">{question}</p>
            )}
          </GlassPanel>
          {teamBadge}
        </div>
      );
    }

    // ── Lightning Round ──
    if (activePhase === "lightning-round") {
      const qIndex =
        typeof pd.questionIndex === "number"
          ? pd.questionIndex + 1
          : typeof gs.lightningCurrentIndex === "number"
            ? Number(gs.lightningCurrentIndex) + 1
            : "?";
      const totalQ =
        typeof pd.totalQuestions === "number"
          ? pd.totalQuestions
          : typeof gs.lightningQuestionCount === "number"
            ? Number(gs.lightningQuestionCount)
            : "?";
      if (isLightningPlayer) {
        return (
          <div className="flex flex-col gap-4 pb-4 pt-4">
            {teamBadge}
            <div className="flex justify-center">
              <span className="rounded-full bg-accent-surveysmash/15 px-3 py-1 font-mono text-xs font-bold text-accent-surveysmash">
                {qIndex}/{totalQ}
              </span>
            </div>
            <div data-testid="survey-smash-lightning-input">
              <QuickGuessInput
                prompt={question || "Quick!"}
                placeholder="Quick! Type your answer..."
                onSubmit={handleTextSubmit}
              />
            </div>
          </div>
        );
      }
      return (
        <div className="flex flex-col items-center gap-4 px-4 pb-4 pt-6">
          <GlassPanel
            data-testid="controller-context-card"
            className="flex flex-col items-center gap-3 px-6 py-5"
          >
            <p className="font-display text-lg font-bold text-accent-surveysmash uppercase">
              Lightning Round
            </p>
            <span className="rounded-full bg-accent-surveysmash/15 px-3 py-1 font-mono text-xs font-bold text-accent-surveysmash">
              {qIndex}/{totalQ}
            </span>
          </GlassPanel>
          {teamBadge}
        </div>
      );
    }

    // ── Watch-only phases ──
    if (
      [
        "question-reveal",
        "strike",
        "answer-reveal",
        "round-result",
        "lightning-round-reveal",
      ].includes(activePhase)
    ) {
      return (
        <div className="flex flex-col items-center gap-4 px-4 pb-4 pt-6">
          <GlassPanel
            data-testid="controller-context-card"
            className="flex flex-col items-center gap-3 px-6 py-5"
          >
            <p className="text-center font-body text-lg text-text-muted">Watch the board!</p>
          </GlassPanel>
          {teamBadge}
        </div>
      );
    }

    // ── Final Scores ──
    if (activePhase === "final-scores") {
      return (
        <div className="flex flex-col items-center gap-4 px-4 pb-4 pt-4">
          <p className="text-center font-body text-sm text-text-muted">
            Check the board for full results!
          </p>
        </div>
      );
    }

    return <WaitingScreen phase={activePhase} gameId="survey-smash" />;
  }

  // ─── Layout ──────────────────────────────────────────────────────
  if (canonicalPhase === "final-scores") {
    return (
      <div className="flex min-h-dvh flex-col">
        {boardWithState}
        <div className="border-t border-white/10 bg-bg-deep/80 backdrop-blur-sm p-4">
          {wrapControls(renderControls())}
        </div>
      </div>
    );
  }

  return (
    <GameBoard
      board={boardWithState}
      controls={wrapControls(
        <>
          <PlayerStatus
            turnPlayerName={null}
            isMyTurn={hasActiveAction}
            message={
              hasActiveAction
                ? controllerPhase === "guessing" && isGuessAlongPlayer && !isCurrentGuesser
                  ? "Guess along!"
                  : "Your turn!"
                : undefined
            }
          />
          {renderControls()}
        </>,
      )}
    />
  );
}
