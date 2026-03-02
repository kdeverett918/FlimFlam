"use client";

import { BuzzButton } from "@/components/controls/BuzzButton";
import { ClueGrid } from "@/components/controls/ClueGrid";
import { LetterPicker } from "@/components/controls/LetterPicker";
import { NumberInput } from "@/components/controls/NumberInput";
import { SpinButton } from "@/components/controls/SpinButton";
import { TextInput } from "@/components/controls/TextInput";
import { GameThemeProvider, GlassPanel } from "@flimflam/ui";
import type { GameTheme } from "@flimflam/ui";
import { Monitor, Trophy } from "lucide-react";
import { useCallback, useMemo } from "react";
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
  errorNonce?: number;
  sendMessage: (type: string, data?: Record<string, unknown>) => void;
}

const GAME_THEME_MAP: Record<string, GameTheme> = {
  jeopardy: "jeopardy",
  "wheel-of-fortune": "wheel-of-fortune",
  "family-feud": "family-feud",
};

const GAME_DISPLAY_NAMES: Record<string, string> = {
  jeopardy: "Jeopardy",
  "wheel-of-fortune": "Wheel of Fortune",
  "family-feud": "Family Feud",
};

const GAME_ACCENT_CLASSES: Record<string, string> = {
  jeopardy: "text-accent-jeopardy bg-accent-jeopardy/15",
  "wheel-of-fortune": "text-accent-wheel bg-accent-wheel/15",
  "family-feud": "text-accent-feud bg-accent-feud/15",
};

export function GameController({
  gameId,
  phase,
  round,
  totalRounds,
  privateData,
  errorNonce,
  sendMessage,
}: GameControllerProps) {
  // ─── Common message handlers ──────────────────────────────────────

  const handleTextSubmit = useCallback(
    (text: string) => {
      sendMessage("player:submit", { content: text });
    },
    [sendMessage],
  );

  const handleBuzz = useCallback(() => {
    sendMessage("player:buzz", { timestamp: Date.now() });
  }, [sendMessage]);

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
      sendMessage("player:guess-consonant", { letter });
    },
    [sendMessage],
  );

  const handleVowelPick = useCallback(
    (letter: string) => {
      sendMessage("player:buy-vowel", { letter });
    },
    [sendMessage],
  );

  const handleSolveSubmit = useCallback(
    (text: string) => {
      sendMessage("player:solve", { answer: text });
    },
    [sendMessage],
  );

  const handleJeopardyAnswer = useCallback(
    (text: string) => {
      sendMessage("player:answer", { answer: text });
    },
    [sendMessage],
  );

  const handleDailyDoubleWager = useCallback(
    (wager: number) => {
      sendMessage("player:daily-double-wager", { wager });
    },
    [sendMessage],
  );

  const handleDailyDoubleAnswer = useCallback(
    (text: string) => {
      sendMessage("player:daily-double-answer", { answer: text });
    },
    [sendMessage],
  );

  const handleFinalWager = useCallback(
    (wager: number) => {
      sendMessage("player:final-wager", { wager });
    },
    [sendMessage],
  );

  const handleFinalAnswer = useCallback(
    (text: string) => {
      sendMessage("player:final-answer", { answer: text });
    },
    [sendMessage],
  );

  // ─── Wheel of Fortune action chooser helpers ──────────────────────

  const handleChooseBuyVowel = useCallback(() => {
    sendMessage("player:choose-action", { action: "buy-vowel" });
  }, [sendMessage]);

  const handleChooseSolve = useCallback(() => {
    sendMessage("player:choose-action", { action: "solve" });
  }, [sendMessage]);

  // ─── Theme / display ─────────────────────────────────────────────

  const themeKey = GAME_THEME_MAP[gameId] ?? "default";
  const gameName = GAME_DISPLAY_NAMES[gameId] ?? gameId;
  const accentClass = GAME_ACCENT_CLASSES[gameId] ?? "text-accent-1 bg-accent-1/15";

  // ─── Private data as typed helpers ────────────────────────────────

  const pd = privateData ?? {};

  // Build used letters set for WoF from revealedLetters broadcast
  const usedLetters = useMemo(() => {
    const letters = Array.isArray(pd.revealedLetters) ? pd.revealedLetters : [];
    return new Set(letters.filter((l): l is string => typeof l === "string"));
  }, [pd.revealedLetters]);

  // ─── Render game-specific content ─────────────────────────────────

  let content: React.ReactNode;

  switch (gameId) {
    case "jeopardy":
      content = renderJeopardy(phase);
      break;
    case "wheel-of-fortune":
      content = renderWheelOfFortune(phase);
      break;
    case "family-feud":
      content = renderFamilyFeud(phase);
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
  // JEOPARDY
  // ────────────────────────────────────────────────────────────────────

  function renderJeopardy(currentPhase: string): React.ReactNode {
    switch (currentPhase) {
      case "category-reveal":
        return (
          <WaitingScreen
            phase={currentPhase}
            gameId={gameId}
            score={typeof pd.score === "number" ? pd.score : undefined}
          />
        );

      case "clue-select": {
        if (pd.isSelector) {
          // Build categories and answered clues from broadcast game-data
          const categories = Array.isArray(pd.categories)
            ? pd.categories.filter((c): c is string => typeof c === "string")
            : [];
          const answeredClues = Array.isArray(pd.answeredClues)
            ? pd.answeredClues.filter((c): c is string => typeof c === "string")
            : [];

          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <ClueGrid
                categories={categories}
                answeredClues={answeredClues}
                onSelect={handleClueSelect}
              />
            </div>
          );
        }
        return (
          <WaitingScreen
            phase={currentPhase}
            gameId={gameId}
            score={typeof pd.score === "number" ? pd.score : undefined}
          />
        );
      }

      case "buzzing":
        return <BuzzButton onBuzz={handleBuzz} disabled={pd.canBuzz === false} />;

      case "answering": {
        if (pd.isBuzzWinner) {
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <TextInput
                prompt="Your answer:"
                placeholder="What is..."
                onSubmit={handleJeopardyAnswer}
                resetNonce={errorNonce}
              />
            </div>
          );
        }
        return renderWatchScreen("Watch the answer...");
      }

      case "daily-double-wager": {
        if (pd.isDailyDoublePlayer) {
          const maxWager = typeof pd.score === "number" ? Math.max(pd.score, 1000) : 1000;
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <NumberInput
                min={5}
                max={maxWager}
                label="Daily Double! Set your wager:"
                onSubmit={handleDailyDoubleWager}
              />
            </div>
          );
        }
        return renderWatchScreen("Daily Double!");
      }

      case "daily-double-answer": {
        if (pd.isDailyDoublePlayer) {
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <TextInput
                prompt="Daily Double answer:"
                placeholder="What is..."
                onSubmit={handleDailyDoubleAnswer}
                resetNonce={errorNonce}
              />
            </div>
          );
        }
        return renderWatchScreen("Waiting for the Daily Double answer...");
      }

      case "final-jeopardy-wager": {
        if (pd.canWagerFinal) {
          const playerScore = typeof pd.score === "number" ? pd.score : 0;
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <NumberInput
                min={0}
                max={playerScore}
                label="Final Jeopardy! Set your wager:"
                onSubmit={handleFinalWager}
              />
            </div>
          );
        }
        return renderWatchScreen("Final Jeopardy wagers being placed...");
      }

      case "final-jeopardy-answer": {
        if (pd.canAnswerFinal) {
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <TextInput
                prompt="Final Jeopardy answer:"
                placeholder="What is..."
                onSubmit={handleFinalAnswer}
                resetNonce={errorNonce}
              />
            </div>
          );
        }
        return renderWatchScreen("Final Jeopardy answers being submitted...");
      }

      case "clue-result":
      case "final-jeopardy-category":
      case "final-jeopardy-reveal":
        return renderWatchScreen("Watch the main screen!");

      case "final-scores":
        return renderFinalScoresCard();

      default:
        return (
          <WaitingScreen
            phase={currentPhase}
            gameId={gameId}
            score={typeof pd.score === "number" ? pd.score : undefined}
          />
        );
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // WHEEL OF FORTUNE
  // ────────────────────────────────────────────────────────────────────

  function renderWheelOfFortune(currentPhase: string): React.ReactNode {
    const isMyTurn = pd.isMyTurn === true;
    const canBuyVowel = pd.canBuyVowel === true;
    const isBonusPlayer = pd.isBonusPlayer === true;

    switch (currentPhase) {
      case "spinning": {
        if (isMyTurn) {
          return (
            <div className="flex flex-col items-center gap-4 pb-16">
              <SpinButton onSpin={handleSpin} />
              {/* Action chooser: buy vowel / solve */}
              <div className="flex items-center gap-3 px-4">
                {canBuyVowel && (
                  <button
                    type="button"
                    onClick={handleChooseBuyVowel}
                    className="min-h-[48px] rounded-xl border border-accent-wheel/40 bg-accent-wheel/15 px-5 py-2 font-display text-sm font-bold text-accent-wheel uppercase tracking-wider transition-all active:scale-95"
                  >
                    Buy Vowel ($250)
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
          <WaitingScreen
            phase={currentPhase}
            gameId={gameId}
            score={typeof pd.totalCash === "number" ? pd.totalCash : undefined}
          />
        );
      }

      case "guess-consonant": {
        if (isMyTurn) {
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <LetterPicker
                mode="consonant"
                usedLetters={usedLetters}
                onPick={handleConsonantPick}
              />
            </div>
          );
        }
        return (
          <WaitingScreen
            phase={currentPhase}
            gameId={gameId}
            score={typeof pd.totalCash === "number" ? pd.totalCash : undefined}
          />
        );
      }

      case "buy-vowel": {
        if (isMyTurn) {
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <LetterPicker mode="vowel" usedLetters={usedLetters} onPick={handleVowelPick} />
            </div>
          );
        }
        return (
          <WaitingScreen
            phase={currentPhase}
            gameId={gameId}
            score={typeof pd.totalCash === "number" ? pd.totalCash : undefined}
          />
        );
      }

      case "solve-attempt": {
        if (isMyTurn) {
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <TextInput
                prompt="Solve the puzzle:"
                placeholder="Type the full phrase..."
                onSubmit={handleSolveSubmit}
                resetNonce={errorNonce}
              />
            </div>
          );
        }
        return renderWatchScreen("Watching a solve attempt...");
      }

      case "bonus-round": {
        if (isBonusPlayer) {
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <LetterPicker
                mode="bonus"
                usedLetters={usedLetters}
                onPick={(letter) => {
                  // In bonus round, the player picks 3 consonants + 1 vowel
                  // This is handled via the bonus-letters message type
                  // For simplicity, we forward individual picks via consonant/vowel
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
        return renderWatchScreen("Watching the bonus round...");
      }

      case "round-intro":
      case "letter-result":
      case "round-result":
      case "bonus-reveal":
        return renderWatchScreen("Watch the main screen!");

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
  // FAMILY FEUD
  // ────────────────────────────────────────────────────────────────────

  function renderFamilyFeud(currentPhase: string): React.ReactNode {
    // Check private-data flags based on what the plugin sends
    const isFaceOffPlayer =
      pd.action === "face-off-your-turn" ||
      (Array.isArray(pd.faceOffPlayers) &&
        typeof pd.yourSessionId === "string" &&
        (pd.faceOffPlayers as unknown[]).includes(pd.yourSessionId));
    const isCurrentGuesser = pd.action === "your-turn-to-guess";
    const isStealTeam = pd.action === "steal-your-turn";
    const isFastMoneyPlayer = pd.action === "fast-money-question";

    switch (currentPhase) {
      case "face-off": {
        if (isFaceOffPlayer) {
          return (
            <BuzzButton
              onBuzz={() => {
                // Face-off: buzz then submit answer via TextInput on next render
                handleBuzz();
              }}
            />
          );
        }
        return renderWatchScreen("Face-off happening...");
      }

      case "guessing": {
        if (isCurrentGuesser) {
          const question = typeof pd.question === "string" ? pd.question : "Name something...";
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <TextInput
                prompt={question}
                placeholder="Type your answer..."
                onSubmit={handleTextSubmit}
                resetNonce={errorNonce}
              />
            </div>
          );
        }
        return <WaitingScreen phase={currentPhase} gameId={gameId} />;
      }

      case "steal-chance": {
        if (isStealTeam) {
          const question =
            typeof pd.question === "string" ? pd.question : "Steal! Name an answer...";
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <TextInput
                prompt={`Steal! ${question}`}
                placeholder="Type your steal answer..."
                onSubmit={handleTextSubmit}
                resetNonce={errorNonce}
              />
            </div>
          );
        }
        return renderWatchScreen("Other team is trying to steal...");
      }

      case "fast-money": {
        if (isFastMoneyPlayer) {
          const question = typeof pd.question === "string" ? pd.question : "Quick!";
          const qIndex = typeof pd.questionIndex === "number" ? pd.questionIndex + 1 : "?";
          const totalQ = typeof pd.totalQuestions === "number" ? pd.totalQuestions : "?";
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <div className="flex justify-center">
                <span className="rounded-full bg-accent-feud/15 px-3 py-1 font-mono text-xs font-bold text-accent-feud">
                  {qIndex}/{totalQ}
                </span>
              </div>
              <TextInput
                prompt={question}
                placeholder="Quick! Type your answer..."
                onSubmit={handleTextSubmit}
                resetNonce={errorNonce}
              />
            </div>
          );
        }
        return renderWatchScreen("Fast Money round!");
      }

      case "question-reveal":
      case "strike":
      case "answer-reveal":
      case "round-result":
      case "fast-money-reveal":
        return renderWatchScreen("Watch the main screen!");

      case "final-scores":
        return renderFinalScoresCard();

      default:
        return <WaitingScreen phase={currentPhase} gameId={gameId} />;
    }
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
        <GlassPanel className="flex flex-col items-center gap-3 px-8 py-6">
          <Monitor className="h-6 w-6 text-text-muted" />
          <p className="text-center font-body text-lg text-text-muted">{message}</p>
        </GlassPanel>
      </div>
    );
  }
}
