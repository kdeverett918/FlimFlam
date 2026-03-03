"use client";

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

  const handleTextSubmit = useCallback(
    (text: string) => {
      sendMessage("player:submit", { content: text });
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

  const handleConfirmCategories = useCallback(() => {
    sendMessage("player:confirm-categories");
  }, [sendMessage]);

  const handleRerollBoard = useCallback(() => {
    sendMessage("player:reroll-board");
  }, [sendMessage]);

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
      case "category-reveal": {
        const revealCategories = Array.isArray(pd.categories)
          ? pd.categories.filter((c): c is string => typeof c === "string")
          : [];
        if (revealCategories.length > 0) {
          return (
            <CategoryReveal
              categories={revealCategories}
              isSelector={pd.isSelector === true}
              onConfirm={handleConfirmCategories}
              onReroll={handleRerollBoard}
            />
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
              <p
                className="text-center font-display text-2xl font-black uppercase"
                style={{
                  color: "oklch(0.82 0.2 85)",
                  textShadow: "0 0 24px oklch(0.82 0.2 85 / 0.5)",
                }}
              >
                Power Play!
              </p>
              <NumberInput
                min={5}
                max={maxWager}
                label="Set your wager:"
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
              <p
                className="text-center font-display text-2xl font-black uppercase"
                style={{
                  color: "oklch(0.82 0.2 85)",
                  textShadow: "0 0 24px oklch(0.82 0.2 85 / 0.5)",
                }}
              >
                Power Play!
              </p>
              <TextInput
                prompt="Your answer:"
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
          const allInCat = typeof pd.allInCategory === "string" ? pd.allInCategory : "";
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <p
                className="text-center font-display text-2xl font-black uppercase text-accent-brainboard"
                style={{
                  textShadow: "0 0 24px oklch(0.68 0.22 265 / 0.5)",
                }}
              >
                All-In Round
              </p>
              {allInCat && (
                <p className="text-center font-display text-sm font-bold text-accent-brainboard uppercase">
                  {allInCat}
                </p>
              )}
              <NumberInput
                min={0}
                max={playerScore}
                label="Set your wager:"
                onSubmit={handleAllInWager}
              />
            </div>
          );
        }
        return renderWatchScreen("All-In wagers being placed...");
      }

      case "all-in-answer": {
        if (pd.canAnswerFinal) {
          const allInCat = typeof pd.allInCategory === "string" ? pd.allInCategory : "";
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <p
                className="text-center font-display text-2xl font-black uppercase text-accent-brainboard"
                style={{
                  textShadow: "0 0 24px oklch(0.68 0.22 265 / 0.5)",
                }}
              >
                All-In Round
              </p>
              {allInCat && (
                <p className="text-center font-display text-sm font-bold text-accent-brainboard uppercase">
                  {allInCat}
                </p>
              )}
              <TextInput
                prompt="Your answer:"
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
        return renderBrainBoardWatchCard("Results are in!");

      case "all-in-category":
        return renderBrainBoardWatchCard("All-In Round!");

      case "all-in-reveal":
        return renderBrainBoardWatchCard("Final Reveal!");

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
          <div className="flex flex-col gap-4 pb-16 pt-4 animate-fade-in-up">
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
          <div className="flex flex-col gap-4 pb-16 pt-4 animate-fade-in-up">
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
          <div className="flex flex-col gap-4 pb-16 pt-4 animate-fade-in-up">
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
          <div className="flex flex-col gap-4 pb-16 pt-4 animate-fade-in-up">
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
          <div className="flex flex-col gap-4 pb-16 pt-4 animate-fade-in-up">
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

    switch (currentPhase) {
      case "face-off": {
        if (isFaceOffPlayer) {
          const question = typeof pd.question === "string" ? pd.question : "Name the top answer!";
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
              <QuickGuessInput
                prompt={question}
                placeholder="Quick! Type your answer..."
                onSubmit={handleTextSubmit}
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
  // BRAIN BOARD — contextual watch card
  // ────────────────────────────────────────────────────────────────────

  function renderBrainBoardWatchCard(message: string) {
    const playerScore = typeof pd.score === "number" ? pd.score : null;
    return (
      <div className="flex flex-col items-center gap-4 px-4 pb-16 pt-8 animate-fade-in-up">
        <GlassPanel className="flex flex-col items-center gap-3 px-8 py-6">
          {playerScore !== null && (
            <span className="font-mono text-xl font-bold text-accent-brainboard">
              {playerScore.toLocaleString()} pts
            </span>
          )}
          <p className="text-center font-display text-lg font-bold text-text-primary">{message}</p>
          <p className="text-center font-body text-sm text-text-muted">Watch the main screen!</p>
        </GlassPanel>
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
        <GlassPanel className="flex flex-col items-center gap-3 px-8 py-6">
          <Monitor className="h-6 w-6 text-text-muted" />
          <p className="text-center font-body text-lg text-text-muted">{message}</p>
        </GlassPanel>
      </div>
    );
  }
}
