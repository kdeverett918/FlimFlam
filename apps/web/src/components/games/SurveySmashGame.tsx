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

  // ─── Host state ──────────────────────────────────────────────────
  const [gameState, setGameState] = useState<FeudGameState | null>(null);
  const [showStrikeOverlay, setShowStrikeOverlay] = useState(false);
  const [strikeFxNonce, setStrikeFxNonce] = useState(0);
  const [dramaticStage, setDramaticStage] = useState<"idle" | "pause" | "build" | "reveal">("idle");
  const [sequentialRevealCount, setSequentialRevealCount] = useState(0);
  const [_lastSubmittedText, setLastSubmittedText] = useState<string | null>(null);
  const [isTeamRosterOpen, setIsTeamRosterOpen] = useState(false);
  const prevStrikesRef = useRef(0);
  const prevPhaseRef = useRef(phase);
  const revealTimersRef = useRef<number[]>([]);

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
    if (!gameState) return;
    if (prevPhaseRef.current !== gameState.phase) {
      if (["question-reveal", "face-off", "answer-reveal"].includes(gameState.phase))
        sounds.reveal();
      if (["round-result", "lightning-round-reveal"].includes(gameState.phase)) sounds.win();
      prevPhaseRef.current = gameState.phase;
    }
  }, [gameState]);

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
    if (!gameState || phase !== "answer-reveal") {
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
        const total = gameState.allAnswers?.length || gameState.answerCount || 0;
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
  }, [phase, gameState, clearRevealTimers]);

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

  // ─── Derived controller data ────────────────────────────────────
  const gs = (gameEvents?.["game-state"] ?? {}) as Record<string, unknown>;
  const isFaceOffPlayer = pd.action === "face-off-your-turn";
  const isCurrentGuesser = pd.action === "your-turn-to-guess";
  const isSnagTeam = pd.action === "snag-your-turn";
  const isLightningPlayer = pd.action === "lightning-question";
  const isGuessAlongPlayer = pd.action === "guess-along";
  const hasActiveAction = isFaceOffPlayer || isCurrentGuesser || isSnagTeam || isLightningPlayer;

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

  // ─── Board renderer ─────────────────────────────────────────────
  function renderBoard(): React.ReactNode {
    const state = gameState;
    if (!state) {
      return (
        <div className="flex items-center justify-center p-8">
          <p className="font-display text-[48px] text-accent-surveysmash animate-glow-pulse">
            Loading Survey Smash...
          </p>
        </div>
      );
    }

    const teamScoreBar = (
      <div className="flex justify-center gap-8 mt-4">
        {state.teams.map((team) => {
          const displayName = getTeamDisplayName(team, players, state.teamMode);
          const isControlling = team.id === state.controllingTeamId;
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
    if (phase === "question-reveal") {
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
                {state.question}
              </p>
            </GlassPanel>
          </motion.div>
          {teamScoreBar}
        </div>
      );
    }

    // ── Face-Off ──
    if (phase === "face-off") {
      const player1 = state.faceOffPlayers[0];
      const player2 = state.faceOffPlayers[1];
      const name1 = getPlayerName(players, player1 ?? null);
      const name2 = getPlayerName(players, player2 ?? null);
      const color1 = getPlayerColor(players, player1 ?? null);
      const color2 = getPlayerColor(players, player2 ?? null);
      return (
        <div className="flex flex-col items-center justify-center gap-6 p-8">
          {strikeOverlay}
          <GlassPanel className="max-w-4xl px-10 py-6 mb-4">
            <p className="text-center font-display text-[clamp(24px,3vw,40px)] font-bold text-text-primary">
              {state.question}
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
              {state.faceOffEntries.some((e) => e.sessionId === player1) && (
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
              {state.faceOffEntries.some((e) => e.sessionId === player2) && (
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
          {timerEndTime && <Timer endTime={timerEndTime} size={100} />}
          {teamScoreBar}
        </div>
      );
    }

    // ── Guessing ──
    if (phase === "guessing") {
      const currentGuesser = state.guessingOrder[state.currentGuesserIndex];
      const guesserName = getPlayerName(players, currentGuesser ?? null);
      const guesserColor = getPlayerColor(players, currentGuesser ?? null);
      return (
        <div className="flex flex-col items-center justify-center gap-6 p-6">
          {strikeOverlay}
          <GlassPanel className="max-w-3xl px-8 py-4">
            <p className="text-center font-display text-[clamp(20px,2.5vw,32px)] font-bold text-text-primary">
              {state.question}
            </p>
          </GlassPanel>
          <div className="flex items-start gap-8 w-full max-w-5xl">
            <div className="flex-1">
              <AnswerBoard
                totalCount={state.answerCount}
                revealedAnswers={state.revealedAnswers}
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
              <StrikeDisplay strikes={state.strikes} />
              {timerEndTime && <Timer endTime={timerEndTime} size={100} />}
            </div>
          </div>
          {teamScoreBar}
        </div>
      );
    }

    // ── Strike ──
    if (phase === "strike") {
      const currentGuesser = state.guessingOrder[state.currentGuesserIndex];
      const guesserName = getPlayerName(players, currentGuesser ?? null);
      const guesserColor = getPlayerColor(players, currentGuesser ?? null);
      return (
        <div className="flex flex-col items-center justify-center gap-6 p-6">
          {strikeOverlay}
          <GlassPanel className="max-w-3xl px-8 py-4">
            <p className="text-center font-display text-[clamp(20px,2.5vw,32px)] font-bold text-text-primary">
              {state.question}
            </p>
          </GlassPanel>
          <div className="flex items-start gap-8 w-full max-w-5xl">
            <div className="flex-1">
              <AnswerBoard
                totalCount={state.answerCount}
                revealedAnswers={state.revealedAnswers}
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
              <StrikeDisplay strikes={state.strikes} />
            </div>
          </div>
          {teamScoreBar}
        </div>
      );
    }

    // ── Steal Chance ──
    if (phase === "steal-chance") {
      const snagTeam = state.teams.find((t) => t.id === state.snagTeamId);
      const snagName = snagTeam ? getTeamDisplayName(snagTeam, players, state.teamMode) : "???";
      return (
        <div className="flex flex-col items-center justify-center gap-6 p-6">
          {strikeOverlay}
          <GlassPanel className="max-w-3xl px-8 py-4">
            <p className="text-center font-display text-[clamp(20px,2.5vw,32px)] font-bold text-text-primary">
              {state.question}
            </p>
          </GlassPanel>
          <div className="flex items-start gap-8 w-full max-w-5xl">
            <div className="flex-1">
              <AnswerBoard
                totalCount={state.answerCount}
                revealedAnswers={state.revealedAnswers}
                reducedMotion={reducedMotion}
              />
            </div>
            <div className="flex flex-col items-center gap-6">
              <StrikeDisplay strikes={state.strikes} />
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
    if (phase === "answer-reveal") {
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
              {state.question}
            </p>
          </GlassPanel>
          <AnswerBoard
            totalCount={state.answerCount}
            revealedAnswers={state.revealedAnswers}
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
    if (phase === "round-result") {
      const controllingTeam = state.teams.find((t) => t.id === state.controllingTeamId);
      const winnerName = controllingTeam
        ? getTeamDisplayName(controllingTeam, players, state.teamMode)
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
            {state.teams.map((team) => {
              const displayName = getTeamDisplayName(team, players, state.teamMode);
              return (
                <GlassPanel
                  key={team.id}
                  glow={team.id === state.controllingTeamId}
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
    if (phase === "lightning-round") {
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
              const answer = state.lightningAnswers[i];
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
    if (phase === "lightning-round-reveal") {
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
            {state.lightningAnswers.map((answer, i) => (
              <motion.div
                key={`lra-${answer.question}`}
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
            <span className="font-mono text-[clamp(36px,4.5vw,56px)] font-black text-accent-surveysmash">
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
    if (phase === "final-scores") {
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
          {state.teamMode && (
            <div className="flex justify-center gap-8 pt-8">
              {state.teams.map((team) => (
                <GlassPanel
                  key={team.id}
                  glow
                  glowColor="oklch(0.68 0.25 25 / 0.3)"
                  className="flex flex-col items-center gap-2 px-8 py-4"
                >
                  <span className="font-display text-[clamp(20px,2.5vw,28px)] font-bold text-text-primary">
                    {getTeamDisplayName(team, players, state.teamMode)}
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
        <p className="font-display text-[48px] text-text-muted">Survey Smash: {phase}</p>
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

    // Team badge for controls
    const teamBadge = myTeamLabel ? (
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => setIsTeamRosterOpen((o) => !o)}
          className="rounded-full border border-accent-surveysmash/35 bg-accent-surveysmash/15 px-3 py-1 font-display text-xs font-bold uppercase tracking-wider text-accent-surveysmash transition-all active:scale-95"
        >
          {myTeamLabel}
        </button>
        {isTeamRosterOpen && surveyTeams.length > 0 && (
          <GlassPanel className="w-[min(92vw,360px)] rounded-2xl border border-accent-surveysmash/30 px-4 py-3">
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
    if (phase === "face-off") {
      if (isFaceOffPlayer) {
        return (
          <div className="flex flex-col gap-4 pb-4 pt-4">
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
    if (phase === "guessing") {
      if (isCurrentGuesser) {
        return (
          <div className="flex flex-col gap-4 pb-4 pt-4">
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
          <div className="flex flex-col gap-4 pb-4 pt-4">
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
          <GlassPanel className="flex flex-col items-center gap-3 px-6 py-5">
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
    if (phase === "steal-chance") {
      if (isSnagTeam) {
        return (
          <div className="flex flex-col gap-4 pb-4 pt-4">
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
          <GlassPanel className="flex flex-col items-center gap-3 px-6 py-5">
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
    if (phase === "lightning-round") {
      if (isLightningPlayer) {
        const qIndex = typeof pd.questionIndex === "number" ? pd.questionIndex + 1 : "?";
        const totalQ = typeof pd.totalQuestions === "number" ? pd.totalQuestions : "?";
        return (
          <div className="flex flex-col gap-4 pb-4 pt-4">
            {teamBadge}
            <div className="flex justify-center">
              <span className="rounded-full bg-accent-surveysmash/15 px-3 py-1 font-mono text-xs font-bold text-accent-surveysmash">
                {qIndex}/{totalQ}
              </span>
            </div>
            <QuickGuessInput
              prompt={question || "Quick!"}
              placeholder="Quick! Type your answer..."
              onSubmit={handleTextSubmit}
            />
          </div>
        );
      }
      return (
        <div className="flex flex-col items-center gap-4 px-4 pb-4 pt-6">
          <GlassPanel className="flex flex-col items-center gap-3 px-6 py-5">
            <p className="font-display text-lg font-bold text-accent-surveysmash uppercase">
              Lightning Round
            </p>
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
      ].includes(phase)
    ) {
      return (
        <div className="flex flex-col items-center gap-4 px-4 pb-4 pt-6">
          <GlassPanel className="flex flex-col items-center gap-3 px-6 py-5">
            <p className="text-center font-body text-lg text-text-muted">Watch the board!</p>
          </GlassPanel>
          {teamBadge}
        </div>
      );
    }

    // ── Final Scores ──
    if (phase === "final-scores") {
      return (
        <div className="flex flex-col items-center gap-4 px-4 pb-4 pt-4">
          <p className="text-center font-body text-sm text-text-muted">
            Check the board for full results!
          </p>
        </div>
      );
    }

    return <WaitingScreen phase={phase} gameId="survey-smash" />;
  }

  // ─── Layout ──────────────────────────────────────────────────────
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
            turnPlayerName={null}
            isMyTurn={hasActiveAction}
            message={
              hasActiveAction ? "Your turn!" : isGuessAlongPlayer ? "Guess along!" : undefined
            }
          />
          {renderControls()}
        </>
      }
    />
  );
}
