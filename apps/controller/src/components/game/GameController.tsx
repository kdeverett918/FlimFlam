"use client";

import { BrainBoardChat } from "@/components/controls/BrainBoardChat";
import { BrainBoardClueResult } from "@/components/controls/BrainBoardClueResult";
import { BrainBoardStandings } from "@/components/controls/BrainBoardStandings";
import { CategoryReveal } from "@/components/controls/CategoryReveal";
import { ClueGrid } from "@/components/controls/ClueGrid";
import { LetterPicker } from "@/components/controls/LetterPicker";
import { MobileLetterResult } from "@/components/controls/MobileLetterResult";
import { MobilePuzzleBoard } from "@/components/controls/MobilePuzzleBoard";
import { MobileSpinResult } from "@/components/controls/MobileSpinResult";
import { MobileStandings } from "@/components/controls/MobileStandings";
import { NumberInput } from "@/components/controls/NumberInput";
import { QuickGuessInput } from "@/components/controls/QuickGuessInput";
import { SpinButton } from "@/components/controls/SpinButton";
import { TextInput } from "@/components/controls/TextInput";
import type { PlayerData } from "@flimflam/shared";
import { ConfettiBurst, GameThemeProvider, GlassPanel } from "@flimflam/ui";
import type { GameTheme } from "@flimflam/ui";
import { Monitor, Trophy, Zap } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { ReactionBar } from "./ReactionBar";
import { WaitingScreen } from "./WaitingScreen";

interface PrivateData {
  [key: string]: unknown;
}

interface GameControllerProps {
  gameId: string;
  phase: string;
  round: number;
  totalRounds: number;
  privateData: PrivateData | null;
  gameEvents: Record<string, Record<string, unknown>>;
  players: PlayerData[];
  mySessionId: string | null;
  errorNonce?: number;
  sendMessage: (type: string, data?: Record<string, unknown>) => void;
}

const GAME_THEME_MAP: Record<string, GameTheme> = {
  "brain-board": "brain-board",
  "lucky-letters": "lucky-letters",
  "survey-smash": "survey-smash",
};

const GAME_DISPLAY_NAMES: Record<string, string> = {
  "brain-board": "Brain Board",
  "lucky-letters": "Lucky Letters",
  "survey-smash": "Survey Smash",
};

const GAME_ACCENT_CLASSES: Record<string, string> = {
  "brain-board": "text-accent-brainboard bg-accent-brainboard/15",
  "lucky-letters": "text-accent-luckyletters bg-accent-luckyletters/15",
  "survey-smash": "text-accent-surveysmash bg-accent-surveysmash/15",
};

export function GameController({
  gameId,
  phase,
  round,
  totalRounds,
  privateData,
  gameEvents,
  players,
  mySessionId,
  errorNonce,
  sendMessage,
}: GameControllerProps) {
  // ─── Common message handlers ──────────────────────────────────────
  const [isTeamRosterOpen, setIsTeamRosterOpen] = useState(false);
  const [lastSubmittedText, setLastSubmittedText] = useState<string | null>(null);

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

  const handleClueSelect = useCallback(
    (clueId: string) => {
      const [catStr, clueStr] = clueId.split(",");
      const categoryIndex = Number(catStr);
      const clueIndex = Number(clueStr);
      if (!Number.isNaN(categoryIndex) && !Number.isNaN(clueIndex)) {
        sendMessage("player:select-clue", { categoryIndex, clueIndex });
      }
    },
    [sendMessage],
  );

  const handleSpin = useCallback(() => {
    sendMessage("player:spin");
  }, [sendMessage]);

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

  const handleBrainBoardAnswer = useCallback(
    (text: string) => {
      setLastSubmittedText(text.trim());
      sendMessage("player:answer", { answer: text });
    },
    [sendMessage],
  );

  const handlePowerPlayWager = useCallback(
    (wager: number) => {
      sendMessage("player:power-play-wager", { wager });
    },
    [sendMessage],
  );

  const handlePowerPlayAnswer = useCallback(
    (text: string) => {
      setLastSubmittedText(text.trim());
      sendMessage("player:power-play-answer", { answer: text });
    },
    [sendMessage],
  );

  const handleAllInWager = useCallback(
    (wager: number) => {
      sendMessage("player:all-in-wager", { wager });
    },
    [sendMessage],
  );

  const handleAllInAnswer = useCallback(
    (text: string) => {
      setLastSubmittedText(text.trim());
      sendMessage("player:all-in-answer", { answer: text });
    },
    [sendMessage],
  );

  const handleConfirmCategories = useCallback(() => {
    sendMessage("player:confirm-categories");
  }, [sendMessage]);

  const handleRerollBoard = useCallback(() => {
    sendMessage("player:reroll-board");
  }, [sendMessage]);

  const handleChatMessage = useCallback(
    (text: string) => {
      sendMessage("player:chat-message", { message: text });
    },
    [sendMessage],
  );

  // ─── Lucky Letters action chooser helpers ──────────────────────

  const handleChooseBuyVowel = useCallback(() => {
    sendMessage("player:choose-action", { action: "buy-vowel" });
  }, [sendMessage]);

  const handleChooseSolve = useCallback(() => {
    sendMessage("player:choose-action", { action: "solve" });
  }, [sendMessage]);

  // ─── Theme / display ─────────────────────────────────────────────

  const themeKey = GAME_THEME_MAP[gameId] ?? "default";
  const gameName = GAME_DISPLAY_NAMES[gameId] ?? gameId;
  const accentClass =
    GAME_ACCENT_CLASSES[gameId] ?? "text-accent-brainboard bg-accent-brainboard/15";

  // ─── Private data as typed helpers ────────────────────────────────

  const pd = privateData ?? {};

  // Build used letters set for Lucky Letters from revealedLetters broadcast
  const usedLetters = useMemo(() => {
    const letters = Array.isArray(pd.revealedLetters) ? pd.revealedLetters : [];
    return new Set(letters.filter((l): l is string => typeof l === "string"));
  }, [pd.revealedLetters]);

  // ─── Render game-specific content ─────────────────────────────────

  let content: React.ReactNode;

  switch (gameId) {
    case "brain-board":
      content = renderBrainBoard(phase);
      break;
    case "lucky-letters":
      content = renderLuckyLetters(phase);
      break;
    case "survey-smash":
      content = renderSurveySmash(phase);
      break;
    default:
      content = renderGenericPhase(phase);
      break;
  }

  return (
    <GameThemeProvider defaultTheme={themeKey}>
      {/* Compact header bar with game info */}
      <div className="flex items-center justify-center gap-3 px-4 py-2">
        <div
          className={`rounded-full px-3 py-1 font-display text-xs font-bold uppercase tracking-wider ${accentClass}`}
        >
          {gameName}
        </div>
        {round > 0 && totalRounds > 0 && (
          <span className="font-mono text-xs text-text-muted">
            {round}/{totalRounds}
          </span>
        )}
      </div>
      {content}
      <ReactionBar sendMessage={sendMessage} />
    </GameThemeProvider>
  );

  // ────────────────────────────────────────────────────────────────────
  // BRAIN BOARD
  // ────────────────────────────────────────────────────────────────────

  function renderBrainBoard(currentPhase: string): React.ReactNode {
    // ─── Shared game state extraction ──────────────────────
    const gs = (gameEvents?.["game-state"] ?? {}) as Record<string, unknown>;
    const boardCategories = Array.isArray(gs.board)
      ? (gs.board as Array<{ name?: string }>)
          .map((entry) => (typeof entry.name === "string" ? entry.name : ""))
          .filter((name) => name.length > 0)
      : [];
    const bbStandings = Array.isArray(gs.standings)
      ? (gs.standings as Array<{ sessionId: string; score: number }>)
      : [];
    const currentRound = typeof gs.currentRound === "number" ? gs.currentRound : 1;
    const doubleDownValues = gs.doubleDownValues === true;
    const answeredCount = typeof gs.answeredCount === "number" ? gs.answeredCount : 0;
    const totalPlayerCount = typeof gs.totalPlayerCount === "number" ? gs.totalPlayerCount : 0;
    const selectorName = (() => {
      const sid = typeof gs.selectorSessionId === "string" ? gs.selectorSessionId : null;
      if (!sid) return null;
      return players.find((p) => p.sessionId === sid)?.name ?? null;
    })();

    // Chat messages for topic-chat phase
    const chatMessages = Array.isArray(gs.chatMessages)
      ? (gs.chatMessages as Array<{
          id: string;
          sender: string;
          senderSessionId: string;
          message: string;
          isAI: boolean;
          timestamp: number;
        }>)
      : [];

    const serverTimeOffset = typeof gs.serverTimeOffset === "number" ? gs.serverTimeOffset : 0;
    const timerEndsAt = typeof gs.timerEndsAt === "number" ? gs.timerEndsAt : 0;

    switch (currentPhase) {
      // ─── Pre-Game AI Chat ────────────────────────────────
      case "topic-chat": {
        return (
          <div
            className="flex flex-col gap-2 pb-16 pt-2"
            style={{ minHeight: "calc(100dvh - 120px)" }}
          >
            <BrainBoardChat
              messages={chatMessages}
              players={players}
              mySessionId={mySessionId}
              onSendMessage={handleChatMessage}
              timerEndsAt={timerEndsAt}
              serverTimeOffset={serverTimeOffset}
            />
          </div>
        );
      }

      case "generating-board": {
        return (
          <div className="flex flex-col items-center gap-6 px-4 pb-16 pt-8 animate-fade-in-up">
            <GlassPanel
              glow
              glowColor="oklch(0.68 0.22 265 / 0.3)"
              className="flex flex-col items-center gap-5 px-8 py-8"
            >
              <div className="relative">
                <div className="h-12 w-12 animate-spin-slow rounded-full border-2 border-accent-brainboard/30 border-t-accent-brainboard" />
                <Zap className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-accent-brainboard" />
              </div>
              <p className="font-display text-lg font-bold text-text-primary">
                Building Your Board
              </p>
              <p className="text-center font-body text-sm text-text-muted">
                AI is crafting custom trivia from your topics...
              </p>
            </GlassPanel>
          </div>
        );
      }

      case "category-reveal": {
        const revealCategories = Array.isArray(pd.categories)
          ? pd.categories.filter((c): c is string => typeof c === "string")
          : [];

        if (pd.isSelector === true && revealCategories.length > 0) {
          return (
            <CategoryReveal
              categories={revealCategories}
              isSelector={pd.isSelector === true}
              onConfirm={handleConfirmCategories}
              onReroll={handleRerollBoard}
            />
          );
        }
        return renderBrainBoardGridWatchCard(
          "Categories revealed. Selector is choosing...",
          boardCategories.length > 0 ? boardCategories : revealCategories,
        );
      }

      case "clue-select": {
        if (pd.isSelector) {
          const categories = Array.isArray(pd.categories)
            ? pd.categories.filter((c): c is string => typeof c === "string")
            : [];
          const answeredClues = Array.isArray(pd.answeredClues)
            ? pd.answeredClues.filter((c): c is string => typeof c === "string")
            : [];

          return (
            <div className="flex flex-col gap-4 pb-16 pt-4 animate-slide-up-spring">
              <div className="mx-4 flex justify-center">
                <span className="rounded-full border border-accent-brainboard/30 bg-accent-brainboard/15 px-4 py-1.5 font-display text-xs font-bold text-accent-brainboard uppercase">
                  Your pick!
                </span>
              </div>
              <ClueGrid
                categories={categories}
                answeredClues={answeredClues}
                onSelect={handleClueSelect}
              />
            </div>
          );
        }
        // Non-selector sees read-only board with standings
        const answeredClues = Array.isArray(gs.revealedClues) ? (gs.revealedClues as string[]) : [];
        return (
          <div className="flex flex-col gap-4 pb-16 pt-4 animate-fade-in-up">
            <div className="mx-4 flex justify-center">
              <span className="rounded-full border border-accent-brainboard/30 bg-accent-brainboard/15 px-4 py-1.5 font-display text-xs font-bold text-accent-brainboard uppercase">
                {selectorName ? `${selectorName}'s pick` : "Selector is picking..."}
              </span>
            </div>
            <ClueGrid
              categories={boardCategories}
              answeredClues={answeredClues}
              onSelect={handleClueSelect}
              readOnly
            />
            {bbStandings.length > 0 && (
              <div className="mt-2">
                <BrainBoardStandings
                  standings={bbStandings}
                  players={players}
                  mySessionId={mySessionId}
                  currentRound={currentRound}
                  doubleDownValues={doubleDownValues}
                />
              </div>
            )}
          </div>
        );
      }

      case "answering": {
        if (pd.hasAnswered) {
          const gs2 = (gameEvents?.["game-state"] ?? {}) as Record<string, unknown>;
          const clueQ = typeof gs2.currentClueQuestion === "string" ? gs2.currentClueQuestion : "";
          return (
            <div className="flex flex-col items-center gap-4 px-4 pb-16 pt-4 animate-fade-in-up">
              <GlassPanel className="flex w-full max-w-sm flex-col items-center gap-3 px-6 py-5">
                <p className="font-display text-lg font-bold text-accent-brainboard">Locked In!</p>
                <p className="text-center font-body text-sm text-text-muted">{clueQ}</p>
                {totalPlayerCount > 0 && (
                  <div className="mt-2 flex flex-col items-center gap-1">
                    <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-accent-brainboard transition-all duration-500"
                        style={{
                          width: `${totalPlayerCount > 0 ? (answeredCount / totalPlayerCount) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <p className="font-mono text-xs text-text-dim">
                      {answeredCount}/{totalPlayerCount} answered
                    </p>
                  </div>
                )}
              </GlassPanel>
            </div>
          );
        }
        const clueQ = typeof pd.clueQuestion === "string" ? pd.clueQuestion : "";
        const clueCat = typeof pd.clueCategory === "string" ? pd.clueCategory : "";
        const clueVal = typeof pd.clueValue === "number" ? pd.clueValue : 0;
        return (
          <div className="flex flex-col gap-4 pb-16 pt-4 animate-slide-up-spring">
            {clueCat && (
              <div className="mx-4 flex justify-center">
                <span className="rounded-lg border border-accent-brainboard/30 bg-accent-brainboard/15 px-4 py-2 font-display text-sm font-bold text-accent-brainboard uppercase">
                  {clueCat} — ${clueVal}
                </span>
              </div>
            )}
            {clueQ && (
              <div className="px-4">
                <GlassPanel glow glowColor="oklch(0.68 0.22 265 / 0.2)" className="px-4 py-4">
                  <p className="text-center font-body text-lg font-medium text-text-primary">
                    {clueQ}
                  </p>
                </GlassPanel>
              </div>
            )}
            <TextInput
              prompt="Your answer:"
              placeholder="Answer..."
              onSubmit={handleBrainBoardAnswer}
              resetNonce={errorNonce}
            />
          </div>
        );
      }

      case "power-play-wager": {
        if (pd.isPowerPlayPlayer) {
          const maxWager = typeof pd.maxWager === "number" ? pd.maxWager : 1000;
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <div className="mx-4 rounded-2xl border border-amber-400/30 animate-power-play-pulse">
                <div className="flex flex-col items-center gap-3 px-6 py-5">
                  <div className="flex items-center gap-2">
                    <Zap className="h-6 w-6" style={{ color: "oklch(0.82 0.2 85)" }} />
                    <p
                      className="font-display text-2xl font-black uppercase"
                      style={{
                        color: "oklch(0.82 0.2 85)",
                        textShadow: "0 0 24px oklch(0.82 0.2 85 / 0.5)",
                      }}
                    >
                      Power Play!
                    </p>
                    <Zap className="h-6 w-6" style={{ color: "oklch(0.82 0.2 85)" }} />
                  </div>
                  <p className="font-body text-sm text-text-muted">Only you can answer this one</p>
                </div>
              </div>
              <NumberInput
                min={5}
                max={maxWager}
                label="Set your wager:"
                onSubmit={handlePowerPlayWager}
              />
            </div>
          );
        }
        return renderBrainBoardWatchCard("Power Play!");
      }

      case "power-play-answer": {
        if (pd.isPowerPlayPlayer) {
          const clueQ = typeof pd.clueQuestion === "string" ? pd.clueQuestion : "";
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <div className="mx-4 rounded-2xl border border-amber-400/30 animate-power-play-pulse">
                <div className="flex flex-col items-center gap-2 px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5" style={{ color: "oklch(0.82 0.2 85)" }} />
                    <p
                      className="font-display text-xl font-black uppercase"
                      style={{
                        color: "oklch(0.82 0.2 85)",
                        textShadow: "0 0 24px oklch(0.82 0.2 85 / 0.5)",
                      }}
                    >
                      Power Play!
                    </p>
                  </div>
                  {clueQ && (
                    <p className="text-center font-body text-sm text-text-primary">{clueQ}</p>
                  )}
                </div>
              </div>
              <TextInput
                prompt="Your answer:"
                placeholder="Answer..."
                onSubmit={handlePowerPlayAnswer}
                resetNonce={errorNonce}
              />
            </div>
          );
        }
        return renderBrainBoardWatchCard("Waiting for the Power Play answer...");
      }

      case "all-in-wager": {
        if (pd.canWagerFinal) {
          const playerScore = typeof pd.score === "number" ? pd.score : 0;
          const allInCat = typeof pd.allInCategory === "string" ? pd.allInCategory : "";
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <div className="mx-4 rounded-2xl border border-accent-brainboard/30 animate-all-in-glow">
                <div className="flex flex-col items-center gap-2 px-6 py-5">
                  <p
                    className="font-display text-2xl font-black uppercase text-accent-brainboard"
                    style={{
                      textShadow: "0 0 24px oklch(0.68 0.22 265 / 0.5)",
                    }}
                  >
                    All-In Round
                  </p>
                  {allInCat && (
                    <p className="font-display text-sm font-bold text-accent-brainboard uppercase">
                      {allInCat}
                    </p>
                  )}
                  <p className="font-body text-xs text-text-muted">Risk it all on one final clue</p>
                </div>
              </div>
              <NumberInput
                min={0}
                max={playerScore}
                label="Set your wager:"
                onSubmit={handleAllInWager}
              />
            </div>
          );
        }
        return renderBrainBoardWatchCard("All-In wagers being placed...");
      }

      case "all-in-answer": {
        if (pd.canAnswerFinal) {
          const allInCat = typeof pd.allInCategory === "string" ? pd.allInCategory : "";
          const allInQ = typeof gs.allInQuestion === "string" ? gs.allInQuestion : "";
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <div className="mx-4 rounded-2xl border border-accent-brainboard/30 animate-all-in-glow">
                <div className="flex flex-col items-center gap-2 px-6 py-4">
                  <p
                    className="font-display text-xl font-black uppercase text-accent-brainboard"
                    style={{
                      textShadow: "0 0 24px oklch(0.68 0.22 265 / 0.5)",
                    }}
                  >
                    All-In Round
                  </p>
                  {allInCat && (
                    <p className="font-display text-xs font-bold text-accent-brainboard uppercase">
                      {allInCat}
                    </p>
                  )}
                  {allInQ && (
                    <p className="text-center font-body text-sm text-text-primary">{allInQ}</p>
                  )}
                </div>
              </div>
              <TextInput
                prompt="Your answer:"
                placeholder="Answer..."
                onSubmit={handleAllInAnswer}
                resetNonce={errorNonce}
              />
            </div>
          );
        }
        return renderBrainBoardWatchCard("All-In answers being submitted...");
      }

      case "clue-result": {
        const clueResultEvent = (gameEvents?.["clue-result"] ?? null) as {
          results?: Array<{
            sessionId: string;
            answer: string;
            correct: boolean;
            delta: number;
            judgedBy?: string;
            judgeExplanation?: string;
          }>;
          correctAnswer?: string;
          question?: string;
          value?: number;
          isPowerPlay?: boolean;
        } | null;

        if (clueResultEvent?.results && clueResultEvent.correctAnswer) {
          return (
            <BrainBoardClueResult
              clueResult={{
                results: clueResultEvent.results,
                correctAnswer: clueResultEvent.correctAnswer,
                question: clueResultEvent.question ?? "",
                value: clueResultEvent.value ?? 0,
                isPowerPlay: clueResultEvent.isPowerPlay ?? false,
              }}
              players={players}
              mySessionId={mySessionId}
            />
          );
        }
        return renderBrainBoardWatchCard("Results are in!");
      }

      case "round-transition":
        return (
          <div className="flex flex-col items-center gap-6 px-4 pb-16 pt-8 animate-cinematic-entrance">
            <GlassPanel
              glow
              glowColor="oklch(0.82 0.18 85 / 0.3)"
              className="flex flex-col items-center gap-4 px-8 py-8"
            >
              <p
                className="font-display text-3xl font-black uppercase"
                style={{
                  color: "oklch(0.82 0.18 85)",
                  textShadow: "0 0 32px oklch(0.82 0.18 85 / 0.6)",
                }}
              >
                Double Down!
              </p>
              <p className="font-body text-sm text-text-muted">
                Values are doubled. Stakes are higher.
              </p>
            </GlassPanel>
            {bbStandings.length > 0 && (
              <BrainBoardStandings
                standings={bbStandings}
                players={players}
                mySessionId={mySessionId}
                currentRound={2}
                doubleDownValues
              />
            )}
          </div>
        );

      case "all-in-category":
        return (
          <div className="flex flex-col items-center gap-4 px-4 pb-16 pt-8 animate-cinematic-entrance">
            <GlassPanel
              glow
              glowColor="oklch(0.68 0.22 265 / 0.3)"
              className="flex flex-col items-center gap-4 px-8 py-8 animate-all-in-glow"
            >
              <p
                className="font-display text-2xl font-black uppercase text-accent-brainboard"
                style={{ textShadow: "0 0 24px oklch(0.68 0.22 265 / 0.5)" }}
              >
                All-In Round
              </p>
              <p className="font-body text-sm text-text-muted">
                One final question. Wager everything.
              </p>
            </GlassPanel>
          </div>
        );

      case "all-in-reveal": {
        const allInRevealEvent = (gameEvents?.["all-in-reveal"] ?? null) as {
          results?: Array<{
            sessionId: string;
            answer: string;
            correct: boolean;
            delta: number;
            wager?: number;
          }>;
          correctAnswer?: string;
          question?: string;
        } | null;

        if (allInRevealEvent?.results && allInRevealEvent.correctAnswer) {
          return (
            <BrainBoardClueResult
              clueResult={{
                results: allInRevealEvent.results.map((r) => ({
                  ...r,
                  judgedBy: undefined,
                  judgeExplanation: undefined,
                })),
                correctAnswer: allInRevealEvent.correctAnswer,
                question: allInRevealEvent.question ?? "",
                value: 0,
                isPowerPlay: false,
              }}
              players={players}
              mySessionId={mySessionId}
            />
          );
        }
        return renderBrainBoardWatchCard("Final Reveal!");
      }

      case "final-scores": {
        // Show standings above the generic final scores card
        return (
          <div className="flex flex-col gap-4 pb-16 pt-2">
            {bbStandings.length > 0 && (
              <BrainBoardStandings
                standings={bbStandings}
                players={players}
                mySessionId={mySessionId}
                currentRound={currentRound}
                doubleDownValues={doubleDownValues}
              />
            )}
            {renderFinalScoresCard()}
          </div>
        );
      }

      default:
        return renderBrainBoardWatchCard("Watch the board.");
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // LUCKY LETTERS
  // ────────────────────────────────────────────────────────────────────

  function renderLuckyLetters(currentPhase: string): React.ReactNode {
    const isMyTurn = pd.isMyTurn === true;
    const canBuyVowel = pd.canBuyVowel === true;
    const isBonusPlayer = pd.isBonusPlayer === true;

    // Extract game-data events for rich mobile views
    const gs = (gameEvents?.["game-state"] ?? {}) as Record<string, unknown>;
    const spinResult = gameEvents?.["spin-result"] as
      | { type: string; segment: { type: string; value: number; label: string }; angle: number }
      | undefined;
    const letterResult = gameEvents?.["letter-result"] as
      | {
          letter: string;
          count: number;
          inPuzzle: boolean;
          earned: number;
          vowelCost?: number;
          streak?: number;
        }
      | undefined;
    const roundResult = gameEvents?.["round-result"] as
      | {
          winnerId: string | null;
          answer: string;
          category: string;
          roundCashEarned: number;
          standings: Array<{ sessionId: string; roundCash: number; totalCash: number }>;
        }
      | undefined;
    const bonusReveal = gameEvents?.["bonus-reveal"] as
      | { solved: boolean; answer: string; bonusPrize: number; bonusPlayerId: string | null }
      | undefined;
    const bonusPickConfirmed = gameEvents?.["bonus-pick-confirmed"] as
      | { letter: string; pickedSoFar: string[] }
      | undefined;

    // Game state from broadcast
    const puzzleDisplay = typeof gs.puzzleDisplay === "string" ? gs.puzzleDisplay : "";
    const category = typeof gs.category === "string" ? gs.category : "";
    const hint = typeof gs.hint === "string" ? gs.hint : "";
    const currentTurnSessionId =
      typeof gs.currentTurnSessionId === "string" ? gs.currentTurnSessionId : null;
    const standings = Array.isArray(gs.standings)
      ? (gs.standings as Array<{ sessionId: string; roundCash: number; totalCash: number }>)
      : [];
    const streak = typeof gs.streak === "number" ? gs.streak : 0;
    const bonusPlayerSessionId =
      typeof gs.bonusPlayerSessionId === "string" ? gs.bonusPlayerSessionId : null;

    // Puzzle stats for progress bar
    const totalLetters = puzzleDisplay
      ? puzzleDisplay.split("").filter((ch) => /[A-Z_]/.test(ch)).length
      : 0;
    const revealedCount = puzzleDisplay
      ? puzzleDisplay.split("").filter((ch) => /[A-Z]/.test(ch)).length
      : 0;

    const getPlayerName = (sessionId: string | null) =>
      players?.find((p) => p.sessionId === sessionId)?.name ?? "Player";
    const turnPlayerName = getPlayerName(currentTurnSessionId);
    const roundCash = typeof pd.roundCash === "number" ? pd.roundCash : 0;

    // Shared puzzle board element
    const puzzleBoard = puzzleDisplay ? (
      <MobilePuzzleBoard
        puzzleDisplay={puzzleDisplay}
        category={category}
        hint={hint}
        revealedCount={revealedCount}
        totalLetters={totalLetters}
      />
    ) : null;

    const luckyMyResultCard = (() => {
      if (currentPhase === "letter-result" && letterResult) {
        const delta = letterResult.earned - (letterResult.vowelCost ?? 0);
        return (
          <GlassPanel data-testid="my-result" className="mx-4 rounded-2xl px-4 py-3">
            <p className="text-center font-display text-xs font-bold uppercase tracking-wider text-accent-luckyletters">
              My Result
            </p>
            <p className="mt-1 text-center font-body text-sm text-text-primary">
              {lastSubmittedText || letterResult.letter}
            </p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="font-mono text-[10px] uppercase text-text-muted">
                {letterResult.inPuzzle ? "Hit" : "Miss"}
              </span>
              <span
                className={`font-mono text-xs font-bold ${delta > 0 ? "text-success" : "text-text-muted"}`}
              >
                {delta > 0 ? `+${delta}` : `${delta}`}
              </span>
            </div>
          </GlassPanel>
        );
      }

      if (currentPhase === "round-result" && roundResult) {
        const wonRound = mySessionId !== null && roundResult.winnerId === mySessionId;
        return (
          <GlassPanel data-testid="my-result" className="mx-4 rounded-2xl px-4 py-3">
            <p className="text-center font-display text-xs font-bold uppercase tracking-wider text-accent-luckyletters">
              My Result
            </p>
            <p className="mt-1 text-center font-body text-sm text-text-primary">
              {lastSubmittedText || (wonRound ? roundResult.answer : "No solve submitted")}
            </p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="font-mono text-[10px] uppercase text-text-muted">
                {wonRound ? "Round Win" : "No Win"}
              </span>
              <span
                className={`font-mono text-xs font-bold ${wonRound ? "text-success" : "text-text-muted"}`}
              >
                {wonRound ? `+${roundResult.roundCashEarned}` : "+0"}
              </span>
            </div>
          </GlassPanel>
        );
      }

      if (
        currentPhase === "bonus-reveal" &&
        bonusReveal &&
        mySessionId === bonusReveal.bonusPlayerId
      ) {
        return (
          <GlassPanel data-testid="my-result" className="mx-4 rounded-2xl px-4 py-3">
            <p className="text-center font-display text-xs font-bold uppercase tracking-wider text-accent-luckyletters">
              My Result
            </p>
            <p className="mt-1 text-center font-body text-sm text-text-primary">
              {lastSubmittedText || bonusReveal.answer}
            </p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="font-mono text-[10px] uppercase text-text-muted">
                {bonusReveal.solved ? "Solved" : "Miss"}
              </span>
              <span
                className={`font-mono text-xs font-bold ${bonusReveal.solved ? "text-success" : "text-text-muted"}`}
              >
                {bonusReveal.solved ? `+${bonusReveal.bonusPrize}` : "+0"}
              </span>
            </div>
          </GlassPanel>
        );
      }

      return null;
    })();

    switch (currentPhase) {
      case "round-intro": {
        const gsRound = typeof gs.round === "number" ? gs.round : round;
        const gsTotalRounds = typeof gs.totalRounds === "number" ? gs.totalRounds : totalRounds;
        return (
          <div className="flex flex-col items-center gap-5 px-4 pb-16 pt-6 animate-fade-in-up">
            <GlassPanel glow className="flex w-full max-w-sm flex-col items-center gap-4 px-6 py-6">
              {/* Round badge */}
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-accent-luckyletters/40 bg-accent-luckyletters/15">
                <span className="font-display text-xl font-black text-accent-luckyletters">
                  {gsRound}
                </span>
              </div>
              <p className="font-display text-lg font-bold text-text-primary uppercase tracking-wider">
                Round {gsRound} of {gsTotalRounds}
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
              <p className="font-body text-xs text-text-dim">Get ready!</p>
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

      case "spinning": {
        if (isMyTurn) {
          return (
            <div className="flex flex-col gap-3 pb-16 animate-fade-in-up">
              {puzzleBoard}
              {roundCash > 0 && (
                <div className="flex justify-center">
                  <span className="rounded-full bg-red-500/10 px-3 py-1 font-mono text-xs font-bold text-red-400">
                    At Risk: ${roundCash.toLocaleString()}
                  </span>
                </div>
              )}
              {spinResult && (
                <MobileSpinResult
                  segment={spinResult.segment}
                  currentTurnName="You"
                  isMyTurn={true}
                  roundCashAtRisk={roundCash}
                />
              )}
              <SpinButton onSpin={handleSpin} />
              {/* Action chooser: buy vowel / solve */}
              <div className="flex items-center justify-center gap-3 px-4">
                {canBuyVowel && (
                  <button
                    type="button"
                    onClick={handleChooseBuyVowel}
                    className="min-h-[48px] rounded-xl border border-accent-luckyletters/40 bg-accent-luckyletters/15 px-5 py-2 font-display text-sm font-bold text-accent-luckyletters uppercase tracking-wider transition-all active:scale-95"
                  >
                    Buy a Vowel ($250)
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleChooseSolve}
                  className="min-h-[48px] rounded-xl border border-primary/40 bg-primary/15 px-5 py-2 font-display text-sm font-bold text-primary uppercase tracking-wider transition-all active:scale-95"
                >
                  Solve
                </button>
              </div>
            </div>
          );
        }
        return (
          <div
            data-testid="controller-context-card"
            className="flex flex-col gap-4 pb-16 pt-4 animate-fade-in-up"
          >
            {puzzleBoard}
            <p className="text-center font-body text-sm text-text-muted">
              {turnPlayerName}&apos;s turn
            </p>
            {spinResult && (
              <MobileSpinResult
                segment={spinResult.segment}
                currentTurnName={turnPlayerName}
                isMyTurn={false}
              />
            )}
          </div>
        );
      }

      case "guess-consonant": {
        if (isMyTurn) {
          return (
            <div className="flex flex-col gap-3 pb-16 pt-2 animate-fade-in-up">
              {puzzleBoard}
              <LetterPicker
                mode="consonant"
                usedLetters={usedLetters}
                onPick={handleConsonantPick}
              />
            </div>
          );
        }
        return (
          <div
            data-testid="controller-context-card"
            className="flex flex-col gap-4 pb-16 pt-4 animate-fade-in-up"
          >
            {puzzleBoard}
            <p className="text-center font-body text-sm text-text-muted">
              {turnPlayerName} is picking a consonant...
            </p>
          </div>
        );
      }

      case "buy-vowel": {
        if (isMyTurn) {
          return (
            <div className="flex flex-col gap-3 pb-16 pt-2 animate-fade-in-up">
              {puzzleBoard}
              <LetterPicker mode="vowel" usedLetters={usedLetters} onPick={handleVowelPick} />
            </div>
          );
        }
        return (
          <div
            data-testid="controller-context-card"
            className="flex flex-col gap-4 pb-16 pt-4 animate-fade-in-up"
          >
            {puzzleBoard}
            <p className="text-center font-body text-sm text-text-muted">
              {turnPlayerName} is buying a vowel...
            </p>
          </div>
        );
      }

      case "solve-attempt": {
        if (isMyTurn) {
          return (
            <div className="flex flex-col gap-3 pb-16 pt-2 animate-fade-in-up">
              {puzzleBoard}
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
          <div
            data-testid="controller-context-card"
            className="flex flex-col gap-4 pb-16 pt-4 animate-fade-in-up"
          >
            {puzzleBoard}
            <p className="text-center font-body text-sm text-text-muted">
              {turnPlayerName} is solving...
            </p>
          </div>
        );
      }

      case "letter-result": {
        return (
          <div className="flex flex-col gap-4 pb-16 pt-4 animate-fade-in-up">
            {puzzleBoard}
            {letterResult && (
              <MobileLetterResult
                letter={letterResult.letter}
                count={letterResult.count}
                inPuzzle={letterResult.inPuzzle}
                earned={letterResult.earned}
                vowelCost={letterResult.vowelCost}
                streak={letterResult.streak ?? streak}
              />
            )}
            {luckyMyResultCard}
          </div>
        );
      }

      case "round-result": {
        const rrStandings = roundResult?.standings ?? standings;
        const winnerName = roundResult?.winnerId ? getPlayerName(roundResult.winnerId) : null;
        return (
          <div className="flex flex-col gap-4 pb-16 pt-4 animate-fade-in-up">
            <ConfettiBurst trigger={true} preset="win" />
            {roundResult?.answer && (
              <GlassPanel className="mx-4 flex flex-col items-center gap-2 px-4 py-4">
                <p className="font-body text-xs text-text-muted uppercase tracking-wider">
                  The answer was
                </p>
                <p className="text-center font-display text-lg font-black text-text-primary">
                  {roundResult.answer}
                </p>
              </GlassPanel>
            )}
            {winnerName && (
              <p className="text-center font-display text-base font-bold text-accent-luckyletters">
                {winnerName} won the round!
                {roundResult?.roundCashEarned
                  ? ` +$${roundResult.roundCashEarned.toLocaleString()}`
                  : ""}
              </p>
            )}
            {rrStandings.length > 0 && (
              <MobileStandings
                standings={rrStandings}
                mySessionId={mySessionId}
                players={players}
              />
            )}
            {luckyMyResultCard}
          </div>
        );
      }

      case "bonus-round": {
        const bonusName = getPlayerName(bonusPlayerSessionId);
        if (isBonusPlayer) {
          const pickedLetters = bonusPickConfirmed?.pickedSoFar ?? [];
          return (
            <div className="flex flex-col gap-3 pb-16 pt-2 animate-fade-in-up">
              <p
                className="text-center font-display text-xl font-black uppercase"
                style={{
                  color: "oklch(0.78 0.2 85)",
                  textShadow: "0 0 24px oklch(0.78 0.2 85 / 0.5)",
                }}
              >
                Bonus Round!
              </p>
              {puzzleBoard}
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
                onPick={(letter) => {
                  sendMessage("player:bonus-pick", { letter });
                }}
              />
              <div className="px-4">
                <TextInput
                  prompt="Solve the bonus puzzle:"
                  placeholder="Type the full phrase..."
                  onSubmit={(text) => {
                    sendMessage("player:bonus-solve", { answer: text });
                  }}
                />
              </div>
            </div>
          );
        }
        return (
          <div
            data-testid="controller-context-card"
            className="flex flex-col gap-4 pb-16 pt-4 animate-fade-in-up"
          >
            <p
              className="text-center font-display text-xl font-black uppercase"
              style={{
                color: "oklch(0.78 0.2 85)",
                textShadow: "0 0 24px oklch(0.78 0.2 85 / 0.5)",
              }}
            >
              Bonus Round!
            </p>
            {puzzleBoard}
            <p className="text-center font-body text-sm text-text-muted">
              {bonusName} is playing for $25,000!
            </p>
          </div>
        );
      }

      case "bonus-reveal": {
        const brSolved = bonusReveal?.solved ?? false;
        const brAnswer = bonusReveal?.answer ?? "";
        const brPrize = bonusReveal?.bonusPrize ?? 0;
        const brPlayerName = bonusReveal?.bonusPlayerId
          ? getPlayerName(bonusReveal.bonusPlayerId)
          : "Player";
        return (
          <div className="flex flex-col gap-4 pb-16 pt-4 animate-fade-in-up">
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
            {luckyMyResultCard}
          </div>
        );
      }

      case "final-scores":
        return renderFinalScoresCard();

      default:
        return (
          <WaitingScreen
            phase={currentPhase}
            gameId={gameId}
            score={typeof pd.totalCash === "number" ? pd.totalCash : undefined}
          />
        );
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // SURVEY SMASH
  // ────────────────────────────────────────────────────────────────────

  function renderSurveySmash(currentPhase: string): React.ReactNode {
    const isFaceOffPlayer = pd.action === "face-off-your-turn";
    const isCurrentGuesser = pd.action === "your-turn-to-guess";
    const isSnagTeam = pd.action === "snag-your-turn";
    const isLightningPlayer = pd.action === "lightning-question";
    const isGuessAlongPlayer = pd.action === "guess-along";
    const gs = (gameEvents?.["game-state"] ?? {}) as Record<string, unknown>;
    const surveyTeams = Array.isArray(gs.teams)
      ? (gs.teams as Array<{ id: string; members: string[]; score: number }>)
      : [];
    const teamFromPrivateData = typeof pd.yourTeamId === "string" ? pd.yourTeamId : null;
    const myPlayer = players.find((p) => p.sessionId === mySessionId);
    const myRoleTeam = typeof myPlayer?.role === "string" ? myPlayer.role : null;
    const myTeamId =
      teamFromPrivateData ??
      myRoleTeam ??
      surveyTeams.find((team) => team.members.includes(mySessionId ?? ""))?.id ??
      null;
    const myTeamLabel =
      myTeamId === "team-a"
        ? "Team A"
        : myTeamId === "team-b"
          ? "Team B"
          : myTeamId
            ? "Solo"
            : null;
    const guessAlongPoints = typeof pd.guessAlongPoints === "number" ? pd.guessAlongPoints : null;
    const teamBadge =
      myTeamLabel || surveyTeams.length > 0 ? (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            data-testid="team-pill"
            onClick={() => setIsTeamRosterOpen((open) => !open)}
            className="rounded-full border border-accent-surveysmash/35 bg-accent-surveysmash/15 px-3 py-1 font-display text-xs font-bold uppercase tracking-wider text-accent-surveysmash transition-all active:scale-95"
          >
            {myTeamLabel ?? "Team"}
          </button>
          {isTeamRosterOpen && (
            <GlassPanel
              data-testid="team-roster-sheet"
              className="w-[min(92vw,360px)] rounded-2xl border border-accent-surveysmash/30 px-4 py-3"
            >
              <p className="mb-2 text-center font-display text-xs font-bold uppercase tracking-wider text-accent-surveysmash">
                Team Roster
              </p>
              <div className="flex flex-col gap-2">
                {surveyTeams.map((team, teamIndex) => {
                  const label =
                    team.id === "team-a"
                      ? "Team A"
                      : team.id === "team-b"
                        ? "Team B"
                        : `Team ${teamIndex + 1}`;
                  const isMine = myTeamId !== null && team.id === myTeamId;
                  const names =
                    team.members.length > 0
                      ? team.members
                          .map(
                            (sessionId) =>
                              players.find((player) => player.sessionId === sessionId)?.name ??
                              "Player",
                          )
                          .join(", ")
                      : "No players";
                  return (
                    <div
                      key={`roster-${team.id}`}
                      className={`rounded-lg border px-3 py-2 ${
                        isMine
                          ? "border-accent-surveysmash/45 bg-accent-surveysmash/12"
                          : "border-white/10 bg-white/5"
                      }`}
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

    switch (currentPhase) {
      case "face-off": {
        if (isFaceOffPlayer) {
          const question = typeof pd.question === "string" ? pd.question : "Name the top answer!";
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              {teamBadge}
              <TextInput
                prompt={question}
                placeholder="Type your answer..."
                onSubmit={handleTextSubmit}
                resetNonce={errorNonce}
              />
            </div>
          );
        }
        return renderSurveySmashWatchCard(currentPhase);
      }

      case "guessing": {
        if (isCurrentGuesser) {
          const question = typeof pd.question === "string" ? pd.question : "Name something...";
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              {teamBadge}
              <TextInput
                prompt={question}
                placeholder="Type your answer..."
                onSubmit={handleTextSubmit}
                resetNonce={errorNonce}
              />
            </div>
          );
        }
        if (isGuessAlongPlayer) {
          const question = typeof pd.question === "string" ? pd.question : "Predict an answer...";
          return (
            <div
              data-testid="controller-context-card"
              className="flex flex-col gap-4 pb-16 pt-4 animate-fade-in-up"
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
        return renderSurveySmashWatchCard(currentPhase);
      }

      case "steal-chance": {
        if (isSnagTeam) {
          const question =
            typeof pd.question === "string" ? pd.question : "Snag it! Name an answer...";
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
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
        return renderSurveySmashWatchCard(currentPhase);
      }

      case "lightning-round": {
        if (isLightningPlayer) {
          const question = typeof pd.question === "string" ? pd.question : "Quick!";
          const qIndex = typeof pd.questionIndex === "number" ? pd.questionIndex + 1 : "?";
          const totalQ = typeof pd.totalQuestions === "number" ? pd.totalQuestions : "?";
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              {teamBadge}
              <div className="flex justify-center">
                <span className="rounded-full bg-accent-surveysmash/15 px-3 py-1 font-mono text-xs font-bold text-accent-surveysmash">
                  {qIndex}/{totalQ}
                </span>
              </div>
              <QuickGuessInput
                prompt={question}
                placeholder="Quick! Type your answer..."
                onSubmit={handleTextSubmit}
              />
            </div>
          );
        }
        return renderSurveySmashWatchCard(currentPhase);
      }

      case "question-reveal":
      case "strike":
      case "answer-reveal":
      case "round-result":
      case "lightning-round-reveal":
        return renderSurveySmashWatchCard(currentPhase);

      case "final-scores":
        return renderFinalScoresCard();

      default:
        return <WaitingScreen phase={currentPhase} gameId={gameId} />;
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // SURVEY SMASH — contextual watch card
  // ────────────────────────────────────────────────────────────────────

  function renderSurveySmashWatchCard(currentPhase: string) {
    const gs = (gameEvents?.["game-state"] ?? {}) as Record<string, unknown>;
    const guessAlongResult = (gameEvents?.["guess-along-result"] ?? {}) as Record<string, unknown>;
    const question = typeof gs.question === "string" ? gs.question : "";
    const strikes = typeof gs.strikes === "number" ? gs.strikes : 0;
    const revealedAnswers = Array.isArray(gs.revealedAnswers)
      ? (gs.revealedAnswers as Array<{ text: string; points: number; rank: number }>)
      : [];
    const roundGuesses = Array.isArray(gs.roundGuesses)
      ? (gs.roundGuesses as Array<{
          sessionId: string;
          answer: string;
          source: "face-off" | "guessing" | "steal";
          outcome: "match" | "miss" | "duplicate";
          matchedRank: number | null;
        }>)
      : [];
    const answerCount = typeof gs.answerCount === "number" ? gs.answerCount : 0;
    const allAnswers = Array.isArray(gs.allAnswers)
      ? (gs.allAnswers as Array<{ text: string; points: number; rank: number }>)
      : [];
    const teams = Array.isArray(gs.teams)
      ? (gs.teams as Array<{ id: string; members: string[]; score: number }>)
      : [];
    const faceOffPlayers = Array.isArray(gs.faceOffPlayers) ? (gs.faceOffPlayers as string[]) : [];
    const faceOffEntries = Array.isArray(gs.faceOffEntries)
      ? (gs.faceOffEntries as Array<{
          sessionId: string;
          answer: string;
          matchedRank: number | null;
        }>)
      : [];
    const guessingOrder = Array.isArray(gs.guessingOrder) ? (gs.guessingOrder as string[]) : [];
    const currentGuesserIndex =
      typeof gs.currentGuesserIndex === "number" ? gs.currentGuesserIndex : 0;
    const currentGuesserSessionId = guessingOrder[currentGuesserIndex] ?? null;
    const currentGuesserName = currentGuesserSessionId
      ? (players?.find((p) => p.sessionId === currentGuesserSessionId)?.name ?? "Player")
      : null;
    const lightningPlayerId =
      typeof gs.lightningPlayerId === "string" ? gs.lightningPlayerId : null;
    const lightningPlayerName = lightningPlayerId
      ? (players?.find((p) => p.sessionId === lightningPlayerId)?.name ?? "Player")
      : null;
    const lightningTotalPoints =
      typeof gs.lightningTotalPoints === "number" ? gs.lightningTotalPoints : 0;
    const guessAlongEligible =
      typeof gs.guessAlongEligible === "number" ? Math.max(0, gs.guessAlongEligible) : 0;
    const guessAlongSubmissions =
      typeof gs.guessAlongSubmissions === "number" ? Math.max(0, gs.guessAlongSubmissions) : 0;
    const guessAlongPoints = Array.isArray(gs.guessAlongPoints)
      ? (gs.guessAlongPoints as Array<{ sessionId: string; points: number }>)
      : [];
    const myTeamFromPrivate = typeof pd.yourTeamId === "string" ? pd.yourTeamId : null;
    const myPlayer = players.find((p) => p.sessionId === mySessionId);
    const myTeamId =
      myTeamFromPrivate ?? (typeof myPlayer?.role === "string" ? myPlayer.role : null);
    const myTeam = teams.find((t) => t.id === myTeamId);
    const myTeamLabel =
      myTeamId === "team-a"
        ? "Team A"
        : myTeamId === "team-b"
          ? "Team B"
          : myTeamId
            ? "Solo"
            : null;
    const myTeamMates =
      myTeam?.members
        .filter((sid) => sid !== mySessionId)
        .map((sid) => players.find((p) => p.sessionId === sid)?.name ?? "Player") ?? [];
    const myGuessAlongPoints =
      guessAlongPoints.find((entry) => entry.sessionId === mySessionId)?.points ??
      (typeof pd.guessAlongPoints === "number" ? pd.guessAlongPoints : 0);
    const recentGuessAlongWinners = Array.isArray(guessAlongResult.winners)
      ? (guessAlongResult.winners as Array<{ sessionId: string; points: number }>).map(
          (winner) => players.find((p) => p.sessionId === winner.sessionId)?.name ?? "Player",
        )
      : [];
    const faceOffSubmitted = faceOffEntries.length;
    const faceOffTotal = Math.max(2, faceOffPlayers.length || 2);
    const getSurveyPlayerName = (sessionId: string) =>
      players?.find((p) => p.sessionId === sessionId)?.name ?? "Player";

    // Strike indicators
    const strikeDisplay =
      strikes > 0 ? (
        <div className="flex items-center justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`flex h-7 w-7 items-center justify-center rounded-full font-display text-xs font-bold ${
                i < strikes ? "bg-red-500/20 text-red-400" : "bg-white/5 text-text-dim"
              }`}
            >
              X
            </span>
          ))}
        </div>
      ) : null;

    // Team scores
    const teamScores =
      teams.length > 0 ? (
        <div className="flex items-center justify-center gap-4">
          {teams.map((t) => (
            <div key={t.id} className="flex items-center gap-1.5">
              <span className="font-body text-xs text-text-muted uppercase">
                {t.id === "team-a" ? "Team A" : t.id === "team-b" ? "Team B" : ""}
              </span>
              <span className="font-mono text-sm font-bold text-accent-surveysmash">
                {t.score.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      ) : null;

    const myTeamBadge = myTeamLabel ? (
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          data-testid="team-pill"
          onClick={() => setIsTeamRosterOpen((open) => !open)}
          className="rounded-full border border-accent-surveysmash/30 bg-accent-surveysmash/12 px-3 py-1 font-display text-[10px] font-bold uppercase tracking-wider text-accent-surveysmash transition-all active:scale-95"
        >
          {myTeamLabel}
        </button>
        {myTeamMates.length > 0 && (
          <span className="font-body text-[11px] text-text-dim">
            With: {myTeamMates.join(", ")}
          </span>
        )}
        {isTeamRosterOpen && (
          <GlassPanel
            data-testid="team-roster-sheet"
            className="w-[min(92vw,360px)] rounded-2xl border border-accent-surveysmash/30 px-4 py-3"
          >
            <p className="mb-2 text-center font-display text-xs font-bold uppercase tracking-wider text-accent-surveysmash">
              Team Roster
            </p>
            <div className="flex flex-col gap-2">
              {teams.map((team, teamIndex) => {
                const teamLabel =
                  team.id === "team-a"
                    ? "Team A"
                    : team.id === "team-b"
                      ? "Team B"
                      : `Team ${teamIndex + 1}`;
                const isMine = myTeamId !== null && team.id === myTeamId;
                const memberNames =
                  team.members.length > 0
                    ? team.members
                        .map(
                          (sessionId) =>
                            players.find((p) => p.sessionId === sessionId)?.name ?? "Player",
                        )
                        .join(", ")
                    : "No players";

                return (
                  <div
                    key={`watch-roster-${team.id}`}
                    className={`rounded-lg border px-3 py-2 ${
                      isMine
                        ? "border-accent-surveysmash/45 bg-accent-surveysmash/12"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <p className="font-display text-[11px] font-bold uppercase tracking-wide text-text-primary">
                      {teamLabel}
                      {isMine ? " (You)" : ""}
                    </p>
                    <p className="font-body text-xs text-text-muted">{memberNames}</p>
                  </div>
                );
              })}
            </div>
          </GlassPanel>
        )}
      </div>
    ) : null;

    const guessAlongStatus =
      currentPhase === "guessing" && guessAlongEligible > 0 ? (
        <div className="flex w-full max-w-xs flex-col items-center gap-1.5 rounded-xl border border-accent-surveysmash/20 bg-accent-surveysmash/8 px-3 py-2">
          <span className="font-display text-[10px] font-bold uppercase tracking-wider text-accent-surveysmash">
            Guess Along
          </span>
          <span className="font-mono text-xs text-text-muted">
            {guessAlongSubmissions}/{guessAlongEligible} submitted
          </span>
          <span className="font-mono text-xs text-accent-surveysmash">
            You: {myGuessAlongPoints.toLocaleString()} pts
          </span>
        </div>
      ) : null;

    const faceOffProgress =
      currentPhase === "face-off" ? (
        <div className="flex w-full max-w-xs flex-col gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <span className="font-mono text-xs text-text-muted">
            Face-off submissions: {faceOffSubmitted}/{faceOffTotal}
          </span>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-accent-surveysmash transition-all duration-300"
              style={{ width: `${Math.min(100, (faceOffSubmitted / faceOffTotal) * 100)}%` }}
            />
          </div>
        </div>
      ) : null;

    const guessAlongWinnersBadge =
      recentGuessAlongWinners.length > 0 && currentPhase === "round-result" ? (
        <div className="rounded-xl border border-accent-surveysmash/30 bg-accent-surveysmash/10 px-3 py-2">
          <p className="text-center font-body text-xs text-text-muted">
            Guess Along winners: {recentGuessAlongWinners.join(", ")}
          </p>
        </div>
      ) : null;

    // Revealed answers mini-board
    const answersBoard =
      revealedAnswers.length > 0 ? (
        <div className="flex flex-col gap-1 px-2">
          {revealedAnswers
            .sort((a, b) => a.rank - b.rank)
            .map((a) => (
              <div
                key={a.rank}
                className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-surveysmash/20 font-mono text-[10px] font-bold text-accent-surveysmash">
                    {a.rank}
                  </span>
                  <span className="font-body text-sm text-text-primary">{a.text}</span>
                </div>
                <span className="font-mono text-xs text-text-muted">{a.points}</span>
              </div>
            ))}
          {answerCount > revealedAnswers.length && (
            <p className="text-center font-mono text-xs text-text-dim">
              {answerCount - revealedAnswers.length} more hidden
            </p>
          )}
        </div>
      ) : null;

    const roundGuessSummary =
      currentPhase === "round-result" && roundGuesses.length > 0 ? (
        <GlassPanel className="w-full max-w-sm px-4 py-3">
          <p className="mb-2 text-center font-display text-xs font-bold uppercase tracking-wider text-accent-surveysmash">
            Player Answers
          </p>
          <div className="flex flex-col gap-2">
            {[...roundGuesses]
              .slice(-6)
              .reverse()
              .map((entry, index) => {
                const sourceLabel =
                  entry.source === "face-off"
                    ? "Face-Off"
                    : entry.source === "steal"
                      ? "Steal"
                      : "Guess";
                const outcomeLabel =
                  entry.outcome === "match"
                    ? "Match"
                    : entry.outcome === "duplicate"
                      ? "Duplicate"
                      : "Miss";
                const outcomeClass =
                  entry.outcome === "match"
                    ? "text-success"
                    : entry.outcome === "duplicate"
                      ? "text-accent-surveysmash"
                      : "text-accent-6";

                return (
                  <div
                    key={`${entry.sessionId}:${entry.answer}:${index}`}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-body text-xs text-text-primary">
                        {getSurveyPlayerName(entry.sessionId)}
                      </span>
                      <span className="font-mono text-[10px] text-text-dim uppercase">
                        {sourceLabel}
                      </span>
                    </div>
                    <p className="mt-1 font-body text-sm text-text-primary">{entry.answer}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`font-mono text-[10px] uppercase ${outcomeClass}`}>
                        {outcomeLabel}
                      </span>
                      {typeof entry.matchedRank === "number" && entry.matchedRank > 0 && (
                        <span className="font-mono text-[10px] text-text-dim">
                          Rank #{entry.matchedRank}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </GlassPanel>
      ) : null;

    const myLatestGuess =
      mySessionId !== null
        ? [...roundGuesses].reverse().find((entry) => entry.sessionId === mySessionId)
        : undefined;
    const myMatchedPoints =
      myLatestGuess &&
      typeof myLatestGuess.matchedRank === "number" &&
      myLatestGuess.matchedRank > 0
        ? (allAnswers.find((answer) => answer.rank === myLatestGuess.matchedRank)?.points ?? 0)
        : 0;
    const myResultCard =
      currentPhase === "round-result" ? (
        <GlassPanel data-testid="my-result" className="w-full max-w-sm rounded-2xl px-4 py-3">
          <p className="text-center font-display text-xs font-bold uppercase tracking-wider text-accent-surveysmash">
            My Result
          </p>
          <p className="mt-1 text-center font-body text-sm text-text-primary">
            {myLatestGuess?.answer || lastSubmittedText || "(no answer)"}
          </p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="font-mono text-[10px] uppercase text-text-muted">
              {myLatestGuess?.outcome === "match"
                ? "Match"
                : myLatestGuess?.outcome === "duplicate"
                  ? "Duplicate"
                  : myLatestGuess
                    ? "Miss"
                    : "No attempt"}
            </span>
            <span
              className={`font-mono text-xs font-bold ${
                myMatchedPoints > 0 ? "text-success" : "text-text-muted"
              }`}
            >
              {myMatchedPoints > 0 ? `+${myMatchedPoints}` : "+0"}
            </span>
          </div>
        </GlassPanel>
      ) : null;

    switch (currentPhase) {
      case "face-off":
        return (
          <div
            data-testid="controller-context-card"
            className="flex flex-col items-center gap-4 px-4 pb-16 pt-6 animate-fade-in-up"
          >
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
            {myTeamBadge}
            {faceOffProgress}
            {teamScores}
          </div>
        );

      case "question-reveal":
        return (
          <div
            data-testid="controller-context-card"
            className="flex flex-col items-center gap-4 px-4 pb-16 pt-6 animate-fade-in-up"
          >
            <GlassPanel
              glow
              glowColor="oklch(0.74 0.25 25 / 0.2)"
              className="flex flex-col items-center gap-3 px-6 py-5"
            >
              <span className="rounded-full bg-accent-surveysmash/15 px-3 py-1 font-display text-xs font-bold text-accent-surveysmash uppercase tracking-wider">
                Round {round}/{totalRounds}
              </span>
              {question && (
                <p className="text-center font-display text-base font-bold text-text-primary">
                  {question}
                </p>
              )}
            </GlassPanel>
            {myTeamBadge}
            {teamScores}
          </div>
        );

      case "guessing":
      case "steal-chance":
        return (
          <div
            data-testid="controller-context-card"
            className="flex flex-col items-center gap-4 px-4 pb-16 pt-6 animate-fade-in-up"
          >
            <GlassPanel className="flex flex-col items-center gap-3 px-6 py-5">
              {question && (
                <p className="text-center font-display text-sm font-bold text-text-primary">
                  {question}
                </p>
              )}
              {currentGuesserName && currentPhase === "guessing" && (
                <p className="font-body text-xs text-text-muted">
                  {currentGuesserName} is guessing...
                </p>
              )}
              {currentPhase === "steal-chance" && (
                <p className="font-display text-xs font-bold text-accent-surveysmash uppercase">
                  Snag attempt!
                </p>
              )}
              {strikeDisplay}
            </GlassPanel>
            {myTeamBadge}
            {answersBoard}
            {guessAlongStatus}
            {teamScores}
          </div>
        );

      case "strike":
        return (
          <div
            data-testid="controller-context-card"
            className="flex flex-col items-center gap-4 px-4 pb-16 pt-6 animate-fade-in-up"
          >
            <GlassPanel className="flex flex-col items-center gap-3 px-6 py-5">
              <p className="font-display text-xl font-black text-red-400 uppercase">Strike!</p>
              {strikeDisplay}
              {question && (
                <p className="text-center font-body text-sm text-text-muted">{question}</p>
              )}
            </GlassPanel>
            {myTeamBadge}
            {answersBoard}
            {teamScores}
          </div>
        );

      case "answer-reveal":
        return (
          <div
            data-testid="controller-context-card"
            className="flex flex-col items-center gap-4 px-4 pb-16 pt-6 animate-fade-in-up"
          >
            <GlassPanel className="flex flex-col items-center gap-3 px-6 py-5">
              <p className="font-display text-lg font-bold text-accent-surveysmash uppercase">
                Answers Revealed!
              </p>
              {question && (
                <p className="text-center font-body text-sm text-text-muted">{question}</p>
              )}
            </GlassPanel>
            {myTeamBadge}
            {answersBoard}
            {teamScores}
          </div>
        );

      case "round-result":
        return (
          <div
            data-testid="controller-context-card"
            className="flex flex-col items-center gap-4 px-4 pb-16 pt-6 animate-fade-in-up"
          >
            <GlassPanel
              glow
              glowColor="oklch(0.74 0.25 25 / 0.15)"
              className="flex flex-col items-center gap-3 px-6 py-5"
            >
              <p className="font-display text-lg font-bold text-text-primary uppercase">
                Round Complete!
              </p>
              {question && (
                <p className="text-center font-body text-sm text-text-muted">{question}</p>
              )}
            </GlassPanel>
            {myTeamBadge}
            {answersBoard}
            {roundGuessSummary}
            {myResultCard}
            {guessAlongWinnersBadge}
            {teamScores}
          </div>
        );

      case "lightning-round":
        return (
          <div
            data-testid="controller-context-card"
            className="flex flex-col items-center gap-4 px-4 pb-16 pt-6 animate-fade-in-up"
          >
            <GlassPanel className="flex flex-col items-center gap-3 px-6 py-5">
              <p className="font-display text-lg font-bold text-accent-surveysmash uppercase">
                Lightning Round
              </p>
              {lightningPlayerName && (
                <p className="font-body text-sm text-text-muted">{lightningPlayerName} is up!</p>
              )}
            </GlassPanel>
            {myTeamBadge}
            {teamScores}
          </div>
        );

      case "lightning-round-reveal":
        return (
          <div
            data-testid="controller-context-card"
            className="flex flex-col items-center gap-4 px-4 pb-16 pt-6 animate-fade-in-up"
          >
            <GlassPanel
              glow
              glowColor="oklch(0.74 0.25 25 / 0.2)"
              className="flex flex-col items-center gap-3 px-6 py-5"
            >
              <p className="font-display text-lg font-bold text-accent-surveysmash uppercase">
                Lightning Results!
              </p>
              {lightningPlayerName && (
                <p className="font-body text-sm text-text-muted">
                  {lightningPlayerName} scored {lightningTotalPoints} pts
                </p>
              )}
            </GlassPanel>
            {myTeamBadge}
            {teamScores}
          </div>
        );

      default:
        return renderWatchScreen("Watch the main screen!");
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // BRAIN BOARD — contextual watch card
  // ────────────────────────────────────────────────────────────────────

  function renderBrainBoardGridWatchCard(message: string, categories: string[]) {
    const visibleCategories = categories
      .filter((category): category is string => typeof category === "string")
      .map((category) => category.trim())
      .filter((category) => category.length > 0);

    return (
      <div className="flex flex-col items-center gap-4 px-4 pb-16 pt-6 animate-fade-in-up">
        <GlassPanel
          data-testid="controller-context-card"
          className="flex w-full max-w-sm flex-col items-center gap-3 px-4 py-5"
        >
          <p className="text-center font-display text-lg font-bold text-text-primary">{message}</p>
          {visibleCategories.length > 0 && (
            <div data-testid="brain-board-grid" className="grid w-full grid-cols-2 gap-2">
              {visibleCategories.map((category) => (
                <div
                  key={category}
                  className="rounded-lg border border-accent-brainboard/25 bg-accent-brainboard/10 px-2 py-2"
                >
                  <p className="text-center font-display text-[11px] font-bold uppercase text-accent-brainboard">
                    {category}
                  </p>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      </div>
    );
  }

  function renderBrainBoardWatchCard(message: string) {
    const playerScore = typeof pd.score === "number" ? pd.score : null;
    const gs = (gameEvents?.["game-state"] ?? {}) as Record<string, unknown>;
    const clueResultEvent = (gameEvents?.["clue-result"] ?? {}) as {
      results?: Array<{ sessionId: string; answer: string; correct: boolean; delta: number }>;
    };
    const allInRevealEvent = (gameEvents?.["all-in-reveal"] ?? {}) as {
      results?: Array<{ sessionId: string; answer: string; correct: boolean; delta: number }>;
    };
    const clueQuestion = typeof gs.currentClueQuestion === "string" ? gs.currentClueQuestion : null;
    const clueCategory = typeof gs.currentCategoryName === "string" ? gs.currentCategoryName : null;
    const clueValue = typeof gs.currentClueValue === "number" ? gs.currentClueValue : null;
    const isPowerPlay = gs.isPowerPlay === true;
    const answeredCount = typeof gs.answeredCount === "number" ? gs.answeredCount : 0;
    const totalPlayerCount = typeof gs.totalPlayerCount === "number" ? gs.totalPlayerCount : 0;
    const allInQuestion = typeof gs.allInQuestion === "string" ? gs.allInQuestion : null;
    const allInCategory = typeof gs.allInCategory === "string" ? gs.allInCategory : null;
    const clueResultRows = Array.isArray(clueResultEvent.results) ? clueResultEvent.results : [];
    const allInRows = Array.isArray(allInRevealEvent.results) ? allInRevealEvent.results : [];
    const myResultEntry =
      mySessionId !== null
        ? phase === "clue-result"
          ? clueResultRows.find((row) => row.sessionId === mySessionId)
          : phase === "all-in-reveal"
            ? allInRows.find((row) => row.sessionId === mySessionId)
            : undefined
        : undefined;

    return (
      <div className="flex flex-col items-center gap-4 px-4 pb-16 pt-6 animate-fade-in-up">
        <GlassPanel
          data-testid="controller-context-card"
          className="flex w-full max-w-sm flex-col items-center gap-3 px-6 py-5"
        >
          {playerScore !== null && (
            <span className="font-mono text-xl font-bold text-accent-brainboard">
              {playerScore.toLocaleString()} pts
            </span>
          )}
          {isPowerPlay && (
            <span
              className="font-display text-sm font-black uppercase"
              style={{
                color: "oklch(0.82 0.2 85)",
                textShadow: "0 0 12px oklch(0.82 0.2 85 / 0.5)",
              }}
            >
              Power Play!
            </span>
          )}
          <p className="text-center font-display text-lg font-bold text-text-primary">{message}</p>
          {clueCategory && clueValue !== null && (
            <span className="rounded-lg border border-accent-brainboard/30 bg-accent-brainboard/15 px-3 py-1 font-display text-xs font-bold text-accent-brainboard uppercase">
              {clueCategory} — ${clueValue}
            </span>
          )}
          {clueQuestion && (
            <p className="text-center font-body text-sm text-text-primary">{clueQuestion}</p>
          )}
          {allInCategory && !clueQuestion && (
            <span className="rounded-lg border border-accent-brainboard/30 bg-accent-brainboard/15 px-3 py-1 font-display text-xs font-bold text-accent-brainboard uppercase">
              {allInCategory}
            </span>
          )}
          {allInQuestion && (
            <p className="text-center font-body text-sm text-text-primary">{allInQuestion}</p>
          )}
          {totalPlayerCount > 0 && answeredCount > 0 && (
            <p className="font-mono text-xs text-text-dim">
              {answeredCount}/{totalPlayerCount} answered
            </p>
          )}
        </GlassPanel>
        {myResultEntry && (
          <GlassPanel data-testid="my-result" className="w-full max-w-sm rounded-2xl px-4 py-3">
            <p className="text-center font-display text-xs font-bold uppercase tracking-wider text-accent-brainboard">
              My Result
            </p>
            <p className="mt-1 text-center font-body text-sm text-text-primary">
              {myResultEntry.answer || lastSubmittedText || "(no answer)"}
            </p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="font-mono text-[10px] uppercase text-text-muted">
                {myResultEntry.correct ? "Correct" : "Incorrect"}
              </span>
              <span
                className={`font-mono text-xs font-bold ${
                  myResultEntry.delta > 0 ? "text-success" : "text-text-muted"
                }`}
              >
                {myResultEntry.delta > 0 ? `+${myResultEntry.delta}` : `${myResultEntry.delta}`}
              </span>
            </div>
          </GlassPanel>
        )}
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────
  // GENERIC / SHARED RENDERERS
  // ────────────────────────────────────────────────────────────────────

  function renderGenericPhase(currentPhase: string) {
    if (
      currentPhase.includes("input") ||
      currentPhase.includes("answer") ||
      currentPhase.includes("submit")
    ) {
      return (
        <div className="flex flex-col gap-4 pb-16 pt-4">
          <TextInput prompt={`Round ${round}/${totalRounds}`} onSubmit={handleTextSubmit} />
        </div>
      );
    }
    if (currentPhase.includes("vote") || currentPhase.includes("voting")) {
      return renderWatchScreen("Waiting for vote options...");
    }
    return renderWatchScreen("Watch the main screen...");
  }

  function renderFinalScoresCard() {
    const playerScore = typeof pd.score === "number" ? pd.score : null;
    const playerRank = typeof pd.rank === "number" ? pd.rank : null;
    const total = typeof pd.totalPlayers === "number" ? pd.totalPlayers : null;

    const getRankSuffix = (r: number): string => {
      if (r % 100 >= 11 && r % 100 <= 13) return "th";
      switch (r % 10) {
        case 1:
          return "st";
        case 2:
          return "nd";
        case 3:
          return "rd";
        default:
          return "th";
      }
    };

    if (playerRank !== null && playerScore !== null) {
      return (
        <div className="flex flex-col items-center gap-4 px-4 pb-16 pt-8 animate-fade-in-up">
          <GlassPanel glow className="flex flex-col items-center gap-4 px-8 py-8">
            <Trophy className="h-8 w-8 text-accent-5" />
            <p className="font-display text-3xl font-bold text-primary">
              {playerRank}
              {getRankSuffix(playerRank)}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-text-primary">{playerScore}</span>
              <span className="font-body text-sm text-text-dim">pts</span>
            </div>
            {total !== null && (
              <p className="font-body text-sm text-text-muted">out of {total} players</p>
            )}
          </GlassPanel>
          <p className="text-center font-body text-sm text-text-muted">
            Check the main screen for full results!
          </p>
        </div>
      );
    }

    return renderWatchScreen("Check the main screen for results!");
  }

  function renderWatchScreen(message: string) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 pb-16 pt-8 animate-fade-in-up">
        <GlassPanel
          data-testid="controller-context-card"
          className="flex flex-col items-center gap-3 px-8 py-6"
        >
          <Monitor className="h-6 w-6 text-text-muted" />
          <p className="text-center font-body text-lg text-text-muted">{message}</p>
        </GlassPanel>
      </div>
    );
  }
}
