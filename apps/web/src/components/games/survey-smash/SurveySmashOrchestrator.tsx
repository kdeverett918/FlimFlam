"use client";

import { ANIMATION_DURATIONS, ANIMATION_EASINGS } from "@flimflam/ui";
import { motion } from "motion/react";

import { GameBoard } from "@/components/game/GameBoard";
import { PlayerStatus } from "@/components/game/PlayerStatus";
import { WaitingScreen } from "@/components/game/WaitingScreen";

import { useSurveySmashActions } from "./hooks/useSurveySmashActions";
import { useSurveySmashState } from "./hooks/useSurveySmashState";

import { CtrlFaceOff } from "./phases/controller/CtrlFaceOff";
import { CtrlFinalScores } from "./phases/controller/CtrlFinalScores";
import { CtrlGuessing } from "./phases/controller/CtrlGuessing";
import { CtrlLightningRound } from "./phases/controller/CtrlLightningRound";
import { CtrlStealChance } from "./phases/controller/CtrlStealChance";
import { CtrlWatchPhase } from "./phases/controller/CtrlWatchPhase";

import { HostAnswerReveal } from "./phases/host/HostAnswerReveal";
import { HostFaceOff } from "./phases/host/HostFaceOff";
import { HostFinalScores } from "./phases/host/HostFinalScores";
import { HostGuessing } from "./phases/host/HostGuessing";
import { HostLightningReveal } from "./phases/host/HostLightningReveal";
import { HostLightningRound } from "./phases/host/HostLightningRound";
import { HostQuestionReveal } from "./phases/host/HostQuestionReveal";
import { HostRoundResult } from "./phases/host/HostRoundResult";
import { HostStealChance } from "./phases/host/HostStealChance";
import { HostStrike } from "./phases/host/HostStrike";

import { TeamBadge } from "./shared/TeamBadge";
import type { SurveySmashGameProps } from "./shared/ss-types";

export function SurveySmashOrchestrator({
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
  const state = useSurveySmashState({
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
    room,
  });

  const actions = useSurveySmashActions({ sendMessage });

  const {
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
  } = state;

  // ─── Shared pieces ────────────────────────────────────────────────

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

  const teamBadge = (
    <TeamBadge
      myTeamLabel={myTeamLabel}
      myTeamId={myTeamId}
      surveyTeams={surveyTeams}
      players={players}
      isTeamRosterOpen={isTeamRosterOpen}
      setIsTeamRosterOpen={setIsTeamRosterOpen}
    />
  );

  // ─── Board renderer ───────────────────────────────────────────────

  function renderBoard(): React.ReactNode {
    const gameData = canonicalGameState;
    if (!gameData) {
      return (
        <div className="flex items-center justify-center p-8">
          <p className="font-display text-[48px] text-accent-surveysmash animate-glow-pulse">
            Loading Survey Smash...
          </p>
        </div>
      );
    }

    const teams = Array.isArray(gameData.teams) ? gameData.teams : [];
    const teamMode = Boolean(gameData.teamMode);
    const question = typeof gameData.question === "string" ? gameData.question : "";
    const revealedAnswers = Array.isArray(gameData.revealedAnswers) ? gameData.revealedAnswers : [];
    const answerCount =
      typeof gameData.answerCount === "number" && Number.isFinite(gameData.answerCount)
        ? gameData.answerCount
        : revealedAnswers.length;
    const faceOffPlayers = Array.isArray(gameData.faceOffPlayers) ? gameData.faceOffPlayers : [];
    const faceOffEntries = Array.isArray(gameData.faceOffEntries) ? gameData.faceOffEntries : [];
    const guessingOrder = Array.isArray(gameData.guessingOrder) ? gameData.guessingOrder : [];
    const currentGuesserIndex =
      typeof gameData.currentGuesserIndex === "number" &&
      Number.isFinite(gameData.currentGuesserIndex)
        ? gameData.currentGuesserIndex
        : 0;
    const activeGuesser = guessingOrder[currentGuesserIndex] ?? null;
    const strikes =
      typeof gameData.strikes === "number" && Number.isFinite(gameData.strikes)
        ? gameData.strikes
        : 0;
    const controllingTeamId =
      typeof gameData.controllingTeamId === "string" ? gameData.controllingTeamId : "";
    const snagTeamId = typeof gameData.snagTeamId === "string" ? gameData.snagTeamId : "";
    const lightningAnswers = Array.isArray(gameData.lightningAnswers)
      ? gameData.lightningAnswers
      : [];

    if (canonicalPhase === "question-reveal") {
      return (
        <HostQuestionReveal
          question={question}
          round={gameData.round}
          totalRounds={gameData.totalRounds}
          teams={teams}
          controllingTeamId={controllingTeamId}
          teamMode={teamMode}
          players={players}
          strikeOverlay={strikeOverlay}
        />
      );
    }

    if (canonicalPhase === "face-off") {
      return (
        <HostFaceOff
          question={question}
          faceOffPlayers={faceOffPlayers}
          faceOffEntries={faceOffEntries}
          teams={teams}
          controllingTeamId={controllingTeamId}
          teamMode={teamMode}
          players={players}
          timerEndTime={timerEndTime}
          strikeOverlay={strikeOverlay}
        />
      );
    }

    if (canonicalPhase === "guessing") {
      return (
        <HostGuessing
          question={question}
          answerCount={answerCount}
          revealedAnswers={revealedAnswers}
          activeGuesser={activeGuesser}
          strikes={strikes}
          teams={teams}
          controllingTeamId={controllingTeamId}
          teamMode={teamMode}
          players={players}
          timerEndTime={timerEndTime}
          reducedMotion={reducedMotion}
          guessAlongEligible={gameData.guessAlongEligible ?? 0}
          guessAlongSubmissions={gameData.guessAlongSubmissions ?? 0}
          strikeOverlay={strikeOverlay}
        />
      );
    }

    if (canonicalPhase === "strike") {
      return (
        <HostStrike
          question={question}
          answerCount={answerCount}
          revealedAnswers={revealedAnswers}
          activeGuesser={activeGuesser}
          strikes={strikes}
          teams={teams}
          controllingTeamId={controllingTeamId}
          teamMode={teamMode}
          players={players}
          reducedMotion={reducedMotion}
          strikeOverlay={strikeOverlay}
        />
      );
    }

    if (canonicalPhase === "steal-chance") {
      return (
        <HostStealChance
          question={question}
          answerCount={answerCount}
          revealedAnswers={revealedAnswers}
          strikes={strikes}
          snagTeamId={snagTeamId}
          teams={teams}
          controllingTeamId={controllingTeamId}
          teamMode={teamMode}
          players={players}
          timerEndTime={timerEndTime}
          reducedMotion={reducedMotion}
          strikeOverlay={strikeOverlay}
        />
      );
    }

    if (canonicalPhase === "answer-reveal") {
      const totalAnswers = gameData.allAnswers?.length || gameData.answerCount || 0;
      return (
        <HostAnswerReveal
          question={question}
          answerCount={answerCount}
          revealedAnswers={revealedAnswers}
          allAnswers={gameData.allAnswers}
          dramaticStage={dramaticStage}
          sequentialRevealCount={sequentialRevealCount}
          totalAnswers={totalAnswers}
          teams={teams}
          controllingTeamId={controllingTeamId}
          teamMode={teamMode}
          players={players}
          reducedMotion={reducedMotion}
          strikeOverlay={strikeOverlay}
        />
      );
    }

    if (canonicalPhase === "round-result") {
      return (
        <HostRoundResult
          round={gameData.round}
          teams={teams}
          controllingTeamId={controllingTeamId}
          teamMode={teamMode}
          players={players}
          strikeOverlay={strikeOverlay}
        />
      );
    }

    if (canonicalPhase === "lightning-round") {
      return (
        <HostLightningRound
          lightningPlayerId={gameData.lightningPlayerId}
          lightningCurrentIndex={gameData.lightningCurrentIndex}
          lightningAnswers={lightningAnswers}
          lightningTotalPoints={gameData.lightningTotalPoints}
          players={players}
          timerEndTime={timerEndTime}
        />
      );
    }

    if (canonicalPhase === "lightning-round-reveal") {
      return (
        <HostLightningReveal
          lightningPlayerId={gameData.lightningPlayerId}
          lightningAnswers={lightningAnswers}
          lightningTotalPoints={gameData.lightningTotalPoints}
          players={players}
        />
      );
    }

    if (canonicalPhase === "final-scores") {
      return (
        <HostFinalScores
          teams={teams}
          teamMode={teamMode}
          players={players}
          leaderboard={gameData.leaderboard}
          room={room}
        />
      );
    }

    return (
      <div className="flex items-center justify-center p-8">
        <p className="font-display text-[48px] text-text-muted">Survey Smash: {canonicalPhase}</p>
      </div>
    );
  }

  // ─── Controls renderer ────────────────────────────────────────────

  function renderControls(): React.ReactNode {
    const question =
      typeof pd.question === "string"
        ? pd.question
        : typeof gs.question === "string"
          ? (gs.question as string)
          : "";
    const activePhase = controllerPhase;

    if (activePhase === "face-off") {
      return (
        <CtrlFaceOff
          isFaceOffPlayer={isFaceOffPlayer}
          question={question}
          teamBadge={teamBadge}
          onSubmit={actions.handleTextSubmit}
          errorNonce={errorNonce}
        />
      );
    }

    if (activePhase === "guessing") {
      return (
        <CtrlGuessing
          isCurrentGuesser={isCurrentGuesser}
          isGuessAlongPlayer={isGuessAlongPlayer}
          question={question}
          teamBadge={teamBadge}
          guessAlongPoints={guessAlongPoints}
          onSubmit={actions.handleTextSubmit}
          onGuessAlongSubmit={actions.handleGuessAlongSubmit}
          errorNonce={errorNonce}
        />
      );
    }

    if (activePhase === "steal-chance") {
      return (
        <CtrlStealChance
          isSnagTeam={isSnagTeam}
          question={question}
          teamBadge={teamBadge}
          onSubmit={actions.handleTextSubmit}
          errorNonce={errorNonce}
        />
      );
    }

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
      return (
        <CtrlLightningRound
          isLightningPlayer={isLightningPlayer}
          question={question}
          qIndex={qIndex}
          totalQ={totalQ}
          teamBadge={teamBadge}
          onSubmit={actions.handleTextSubmit}
        />
      );
    }

    if (
      [
        "question-reveal",
        "strike",
        "answer-reveal",
        "round-result",
        "lightning-round-reveal",
      ].includes(activePhase)
    ) {
      return <CtrlWatchPhase teamBadge={teamBadge} />;
    }

    if (activePhase === "final-scores") {
      return <CtrlFinalScores />;
    }

    return <WaitingScreen phase={activePhase} gameId="survey-smash" />;
  }

  // ─── Layout ───────────────────────────────────────────────────────

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
      wideRailOnWideScreens={isHost}
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
