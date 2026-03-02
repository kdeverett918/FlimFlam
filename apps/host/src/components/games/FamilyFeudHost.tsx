"use client";

import type { PlayerData, ScoreEntry } from "@flimflam/shared";
import { AVATAR_COLORS } from "@flimflam/shared";
import { ConfettiBurst, GlassPanel } from "@flimflam/ui";
import type { Room } from "colyseus.js";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { FinalScoresLayout, buildScores } from "../game/FinalScoresLayout";
import { Timer } from "../game/Timer";

// ─── Game data shapes ───────────────────────────────────────────────────────

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

interface FastMoneyAnswer {
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
  stealTeamId: string;
  fastMoneyPlayerId: string;
  fastMoneyCurrentIndex: number;
  fastMoneyAnswers: FastMoneyAnswer[];
  fastMoneyTotalPoints: number;
  allAnswers: SurveyAnswer[];
  leaderboard?: ScoreEntry[];
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

function getTeamDisplayName(team: TeamData, players: PlayerData[], teamMode: boolean): string {
  if (teamMode) {
    return team.id === "team-a" ? "Team A" : "Team B";
  }
  // FFA: single player
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

// ─── Answer Board ───────────────────────────────────────────────────────────

function AnswerBoard({
  totalCount,
  revealedAnswers,
  allAnswers,
  showAll,
}: {
  totalCount: number;
  revealedAnswers: RevealedAnswer[];
  allAnswers?: SurveyAnswer[];
  showAll?: boolean;
}) {
  const revealedRanks = new Set(revealedAnswers.map((a) => a.rank));
  const rows = Array.from({ length: totalCount }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-2 w-full max-w-3xl">
      {rows.map((rank) => {
        const revealed = revealedAnswers.find((a) => a.rank === rank);
        const fullAnswer = allAnswers?.find((a) => a.rank === rank);
        const isRevealed = revealedRanks.has(rank);
        const shouldShow = isRevealed || (showAll && fullAnswer);
        const answer = revealed ?? fullAnswer;

        return (
          <motion.div
            key={rank}
            className="relative overflow-hidden rounded-lg"
            style={{ perspective: 800 }}
          >
            <AnimatePresence mode="wait">
              {shouldShow && answer ? (
                <motion.div
                  key={`revealed-${rank}`}
                  initial={{ rotateX: -90 }}
                  animate={{ rotateX: 0 }}
                  exit={{ rotateX: 90 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`flex items-center justify-between rounded-lg border px-6 py-3 ${
                    isRevealed
                      ? "border-accent-feud/40 bg-accent-feud/15"
                      : "border-white/10 bg-bg-surface/50"
                  }`}
                  style={{ minHeight: 56 }}
                >
                  <span className="font-display text-[clamp(22px,2.5vw,32px)] font-bold text-text-primary uppercase">
                    {answer.text}
                  </span>
                  <span className="font-mono text-[clamp(22px,2.5vw,32px)] font-bold text-accent-feud">
                    {answer.points}
                  </span>
                </motion.div>
              ) : (
                <div
                  className="flex items-center justify-between rounded-lg border border-accent-feud/20 bg-accent-feud/8 px-6 py-3"
                  style={{ minHeight: 56 }}
                >
                  <span className="font-display text-[clamp(22px,2.5vw,32px)] font-bold text-accent-feud/50">
                    {rank}
                  </span>
                  <div className="h-4 rounded-full bg-accent-feud/10" style={{ width: "60%" }} />
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Strike Display ─────────────────────────────────────────────────────────

const STRIKE_SLOTS = ["strike-1", "strike-2", "strike-3"] as const;
const FM_SLOTS = ["fm-1", "fm-2", "fm-3", "fm-4", "fm-5"] as const;

function StrikeDisplay({ strikes, max = 3 }: { strikes: number; max?: number }) {
  const slots = STRIKE_SLOTS.slice(0, max);
  return (
    <div className="flex gap-3">
      {slots.map((slotKey, i) => (
        <motion.div
          key={slotKey}
          initial={i === strikes - 1 ? { scale: 0 } : false}
          animate={i === strikes - 1 ? { scale: 1 } : undefined}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className={`flex items-center justify-center rounded-xl border-2 ${
            i < strikes ? "border-accent-6 bg-accent-6/20" : "border-white/10 bg-white/5"
          }`}
          style={{ width: 64, height: 64 }}
        >
          {i < strikes && (
            <span className="font-display text-[36px] font-black text-accent-6">X</span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface FamilyFeudHostProps {
  phase: string;
  round: number;
  totalRounds: number;
  players: PlayerData[];
  payload: Record<string, unknown>;
  timerEndTime: number | null;
  room: Room | null;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FamilyFeudHost({ phase, players, timerEndTime, room }: FamilyFeudHostProps) {
  const [gameState, setGameState] = useState<FeudGameState | null>(null);
  const [showStrikeOverlay, setShowStrikeOverlay] = useState(false);
  const prevStrikesRef = useRef(0);

  const handleMessage = useCallback((data: Record<string, unknown>) => {
    const action = data.action as string | undefined;

    if (action === "family-feud-state") {
      const newState = data as unknown as FeudGameState;
      setGameState(newState);

      // Detect new strike for overlay
      if (newState.strikes > prevStrikesRef.current && newState.phase === "strike") {
        setShowStrikeOverlay(true);
        setTimeout(() => setShowStrikeOverlay(false), 1200);
      }
      prevStrikesRef.current = newState.strikes;
    }
  }, []);

  useEffect(() => {
    if (!room) return;
    room.onMessage("game-data", handleMessage);
  }, [room, handleMessage]);

  if (!gameState) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-display text-[48px] text-accent-feud animate-glow-pulse">
          Loading Family Feud...
        </p>
      </div>
    );
  }

  // ── Team score bar ────────────────────────────────────────────────────
  const teamScoreBar = (
    <div className="flex justify-center gap-8 mt-4">
      {gameState.teams.map((team) => {
        const displayName = getTeamDisplayName(team, players, gameState.teamMode);
        const isControlling = team.id === gameState.controllingTeamId;

        return (
          <div
            key={team.id}
            className={`flex items-center gap-3 rounded-xl px-6 py-3 transition-all ${
              isControlling ? "bg-accent-feud/15 border border-accent-feud/30" : "bg-white/5"
            }`}
          >
            <span
              className={`font-display text-[clamp(20px,2.5vw,28px)] font-bold ${
                isControlling ? "text-accent-feud" : "text-text-primary"
              }`}
            >
              {displayName}
            </span>
            <span className="font-mono text-[clamp(20px,2.5vw,28px)] text-accent-feud">
              {team.score.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );

  // ── Strike overlay ──────────────────────────────────────────────────────
  const strikeOverlay = showStrikeOverlay && (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
    >
      <span
        className="font-display text-[200px] font-black text-accent-6"
        style={{
          textShadow: "0 0 60px oklch(0.68 0.25 20 / 0.6), 0 0 120px oklch(0.68 0.25 20 / 0.3)",
        }}
      >
        X
      </span>
    </motion.div>
  );

  // ── Question Reveal ─────────────────────────────────────────────────────
  if (phase === "question-reveal") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
        {strikeOverlay}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-[clamp(24px,3vw,36px)] text-accent-feud uppercase tracking-wider"
        >
          Round {gameState.round} of {gameState.totalRounds}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
        >
          <GlassPanel glow glowColor="oklch(0.68 0.25 25 / 0.3)" className="max-w-4xl px-12 py-10">
            <p className="text-center font-display text-[clamp(32px,4.5vw,56px)] font-bold leading-snug text-text-primary">
              {gameState.question}
            </p>
          </GlassPanel>
        </motion.div>

        {teamScoreBar}
      </div>
    );
  }

  // ── Face-off ────────────────────────────────────────────────────────────
  if (phase === "face-off") {
    const player1 = gameState.faceOffPlayers[0];
    const player2 = gameState.faceOffPlayers[1];
    const name1 = getPlayerName(players, player1 ?? null);
    const name2 = getPlayerName(players, player2 ?? null);
    const color1 = getPlayerColor(players, player1 ?? null);
    const color2 = getPlayerColor(players, player2 ?? null);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        {strikeOverlay}
        <GlassPanel className="max-w-4xl px-10 py-6 mb-4">
          <p className="text-center font-display text-[clamp(24px,3vw,40px)] font-bold text-text-primary">
            {gameState.question}
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
            {gameState.faceOffEntries.some((e) => e.sessionId === player1) && (
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
            className="font-display text-[clamp(48px,7vw,80px)] font-black text-accent-feud"
            style={{
              textShadow: "0 0 30px oklch(0.68 0.25 25 / 0.5)",
            }}
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
            {gameState.faceOffEntries.some((e) => e.sessionId === player2) && (
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

  // ── Guessing ────────────────────────────────────────────────────────────
  if (phase === "guessing") {
    const currentGuesser = gameState.guessingOrder[gameState.currentGuesserIndex];
    const guesserName = getPlayerName(players, currentGuesser ?? null);
    const guesserColor = getPlayerColor(players, currentGuesser ?? null);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
        {strikeOverlay}
        <GlassPanel className="max-w-3xl px-8 py-4">
          <p className="text-center font-display text-[clamp(20px,2.5vw,32px)] font-bold text-text-primary">
            {gameState.question}
          </p>
        </GlassPanel>

        <div className="flex items-start gap-8 w-full max-w-5xl">
          {/* Answer Board */}
          <div className="flex-1">
            <AnswerBoard
              totalCount={gameState.answerCount}
              revealedAnswers={gameState.revealedAnswers}
            />
          </div>

          {/* Current guesser + strikes */}
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

            <StrikeDisplay strikes={gameState.strikes} />

            {timerEndTime && <Timer endTime={timerEndTime} size={100} />}
          </div>
        </div>

        {teamScoreBar}
      </div>
    );
  }

  // ── Strike Phase ────────────────────────────────────────────────────────
  if (phase === "strike") {
    const currentGuesser = gameState.guessingOrder[gameState.currentGuesserIndex];
    const guesserName = getPlayerName(players, currentGuesser ?? null);
    const guesserColor = getPlayerColor(players, currentGuesser ?? null);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
        {strikeOverlay}
        <GlassPanel className="max-w-3xl px-8 py-4">
          <p className="text-center font-display text-[clamp(20px,2.5vw,32px)] font-bold text-text-primary">
            {gameState.question}
          </p>
        </GlassPanel>

        <div className="flex items-start gap-8 w-full max-w-5xl">
          <div className="flex-1">
            <AnswerBoard
              totalCount={gameState.answerCount}
              revealedAnswers={gameState.revealedAnswers}
            />
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <PlayerAvatar name={guesserName} color={guesserColor} size={56} />
              <span className="font-display text-[clamp(24px,3vw,32px)] font-bold text-text-primary">
                {guesserName}
              </span>
            </div>
            <StrikeDisplay strikes={gameState.strikes} />
          </div>
        </div>

        {teamScoreBar}
      </div>
    );
  }

  // ── Steal Chance ────────────────────────────────────────────────────────
  if (phase === "steal-chance") {
    const stealTeam = gameState.teams.find((t) => t.id === gameState.stealTeamId);
    const stealName = stealTeam
      ? getTeamDisplayName(stealTeam, players, gameState.teamMode)
      : "???";

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
        {strikeOverlay}
        <GlassPanel className="max-w-3xl px-8 py-4">
          <p className="text-center font-display text-[clamp(20px,2.5vw,32px)] font-bold text-text-primary">
            {gameState.question}
          </p>
        </GlassPanel>

        <div className="flex items-start gap-8 w-full max-w-5xl">
          <div className="flex-1">
            <AnswerBoard
              totalCount={gameState.answerCount}
              revealedAnswers={gameState.revealedAnswers}
            />
          </div>

          <div className="flex flex-col items-center gap-6">
            <StrikeDisplay strikes={gameState.strikes} />

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 150 }}
              className="flex flex-col items-center gap-3"
            >
              <span className="font-display text-[clamp(28px,3.5vw,40px)] font-black text-accent-feud uppercase">
                STEAL!
              </span>
              <span className="font-display text-[clamp(24px,3vw,36px)] font-bold text-text-primary">
                {stealName}
              </span>
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                className="font-body text-[clamp(18px,2vw,24px)] text-text-muted"
              >
                Can they steal the points?
              </motion.span>
            </motion.div>

            {timerEndTime && <Timer endTime={timerEndTime} size={100} />}
          </div>
        </div>

        {teamScoreBar}
      </div>
    );
  }

  // ── Answer Reveal ───────────────────────────────────────────────────────
  if (phase === "answer-reveal") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        {strikeOverlay}
        <h2 className="font-display text-[clamp(32px,4vw,48px)] text-accent-feud font-bold uppercase tracking-wider">
          Survey Says...
        </h2>

        <GlassPanel className="max-w-3xl px-8 py-4 mb-2">
          <p className="text-center font-display text-[clamp(20px,2.5vw,32px)] font-bold text-text-primary">
            {gameState.question}
          </p>
        </GlassPanel>

        <AnswerBoard
          totalCount={gameState.answerCount}
          revealedAnswers={gameState.revealedAnswers}
          allAnswers={gameState.allAnswers}
          showAll
        />

        {teamScoreBar}
      </div>
    );
  }

  // ── Round Result ────────────────────────────────────────────────────────
  if (phase === "round-result") {
    const controllingTeam = gameState.teams.find((t) => t.id === gameState.controllingTeamId);
    const winnerName = controllingTeam
      ? getTeamDisplayName(controllingTeam, players, gameState.teamMode)
      : "Nobody";

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
        {strikeOverlay}
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-[clamp(32px,4vw,48px)] text-accent-feud font-bold uppercase"
        >
          Round {gameState.round} Complete!
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

        {/* Team scores */}
        <div className="flex gap-8">
          {gameState.teams.map((team) => {
            const displayName = getTeamDisplayName(team, players, gameState.teamMode);
            return (
              <GlassPanel
                key={team.id}
                glow={team.id === gameState.controllingTeamId}
                glowColor="oklch(0.68 0.25 25 / 0.3)"
                className="flex flex-col items-center gap-2 px-10 py-6"
              >
                <span className="font-display text-[clamp(24px,3vw,36px)] font-bold text-text-primary">
                  {displayName}
                </span>
                <span className="font-mono text-[clamp(32px,4vw,48px)] font-bold text-accent-feud">
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

  // ── Fast Money ──────────────────────────────────────────────────────────
  if (phase === "fast-money") {
    const fmPlayerName = getPlayerName(players, gameState.fastMoneyPlayerId);
    const fmPlayerColor = getPlayerColor(players, gameState.fastMoneyPlayerId);
    const currentQ =
      gameState.fastMoneyCurrentIndex < (gameState.fastMoneyAnswers?.length ?? 0)
        ? null
        : gameState.question;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <motion.h1
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="font-display text-[clamp(40px,5.5vw,64px)] font-black text-accent-feud"
          style={{
            textShadow: "0 0 30px oklch(0.68 0.25 25 / 0.5)",
          }}
        >
          FAST MONEY!
        </motion.h1>

        <div className="flex items-center gap-4">
          <PlayerAvatar name={fmPlayerName} color={fmPlayerColor} size={64} />
          <span className="font-display text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary">
            {fmPlayerName}
          </span>
        </div>

        {/* Progress */}
        <div className="flex gap-3">
          {FM_SLOTS.map((slotKey, i) => {
            const answer = gameState.fastMoneyAnswers[i];
            return (
              <div
                key={slotKey}
                className={`flex items-center justify-center rounded-lg border ${
                  answer
                    ? answer.matched
                      ? "border-success bg-success/15"
                      : "border-accent-6 bg-accent-6/10"
                    : i === gameState.fastMoneyCurrentIndex
                      ? "border-accent-feud bg-accent-feud/10"
                      : "border-white/10 bg-white/5"
                }`}
                style={{ width: 56, height: 56 }}
              >
                <span
                  className={`font-mono text-[24px] font-bold ${
                    answer ? (answer.matched ? "text-success" : "text-accent-6") : "text-text-muted"
                  }`}
                >
                  {answer ? answer.points : i + 1}
                </span>
              </div>
            );
          })}
        </div>

        {/* Current question */}
        {currentQ && (
          <GlassPanel glow glowColor="oklch(0.68 0.25 25 / 0.25)" className="max-w-3xl px-10 py-6">
            <p className="text-center font-display text-[clamp(24px,3vw,40px)] font-bold text-text-primary">
              {currentQ}
            </p>
          </GlassPanel>
        )}

        {/* Running total */}
        <span className="font-mono text-[clamp(28px,3.5vw,44px)] font-bold text-accent-feud">
          Total: {gameState.fastMoneyTotalPoints} pts
        </span>

        {timerEndTime && <Timer endTime={timerEndTime} size={100} />}
      </div>
    );
  }

  // ── Fast Money Reveal ───────────────────────────────────────────────────
  if (phase === "fast-money-reveal") {
    const fmPlayerName = getPlayerName(players, gameState.fastMoneyPlayerId);
    const fmPlayerColor = getPlayerColor(players, gameState.fastMoneyPlayerId);
    const hitThreshold = gameState.fastMoneyTotalPoints >= 200;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <h1
          className="font-display text-[clamp(36px,5vw,56px)] font-black text-accent-feud"
          style={{ textShadow: "0 0 24px oklch(0.68 0.25 25 / 0.4)" }}
        >
          FAST MONEY RESULTS
        </h1>

        <div className="flex items-center gap-4">
          <PlayerAvatar name={fmPlayerName} color={fmPlayerColor} size={56} />
          <span className="font-display text-[clamp(24px,3vw,36px)] font-bold text-text-primary">
            {fmPlayerName}
          </span>
        </div>

        {/* Answer list */}
        <div className="flex flex-col gap-3 w-full max-w-2xl">
          {gameState.fastMoneyAnswers.map((answer, i) => (
            <motion.div
              key={`fma-${answer.question}`}
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
                  className={`font-mono text-[clamp(24px,3vw,36px)] font-bold ${
                    answer.matched ? "text-success" : "text-accent-6"
                  }`}
                >
                  {answer.points}
                </span>
              </GlassPanel>
            </motion.div>
          ))}
        </div>

        {/* Total */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5 }}
          className="flex flex-col items-center gap-2"
        >
          <span className="font-mono text-[clamp(36px,4.5vw,56px)] font-black text-accent-feud">
            {gameState.fastMoneyTotalPoints} POINTS
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

  // ── Final Scores ────────────────────────────────────────────────────────
  if (phase === "final-scores") {
    // Use leaderboard from game state if available, otherwise build from players
    const scores: ScoreEntry[] = gameState.leaderboard ?? buildScores(players);

    return (
      <div>
        {/* Team scores summary if team mode */}
        {gameState.teamMode && (
          <div className="flex justify-center gap-8 pt-8">
            {gameState.teams.map((team) => {
              const displayName = getTeamDisplayName(team, players, gameState.teamMode);
              return (
                <GlassPanel
                  key={team.id}
                  glow
                  glowColor="oklch(0.68 0.25 25 / 0.3)"
                  className="flex flex-col items-center gap-2 px-8 py-4"
                >
                  <span className="font-display text-[clamp(20px,2.5vw,28px)] font-bold text-text-primary">
                    {displayName}
                  </span>
                  <span className="font-mono text-[clamp(28px,3.5vw,40px)] font-bold text-accent-feud">
                    {team.score.toLocaleString()}
                  </span>
                </GlassPanel>
              );
            })}
          </div>
        )}

        <FinalScoresLayout
          scores={scores}
          accentColorClass="text-accent-feud"
          gameId="family-feud"
          room={room}
        />
      </div>
    );
  }

  // ── Fallback ────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="font-display text-[48px] text-text-muted">Family Feud: {phase}</p>
    </div>
  );
}
