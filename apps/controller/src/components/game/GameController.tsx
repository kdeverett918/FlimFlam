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

  const handleBrainBoardAnswer = useCallback(
    (text: string) => {
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
      sendMessage("player:all-in-answer", { answer: text });
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

      case "answering": {
        if (pd.hasAnswered) {
          return renderWatchScreen("Answer submitted! Waiting for others...");
        }
        const clueQ = typeof pd.clueQuestion === "string" ? pd.clueQuestion : "";
        const clueCat = typeof pd.clueCategory === "string" ? pd.clueCategory : "";
        const clueVal = typeof pd.clueValue === "number" ? pd.clueValue : 0;
        return (
          <div className="flex flex-col gap-4 pb-16 pt-4">
            {clueCat && (
              <div className="mx-4 text-center font-display text-xs font-bold uppercase tracking-wider text-accent-brainboard">
                {clueCat} — ${clueVal}
              </div>
            )}
            {clueQ && (
              <p className="px-4 text-center font-body text-lg font-medium text-text-primary">
                {clueQ}
              </p>
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
          const maxWager = typeof pd.score === "number" ? Math.max(pd.score, 1000) : 1000;
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <NumberInput
                min={5}
                max={maxWager}
                label="Power Play! Set your wager:"
                onSubmit={handlePowerPlayWager}
              />
            </div>
          );
        }
        return renderWatchScreen("Power Play!");
      }

      case "power-play-answer": {
        if (pd.isPowerPlayPlayer) {
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <TextInput
                prompt="Power Play answer:"
                placeholder="Answer..."
                onSubmit={handlePowerPlayAnswer}
                resetNonce={errorNonce}
              />
            </div>
          );
        }
        return renderWatchScreen("Waiting for the Power Play answer...");
      }

      case "all-in-wager": {
        if (pd.canWagerFinal) {
          const playerScore = typeof pd.score === "number" ? pd.score : 0;
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <NumberInput
                min={0}
                max={playerScore}
                label="All-In Round! Set your wager:"
                onSubmit={handleAllInWager}
              />
            </div>
          );
        }
        return renderWatchScreen("All-In wagers being placed...");
      }

      case "all-in-answer": {
        if (pd.canAnswerFinal) {
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <TextInput
                prompt="All-In answer:"
                placeholder="Answer..."
                onSubmit={handleAllInAnswer}
                resetNonce={errorNonce}
              />
            </div>
          );
        }
        return renderWatchScreen("All-In answers being submitted...");
      }

      case "clue-result":
      case "all-in-category":
      case "all-in-reveal":
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
  // LUCKY LETTERS
  // ────────────────────────────────────────────────────────────────────

  function renderLuckyLetters(currentPhase: string): React.ReactNode {
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
  // SURVEY SMASH
  // ────────────────────────────────────────────────────────────────────

  function renderSurveySmash(currentPhase: string): React.ReactNode {
    const isFaceOffPlayer =
      pd.action === "face-off-your-turn" ||
      (Array.isArray(pd.faceOffPlayers) &&
        typeof pd.yourSessionId === "string" &&
        (pd.faceOffPlayers as unknown[]).includes(pd.yourSessionId));
    const isCurrentGuesser = pd.action === "your-turn-to-guess";
    const isSnagTeam = pd.action === "snag-your-turn";
    const isLightningPlayer = pd.action === "lightning-question";

    switch (currentPhase) {
      case "face-off": {
        if (isFaceOffPlayer) {
          return (
            <BuzzButton
              onBuzz={() => {
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
        if (isSnagTeam) {
          const question =
            typeof pd.question === "string" ? pd.question : "Snag it! Name an answer...";
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <TextInput
                prompt={`Snag it! ${question}`}
                placeholder="Type your snag answer..."
                onSubmit={handleTextSubmit}
                resetNonce={errorNonce}
              />
            </div>
          );
        }
        return renderWatchScreen("Other team is trying to snag...");
      }

      case "lightning-round": {
        if (isLightningPlayer) {
          const question = typeof pd.question === "string" ? pd.question : "Quick!";
          const qIndex = typeof pd.questionIndex === "number" ? pd.questionIndex + 1 : "?";
          const totalQ = typeof pd.totalQuestions === "number" ? pd.totalQuestions : "?";
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <div className="flex justify-center">
                <span className="rounded-full bg-accent-surveysmash/15 px-3 py-1 font-mono text-xs font-bold text-accent-surveysmash">
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
        return renderWatchScreen("Lightning Round!");
      }

      case "question-reveal":
      case "strike":
      case "answer-reveal":
      case "round-result":
      case "lightning-round-reveal":
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
