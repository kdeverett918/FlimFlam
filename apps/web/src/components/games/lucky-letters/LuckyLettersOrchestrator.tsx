"use client";

import { ANIMATION_EASINGS, GlassPanel, useReducedMotion } from "@flimflam/ui";
import { motion } from "motion/react";

import { PuzzleBoard as MobilePuzzleBoard } from "@/components/controls/PuzzleBoard";
import { GameBoard } from "@/components/game/GameBoard";
import { PlayerStatus } from "@/components/game/PlayerStatus";
import { WaitingScreen } from "@/components/game/WaitingScreen";

import { useLuckyLettersActions } from "./hooks/useLuckyLettersActions";
import { useLuckyLettersState } from "./hooks/useLuckyLettersState";
import { StandingsBar } from "./shared/StandingsBar";
import type { LuckyLettersGameProps } from "./shared/ll-types";

// Host phase components
import { HostBonusReveal } from "./phases/host/HostBonusReveal";
import { HostBonusRound } from "./phases/host/HostBonusRound";
import { HostCategoryVote } from "./phases/host/HostCategoryVote";
import { HostFinalScores } from "./phases/host/HostFinalScores";
import { HostGuessing } from "./phases/host/HostGuessing";
import { HostLetterResult } from "./phases/host/HostLetterResult";
import { HostRoundIntro } from "./phases/host/HostRoundIntro";
import { HostRoundResult } from "./phases/host/HostRoundResult";
import { HostSpinning } from "./phases/host/HostSpinning";

// Controller phase components
import { CtrlBonusReveal } from "./phases/controller/CtrlBonusReveal";
import { CtrlBonusRound } from "./phases/controller/CtrlBonusRound";
import { CtrlCategoryVote } from "./phases/controller/CtrlCategoryVote";
import { CtrlFinalScores } from "./phases/controller/CtrlFinalScores";
import { CtrlGuessing } from "./phases/controller/CtrlGuessing";
import { CtrlLetterResult } from "./phases/controller/CtrlLetterResult";
import { CtrlRoundIntro } from "./phases/controller/CtrlRoundIntro";
import { CtrlRoundResult } from "./phases/controller/CtrlRoundResult";
import { CtrlSpinning } from "./phases/controller/CtrlSpinning";

export function LuckyLettersOrchestrator({
  phase,
  round,
  totalRounds,
  players,
  privateData,
  gameEvents,
  mySessionId,
  isHost: _isHost,
  timerEndTime: _timerEndTime,
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

  const state = useLuckyLettersState({
    phase,
    round,
    totalRounds,
    players,
    gameEvents,
    privateData,
    room,
  });

  const actions = useLuckyLettersActions({ sendMessage });

  const {
    gameState,
    letterResult,
    spinResult,
    isSpinning,
    roundResult,
    highlightLetters,
    categoryVoteTally,
    idleTimeoutNotice,
    gs,
    controllerLetterResult,
    controllerRoundResult,
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
    fallbackGameState: _fallbackGameState,
    resolvedGameState,
    resolvedPhase,
    resolvedRound,
    resolvedTotalRounds,
  } = state;

  // Standings bar (board)
  const standingsBar = gameState ? <StandingsBar gameState={gameState} players={players} /> : null;

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
    if (!resolvedGameState) {
      return (
        <div className="flex items-center justify-center p-8">
          <p className="font-display text-[48px] text-accent-luckyletters animate-glow-pulse">
            Loading Lucky Letters...
          </p>
        </div>
      );
    }

    if (phase === "category-vote") {
      return <HostCategoryVote state={resolvedGameState} categoryVoteTally={categoryVoteTally} />;
    }

    if (phase === "round-intro") {
      return <HostRoundIntro state={resolvedGameState} />;
    }

    if (phase === "spinning") {
      return (
        <HostSpinning
          state={resolvedGameState}
          players={players}
          highlightLetters={highlightLetters}
          reducedMotion={effectiveReducedMotion}
          isSpinning={isSpinning}
          spinResult={spinResult}
          standingsBar={standingsBar}
        />
      );
    }

    if (phase === "guess-consonant" || phase === "buy-vowel" || phase === "solve-attempt") {
      return (
        <HostGuessing
          phase={phase}
          state={resolvedGameState}
          players={players}
          reducedMotion={effectiveReducedMotion}
          standingsBar={standingsBar}
        />
      );
    }

    if (phase === "letter-result" && letterResult) {
      return (
        <HostLetterResult
          state={resolvedGameState}
          letterResult={letterResult}
          highlightLetters={highlightLetters}
          reducedMotion={effectiveReducedMotion}
          standingsBar={standingsBar}
        />
      );
    }

    if (phase === "round-result" && roundResult) {
      return (
        <HostRoundResult
          state={resolvedGameState}
          roundResult={roundResult}
          players={players}
          standingsBar={standingsBar}
        />
      );
    }

    if (shouldShowBonusReveal && resolvedBonusReveal) {
      return <HostBonusReveal bonusReveal={resolvedBonusReveal} players={players} />;
    }

    if (phase === "bonus-round") {
      return (
        <HostBonusRound
          state={resolvedGameState}
          players={players}
          highlightLetters={highlightLetters}
          reducedMotion={effectiveReducedMotion}
        />
      );
    }

    if (phase === "final-scores" && !shouldShowBonusReveal) {
      return <HostFinalScores players={players} room={room} />;
    }

    return (
      <div className="flex items-center justify-center p-8">
        <p className="font-display text-[48px] text-text-muted">Lucky Letters: {phase}</p>
      </div>
    );
  }

  // ─── CONTROLS renderer ──────────────────────────────────────────
  function renderControls(): React.ReactNode {
    if (phase === "category-vote") {
      const availableCategories = Array.isArray(gs.availableCategories)
        ? (gs.availableCategories as string[])
        : [];
      const categoryVoteData = gameEvents?.["category-vote"] as
        | { categories: string[] }
        | undefined;
      const cats = categoryVoteData?.categories ?? availableCategories;
      return <CtrlCategoryVote categories={cats} onVote={actions.handleCategoryVote} />;
    }

    if (phase === "round-intro") {
      return (
        <CtrlRoundIntro
          round={round}
          totalRounds={totalRounds}
          category={category}
          hint={hint}
          standings={standings}
          currentTurnSessionId={currentTurnSessionId}
          mySessionId={mySessionId}
          players={players}
        />
      );
    }

    if (phase === "spinning") {
      return (
        <CtrlSpinning
          isMyTurn={isMyTurn}
          mobilePuzzle={mobilePuzzle}
          roundCash={roundCash}
          visibleSpinSegment={visibleSpinSegment}
          sharedSpinResult={sharedSpinResult}
          turnPlayerName={turnPlayerName}
          canBuyVowel={canBuyVowel}
          onSpin={actions.handleSpin}
          onChooseBuyVowel={actions.handleChooseBuyVowel}
          onChooseSolve={actions.handleChooseSolve}
        />
      );
    }

    if (phase === "guess-consonant" || phase === "buy-vowel" || phase === "solve-attempt") {
      return (
        <CtrlGuessing
          phase={phase}
          isMyTurn={isMyTurn}
          mobilePuzzle={mobilePuzzle}
          usedLetters={usedLetters}
          roundCash={roundCash}
          turnPlayerName={turnPlayerName}
          sharedSpinResult={sharedSpinResult}
          visibleSpinSegment={visibleSpinSegment}
          errorNonce={errorNonce}
          onConsonantPick={actions.handleConsonantPick}
          onVowelPick={actions.handleVowelPick}
          onSolveSubmit={actions.handleSolveSubmit}
        />
      );
    }

    if (phase === "letter-result") {
      return (
        <CtrlLetterResult
          mobilePuzzle={mobilePuzzle}
          controllerLetterResult={controllerLetterResult}
          streak={streak}
        />
      );
    }

    if (phase === "round-result") {
      return (
        <CtrlRoundResult
          controllerRoundResult={controllerRoundResult}
          standings={standings}
          players={players}
          mySessionId={mySessionId}
        />
      );
    }

    if (shouldShowBonusReveal && resolvedBonusReveal) {
      return <CtrlBonusReveal bonusReveal={resolvedBonusReveal} players={players} />;
    }

    if (phase === "bonus-round") {
      return (
        <CtrlBonusRound
          isBonusPlayer={isBonusPlayer}
          bonusPlayerSessionId={bonusPlayerSessionId}
          players={players}
          mobilePuzzle={mobilePuzzle}
          usedLetters={usedLetters}
          controllerBonusPickConfirmed={controllerBonusPickConfirmed}
          onBonusPick={actions.handleBonusPick}
          onBonusSolve={actions.handleBonusSolve}
        />
      );
    }

    if (phase === "final-scores" && !shouldShowBonusReveal) {
      return <CtrlFinalScores />;
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
