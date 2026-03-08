"use client";

import { GameBoard } from "@/components/game/GameBoard";
import { PlayerStatus } from "@/components/game/PlayerStatus";
import { WaitingScreen } from "@/components/game/WaitingScreen";

import { useBrainBoardActions } from "./hooks/useBrainBoardActions";
import { useBrainBoardState } from "./hooks/useBrainBoardState";
import type { BrainBoardGameProps, BrainBoardGameState } from "./shared/bb-types";

import { HostAllInAnswer } from "./phases/host/HostAllInAnswer";
import { HostAllInCategory } from "./phases/host/HostAllInCategory";
import { HostAllInReveal } from "./phases/host/HostAllInReveal";
import { HostAllInWager } from "./phases/host/HostAllInWager";
import { HostAnswering } from "./phases/host/HostAnswering";
import { HostCategoryReveal } from "./phases/host/HostCategoryReveal";
// Host phase components
import { HostCategorySubmit } from "./phases/host/HostCategorySubmit";
import { HostClueResult } from "./phases/host/HostClueResult";
import { HostClueSelect } from "./phases/host/HostClueSelect";
import { HostFinalScores } from "./phases/host/HostFinalScores";
import { HostGeneratingBoard } from "./phases/host/HostGeneratingBoard";
import { HostPowerPlayAnswer } from "./phases/host/HostPowerPlayAnswer";
import { HostPowerPlayWager } from "./phases/host/HostPowerPlayWager";
import { HostRoundTransition } from "./phases/host/HostRoundTransition";
import { HostTopicChat } from "./phases/host/HostTopicChat";

import { CtrlAllInAnswer } from "./phases/controller/CtrlAllInAnswer";
import { CtrlAllInCategory } from "./phases/controller/CtrlAllInCategory";
import { CtrlAllInReveal } from "./phases/controller/CtrlAllInReveal";
import { CtrlAllInWager } from "./phases/controller/CtrlAllInWager";
import { CtrlAnswering } from "./phases/controller/CtrlAnswering";
import { CtrlCategoryReveal } from "./phases/controller/CtrlCategoryReveal";
// Controller phase components
import { CtrlCategorySubmit } from "./phases/controller/CtrlCategorySubmit";
import { CtrlClueResult } from "./phases/controller/CtrlClueResult";
import { CtrlClueSelect } from "./phases/controller/CtrlClueSelect";
import { CtrlFinalScores } from "./phases/controller/CtrlFinalScores";
import { CtrlGeneratingBoard } from "./phases/controller/CtrlGeneratingBoard";
import { CtrlPowerPlayAnswer } from "./phases/controller/CtrlPowerPlayAnswer";
import { CtrlPowerPlayWager } from "./phases/controller/CtrlPowerPlayWager";
import { CtrlRoundTransition } from "./phases/controller/CtrlRoundTransition";
import { CtrlTopicChat } from "./phases/controller/CtrlTopicChat";

export function BrainBoardOrchestrator({
  phase,
  players,
  privateData,
  gameEvents,
  mySessionId,
  isHost,
  sendMessage,
  room,
  errorNonce,
}: BrainBoardGameProps) {
  const pd = privateData ?? {};

  const state = useBrainBoardState({ phase, players, gameEvents, privateData, room });
  const actions = useBrainBoardActions({ sendMessage });

  const {
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
    selectorName,
    isMyTurn,
    clueOutcomes,
    gs,
  } = state;

  // ─── Host Board Rendering ──────────────────────────────────────

  function renderBoard(): React.ReactNode {
    const activePhase = resolvedPhase;
    const s = boardState;

    if (activePhase === "category-submit") {
      const submissions =
        s?.submissions ?? (gs.submissions as BrainBoardGameState["submissions"]) ?? {};
      return <HostCategorySubmit submissions={submissions} />;
    }

    if (activePhase === "topic-chat") {
      const chatMessages =
        s?.chatMessages ??
        (Array.isArray(gs.chatMessages)
          ? (gs.chatMessages as BrainBoardGameState["chatMessages"])
          : []) ??
        [];
      return <HostTopicChat chatMessages={chatMessages ?? []} topicPreview={topicPreview} />;
    }

    if (activePhase === "generating-board") {
      return <HostGeneratingBoard topicPreview={topicPreview} />;
    }

    if (!s) {
      return (
        <div className="flex items-center justify-center p-8">
          <p className="font-display text-[48px] text-accent-brainboard animate-glow-pulse">
            Loading Brain Board...
          </p>
        </div>
      );
    }

    if (activePhase === "category-reveal") {
      return (
        <HostCategoryReveal
          board={s.board}
          currentRound={s.currentRound}
          personalizationMessage={s.personalizationMessage ?? null}
          personalizationStatus={s.personalizationStatus ?? null}
        />
      );
    }

    if (activePhase === "clue-select") {
      return (
        <HostClueSelect
          board={s.board}
          revealedClues={s.revealedClues}
          clueOutcomes={clueOutcomes}
          selectorSessionId={s.selectorSessionId}
          doubleDownValues={s.doubleDownValues}
          standings={s.standings}
          players={players}
        />
      );
    }

    if (activePhase === "answering") {
      return (
        <HostAnswering
          currentCategoryName={s.currentCategoryName}
          currentClueValue={s.currentClueValue}
          currentClueQuestion={s.currentClueQuestion}
          answeredCount={s.answeredCount}
          totalPlayerCount={s.totalPlayerCount}
          players={players}
        />
      );
    }

    if (activePhase === "round-transition") {
      return <HostRoundTransition />;
    }

    if (activePhase === "power-play-wager") {
      return <HostPowerPlayWager selectorSessionId={s.selectorSessionId} players={players} />;
    }

    if (activePhase === "power-play-answer") {
      return (
        <HostPowerPlayAnswer
          selectorSessionId={s.selectorSessionId}
          currentClueQuestion={s.currentClueQuestion}
          powerPlayWager={powerPlayWager}
          players={players}
        />
      );
    }

    if (activePhase === "clue-result" && clueResult) {
      return <HostClueResult clueResult={clueResult} players={players} />;
    }

    if (activePhase === "all-in-category") {
      return <HostAllInCategory allInCategory={s.allInCategory} />;
    }

    if (activePhase === "all-in-wager") {
      return <HostAllInWager allInCategory={s.allInCategory} />;
    }

    if (activePhase === "all-in-answer") {
      return <HostAllInAnswer allInQuestion={s.allInQuestion} />;
    }

    if (activePhase === "all-in-reveal" && finalReveal) {
      return (
        <HostAllInReveal
          finalReveal={finalReveal}
          standings={s.standings}
          players={players}
          revealIndex={revealIndex}
        />
      );
    }

    if (activePhase === "final-scores") {
      return <HostFinalScores players={players} room={isHost ? room : null} />;
    }

    return (
      <div className="flex items-center justify-center p-8">
        <p className="font-display text-[48px] text-text-muted">Brain Board: {activePhase}</p>
      </div>
    );
  }

  // ─── Controller Rendering ──────────────────────────────────────

  function renderControls(): React.ReactNode {
    const activePhase = resolvedPhase;

    if (activePhase === "category-submit") {
      const submissions =
        gameState?.submissions ?? (gs.submissions as BrainBoardGameState["submissions"]) ?? {};
      const serverTimeOffset = typeof gs.serverTimeOffset === "number" ? gs.serverTimeOffset : 0;
      const csTimerEndsAt = typeof gs.timerEndsAt === "number" ? gs.timerEndsAt : 0;
      return (
        <CtrlCategorySubmit
          players={players}
          mySessionId={mySessionId}
          onSubmitCategories={actions.handleSubmitCategories}
          timerEndsAt={csTimerEndsAt}
          serverTimeOffset={serverTimeOffset}
          submissions={submissions}
        />
      );
    }

    if (activePhase === "topic-chat") {
      const chatMessages =
        gameState?.chatMessages ??
        (Array.isArray(gs.chatMessages)
          ? (gs.chatMessages as BrainBoardGameState["chatMessages"])
          : []) ??
        [];
      const serverTimeOffset = typeof gs.serverTimeOffset === "number" ? gs.serverTimeOffset : 0;
      const timerEndsAt = typeof gs.timerEndsAt === "number" ? gs.timerEndsAt : 0;
      return (
        <CtrlTopicChat
          topicPreview={topicPreview}
          chatMessages={chatMessages ?? []}
          players={players}
          mySessionId={mySessionId}
          onSendMessage={actions.handleChatMessage}
          timerEndsAt={timerEndsAt}
          serverTimeOffset={serverTimeOffset}
        />
      );
    }

    if (activePhase === "generating-board") {
      return <CtrlGeneratingBoard />;
    }

    if (activePhase === "category-reveal") {
      const revealCategories = Array.isArray(pd.categories)
        ? pd.categories.filter((c): c is string => typeof c === "string")
        : [];
      const visibleCategories = revealCategories.length > 0 ? revealCategories : boardCategories;
      const personalizationMessage =
        typeof boardState?.personalizationMessage === "string"
          ? boardState.personalizationMessage
          : typeof gs.personalizationMessage === "string"
            ? (gs.personalizationMessage as string)
            : null;
      const personalizationStatus =
        boardState?.personalizationStatus ??
        (typeof gs.personalizationStatus === "string"
          ? (gs.personalizationStatus as "pending" | "ai" | "curated")
          : null);
      return (
        <CtrlCategoryReveal
          isSelector={pd.isSelector === true}
          categories={visibleCategories}
          personalizationMessage={personalizationMessage}
          personalizationStatus={personalizationStatus}
          onConfirm={actions.handleConfirmCategories}
          onReroll={actions.handleRerollBoard}
        />
      );
    }

    if (activePhase === "clue-select") {
      const selectorCategories = Array.isArray(pd.categories)
        ? pd.categories.filter((c): c is string => typeof c === "string")
        : [];
      const selectorAnsweredClues = Array.isArray(pd.answeredClues)
        ? pd.answeredClues.filter((c): c is string => typeof c === "string")
        : [];
      const revealedClues = Array.isArray(gs.revealedClues) ? (gs.revealedClues as string[]) : [];
      return (
        <CtrlClueSelect
          isSelector={pd.isSelector === true}
          isHost={isHost}
          selectorCategories={selectorCategories}
          selectorAnsweredClues={selectorAnsweredClues}
          boardCategories={boardCategories}
          revealedClues={revealedClues}
          clueOutcomes={clueOutcomes}
          selectorName={selectorName}
          bbStandings={bbStandings}
          players={players}
          mySessionId={mySessionId}
          currentRound={currentRound}
          doubleDownValues={doubleDownValues}
          onSelect={actions.handleClueSelect}
        />
      );
    }

    if (activePhase === "answering") {
      const hasAnswered = pd.hasAnswered === true;
      const clueQ = hasAnswered
        ? typeof gs.currentClueQuestion === "string"
          ? gs.currentClueQuestion
          : ""
        : typeof pd.clueQuestion === "string"
          ? pd.clueQuestion
          : "";
      const clueCat = typeof pd.clueCategory === "string" ? pd.clueCategory : "";
      const clueVal = typeof pd.clueValue === "number" ? pd.clueValue : 0;
      return (
        <CtrlAnswering
          hasAnswered={hasAnswered}
          clueQuestion={clueQ}
          clueCategory={clueCat}
          clueValue={clueVal}
          answeredCount={answeredCount}
          totalPlayerCount={totalPlayerCount}
          onSubmit={actions.handleBrainBoardAnswer}
          errorNonce={errorNonce}
        />
      );
    }

    if (activePhase === "power-play-wager") {
      const maxWager = typeof pd.maxWager === "number" ? pd.maxWager : 1000;
      return (
        <CtrlPowerPlayWager
          isPowerPlayPlayer={pd.isPowerPlayPlayer === true}
          maxWager={maxWager}
          onSubmit={actions.handlePowerPlayWagerSubmit}
        />
      );
    }

    if (activePhase === "power-play-answer") {
      const clueQ =
        typeof pd.clueQuestion === "string"
          ? pd.clueQuestion
          : typeof boardState?.currentClueQuestion === "string"
            ? boardState.currentClueQuestion
            : typeof gs.currentClueQuestion === "string"
              ? (gs.currentClueQuestion as string)
              : "";
      return (
        <CtrlPowerPlayAnswer
          isPowerPlayPlayer={pd.isPowerPlayPlayer === true}
          clueQuestion={clueQ}
          onSubmit={actions.handlePowerPlayAnswer}
          errorNonce={errorNonce}
        />
      );
    }

    if (activePhase === "clue-result") {
      return (
        <CtrlClueResult
          clueResult={clueResult}
          boardStateClueResult={boardState?.clueResult}
          gameEvents={gameEvents}
          players={players}
          mySessionId={mySessionId}
        />
      );
    }

    if (activePhase === "round-transition") {
      return (
        <CtrlRoundTransition
          bbStandings={bbStandings}
          players={players}
          mySessionId={mySessionId}
        />
      );
    }

    if (activePhase === "all-in-category") {
      return <CtrlAllInCategory />;
    }

    if (activePhase === "all-in-wager") {
      const playerScore = typeof pd.score === "number" ? pd.score : 0;
      const allInCat =
        typeof pd.allInCategory === "string"
          ? pd.allInCategory
          : typeof boardState?.allInCategory === "string"
            ? boardState.allInCategory
            : typeof gs.allInCategory === "string"
              ? (gs.allInCategory as string)
              : "";
      return (
        <CtrlAllInWager
          canWagerFinal={pd.canWagerFinal === true}
          score={playerScore}
          allInCategory={allInCat}
          onSubmit={actions.handleAllInWager}
        />
      );
    }

    if (activePhase === "all-in-answer") {
      const allInCat =
        typeof pd.allInCategory === "string"
          ? pd.allInCategory
          : typeof boardState?.allInCategory === "string"
            ? boardState.allInCategory
            : typeof gs.allInCategory === "string"
              ? (gs.allInCategory as string)
              : "";
      const allInQ =
        typeof pd.allInQuestion === "string"
          ? pd.allInQuestion
          : typeof boardState?.allInQuestion === "string"
            ? boardState.allInQuestion
            : typeof gs.allInQuestion === "string"
              ? (gs.allInQuestion as string)
              : "";
      return (
        <CtrlAllInAnswer
          canAnswerFinal={pd.canAnswerFinal === true}
          allInCategory={allInCat}
          allInQuestion={allInQ}
          onSubmit={actions.handleAllInAnswer}
          errorNonce={errorNonce}
        />
      );
    }

    if (activePhase === "all-in-reveal") {
      return (
        <CtrlAllInReveal
          finalReveal={finalReveal}
          boardStateAllInReveal={boardState?.allInReveal}
          gameEvents={gameEvents}
          players={players}
          mySessionId={mySessionId}
        />
      );
    }

    if (activePhase === "final-scores") {
      return (
        <CtrlFinalScores
          bbStandings={bbStandings}
          players={players}
          mySessionId={mySessionId}
          currentRound={currentRound}
          doubleDownValues={doubleDownValues}
        />
      );
    }

    return <WaitingScreen phase={activePhase} gameId="brain-board" />;
  }

  // ─── Layout ──────────────────────────────────────────────────────

  if (resolvedPhase === "final-scores") {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col"
        data-testid="brain-board-host-state"
        data-phase={resolvedPhase}
        data-round={currentRound}
      >
        {renderBoard()}
      </div>
    );
  }

  return (
    <div data-testid="brain-board-host-state" data-phase={resolvedPhase} data-round={currentRound}>
      <GameBoard
        board={renderBoard()}
        controls={
          <>
            <PlayerStatus
              turnPlayerName={selectorName}
              isMyTurn={isMyTurn}
              message={
                resolvedPhase === "answering"
                  ? pd.hasAnswered
                    ? "Answer locked in!"
                    : "Answer now!"
                  : resolvedPhase === "category-submit"
                    ? "Submit your category ideas"
                    : resolvedPhase === "topic-chat"
                      ? "Chat with AI about topics"
                      : undefined
              }
            />
            {renderControls()}
          </>
        }
      />
    </div>
  );
}
