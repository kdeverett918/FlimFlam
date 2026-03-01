"use client";

import { AbilityButton } from "@/components/controls/AbilityButton";
import { BrainBattleTopicSubmit } from "@/components/controls/BrainBattleTopicSubmit";
import { BuzzButton } from "@/components/controls/BuzzButton";
import { DrawCanvas } from "@/components/controls/DrawCanvas";
import { QuickGuessInput } from "@/components/controls/QuickGuessInput";
import { Slider } from "@/components/controls/Slider";
import { TextInput } from "@/components/controls/TextInput";
import { TopicSetup } from "@/components/controls/TopicSetup";
import { VoteGrid } from "@/components/controls/VoteGrid";
import { GameThemeProvider, GlassPanel, haptics } from "@partyline/ui";
import type { GameTheme } from "@partyline/ui";
import { Check, Monitor } from "lucide-react";
import { useCallback } from "react";
import { RoleCard } from "./RoleCard";
import { WaitingScreen } from "./WaitingScreen";

interface PrivateData {
  role?: string;
  publicIdentity?: string;
  secretObjective?: string;
  specialAbility?: string;
  abilityId?: string;
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
  "world-builder": "world-builder",
  "bluff-engine": "bluff-engine",
  "quick-draw": "quick-draw",
  "reality-drift": "reality-drift",
  "hot-take": "hot-take",
  "brain-battle": "brain-battle",
};

const GAME_DISPLAY_NAMES: Record<string, string> = {
  "world-builder": "World Builder",
  "bluff-engine": "Bluff Engine",
  "quick-draw": "Quick Draw",
  "reality-drift": "Reality Drift",
  "hot-take": "Hot Take",
  "brain-battle": "Brain Battle",
};

const GAME_ACCENT_CLASSES: Record<string, string> = {
  "world-builder": "text-accent-2 bg-accent-2/15",
  "bluff-engine": "text-accent-3 bg-accent-3/15",
  "quick-draw": "text-accent-4 bg-accent-4/15",
  "reality-drift": "text-accent-5 bg-accent-5/15",
  "hot-take": "text-accent-6 bg-accent-6/15",
  "brain-battle": "text-accent-7 bg-accent-7/15",
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
  const handleTextSubmit = useCallback(
    (text: string) => {
      sendMessage("player:submit", { content: text });
    },
    [sendMessage],
  );

  const handleVoteConfirm = useCallback(
    (targetIndex: number) => {
      sendMessage("player:vote", { targetIndex });
    },
    [sendMessage],
  );

  const handleDrawStroke = useCallback(
    (stroke: { points: { x: number; y: number }[]; color: string; size: number }) => {
      sendMessage("player:draw-stroke", stroke);
    },
    [sendMessage],
  );

  const handleDrawUndo = useCallback(() => {
    sendMessage("player:draw-undo");
  }, [sendMessage]);

  const handleDrawClear = useCallback(() => {
    sendMessage("player:draw-clear");
  }, [sendMessage]);

  const handleSliderSubmit = useCallback(
    (value: number) => {
      sendMessage("player:vote", { value });
    },
    [sendMessage],
  );

  const handleAbilityUse = useCallback(
    (abilityId: string) => {
      sendMessage("player:use-ability", { abilityId });
    },
    [sendMessage],
  );

  // AI generation / waiting phases
  const isWaitingPhase =
    phase === "generating" ||
    phase === "ai-narrating" ||
    phase === "generating-prompt" ||
    phase === "generating-questions" ||
    phase === "picking-drawer" ||
    phase === "ai-generating" ||
    phase === "board-generating" ||
    phase === "appeal-judging";

  if (isWaitingPhase) {
    return <WaitingScreen phase={phase} />;
  }

  const themeKey = GAME_THEME_MAP[gameId] ?? "default";
  const gameName = GAME_DISPLAY_NAMES[gameId] ?? gameId;
  const accentClass = GAME_ACCENT_CLASSES[gameId] ?? "text-accent-1 bg-accent-1/15";

  // Render based on game + phase
  let content: React.ReactNode;
  switch (gameId) {
    case "world-builder":
      content = renderWorldBuilder(phase);
      break;
    case "bluff-engine":
      content = renderBluffEngine(phase);
      break;
    case "quick-draw":
      content = renderQuickDraw(phase);
      break;
    case "reality-drift":
      content = renderRealityDrift(phase);
      break;
    case "hot-take":
      content = renderHotTake(phase);
      break;
    case "brain-battle":
      content = renderBrainBattle(phase);
      break;
    default:
      content = renderGenericPhase(phase);
      break;
  }

  return (
    <GameThemeProvider defaultTheme={themeKey}>
      {/* Game-specific header bar */}
      <div className="flex items-center justify-center gap-2 px-4 py-2">
        <div
          className={`rounded-full px-3 py-1 font-display text-xs font-bold uppercase tracking-wider ${accentClass}`}
        >
          {gameName}
        </div>
      </div>
      {content}
    </GameThemeProvider>
  );

  function renderWorldBuilder(currentPhase: string) {
    switch (currentPhase) {
      case "role-reveal":
        return (
          <div className="flex flex-col gap-4 pb-16 pt-4">
            {privateData?.role ? (
              <RoleCard
                roleName={privateData.role as string}
                publicIdentity={(privateData.publicIdentity as string) ?? "Unknown"}
                secretObjective={(privateData.secretObjective as string) ?? "None assigned"}
                specialAbility={privateData.specialAbility as string | undefined}
              />
            ) : (
              <WaitingScreen phase="generating" />
            )}
            <div className="px-4">
              <button
                type="button"
                onClick={() => {
                  haptics.confirm();
                  sendMessage("player:ready");
                }}
                className="h-14 w-full rounded-xl bg-accent-2 font-display text-lg text-white uppercase tracking-wider transition-all active:scale-95"
                style={{
                  boxShadow: "0 0 16px oklch(0.7 0.2 330 / 0.25)",
                }}
              >
                Ready
              </button>
            </div>
          </div>
        );
      case "action-input":
        return (
          <div className="flex flex-col gap-4 pb-16 pt-4">
            {privateData?.role && (
              <RoleCard
                roleName={privateData.role as string}
                publicIdentity={(privateData.publicIdentity as string) ?? "Unknown"}
                secretObjective={(privateData.secretObjective as string) ?? "None assigned"}
                specialAbility={privateData.specialAbility as string | undefined}
              />
            )}
            <TextInput
              prompt={`Round ${round}/${totalRounds} -- What does your character do?`}
              placeholder="Describe your action..."
              onSubmit={handleTextSubmit}
            />
            {privateData?.specialAbility && privateData.abilityId && (
              <AbilityButton
                abilityName="Special Ability"
                abilityDescription={privateData.specialAbility as string}
                abilityId={privateData.abilityId as string}
                onUse={handleAbilityUse}
              />
            )}
          </div>
        );
      case "narration-display":
        return renderWatchScreen("Watch the story unfold on the main screen...");
      case "reveal":
      case "final-scores":
        return renderWatchScreen("Check the main screen for results!");
      default:
        return <WaitingScreen phase={currentPhase} />;
    }
  }

  function renderBluffEngine(currentPhase: string) {
    const question =
      typeof privateData?.question === "string" ? (privateData.question as string) : "";
    const category =
      typeof privateData?.category === "string" ? (privateData.category as string) : "";

    switch (currentPhase) {
      case "answer-input":
        return (
          <div className="flex flex-col gap-4 pb-16 pt-4">
            {category && (
              <div className="mx-4 rounded-full bg-accent-3/15 px-3 py-1 text-center font-body text-xs font-medium uppercase tracking-wider text-accent-3">
                {category}
              </div>
            )}
            {question && (
              <p className="px-4 text-center font-body text-lg font-medium text-text-primary">
                {question}
              </p>
            )}
            <TextInput
              prompt={`Round ${round}/${totalRounds} -- Write a convincing fake answer!`}
              placeholder="Write your bluff..."
              onSubmit={handleTextSubmit}
              maxChars={80}
              resetNonce={errorNonce}
            />
          </div>
        );
      case "voting": {
        const options = (privateData?.voteOptions as { index: number; label: string }[]) ?? [];
        const disallowedVoteIndex =
          typeof privateData?.disallowedVoteIndex === "number"
            ? (privateData.disallowedVoteIndex as number)
            : null;
        return (
          <div className="flex flex-col gap-4 pb-16 pt-4">
            {question && (
              <p className="px-4 text-center font-body text-base font-medium text-text-primary">
                {question}
              </p>
            )}
            <VoteGrid
              prompt="Which answer do you think is real? (You can't vote for your own answer.)"
              options={options.map((opt) => ({
                index: opt.index,
                label: opt.label,
                disabled: disallowedVoteIndex === opt.index,
              }))}
              onConfirm={handleVoteConfirm}
              resetNonce={errorNonce}
            />
          </div>
        );
      }
      case "results":
      case "final-scores":
        return renderWatchScreen("Check the main screen for results!");
      default:
        return <WaitingScreen phase={currentPhase} />;
    }
  }

  function renderQuickDraw(currentPhase: string) {
    const isDrawer = Boolean(privateData?.isDrawer);
    const word = typeof privateData?.word === "string" ? (privateData.word as string) : null;
    const guessedCorrectly = Boolean(privateData?.qdCorrect);

    if ((currentPhase === "drawing" || currentPhase === "guessing") && isDrawer) {
      return (
        <div className="flex flex-col gap-4 pb-16 pt-4">
          {word && (
            <GlassPanel className="mx-4 border-accent-4/30 px-4 py-3 text-center">
              <div className="font-body text-xs font-medium uppercase tracking-wider text-accent-4">
                Your Word
              </div>
              <div className="font-display text-2xl font-bold text-text-primary">
                {word.toUpperCase()}
              </div>
            </GlassPanel>
          )}
          <p className="px-4 text-center font-body text-lg font-medium text-text-primary">
            Draw the word -- be quick!
          </p>
          <DrawCanvas
            onStrokeSend={handleDrawStroke}
            onUndoSend={handleDrawUndo}
            onClearSend={handleDrawClear}
          />
        </div>
      );
    }

    switch (currentPhase) {
      case "drawing":
        return <WaitingScreen phase="drawing" />;
      case "guessing":
        return guessedCorrectly ? (
          renderSuccessCard("You got it!", "Keep watching the main screen...")
        ) : (
          <div className="flex flex-col gap-4 pb-16 pt-4">
            <QuickGuessInput
              prompt="What is being drawn?"
              placeholder="Type your guess..."
              onSubmit={handleTextSubmit}
            />
          </div>
        );
      case "word-reveal":
        return guessedCorrectly
          ? renderSuccessCard("You got it!", "Keep watching the main screen...")
          : renderWatchScreen("Check the main screen for the reveal!");
      case "final-scores":
        return renderWatchScreen("Check the main screen for the reveal!");
      default:
        return <WaitingScreen phase={currentPhase} />;
    }
  }

  function renderRealityDrift(currentPhase: string) {
    switch (currentPhase) {
      case "answering": {
        const options = (privateData?.answerOptions as { index: number; label: string }[]) ?? [];
        if (options.length > 0) {
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <VoteGrid
                key={`reality-drift-answering-${round}`}
                prompt={`Round ${round}/${totalRounds} -- Fill the blank`}
                options={options.map((opt) => ({
                  index: opt.index,
                  label: opt.label,
                }))}
                onConfirm={handleVoteConfirm}
              />
            </div>
          );
        }
        // Options not yet received (e.g. reconnecting mid-round) — show waiting state.
        return <WaitingScreen phase="answering" />;
      }
      case "drift-check":
        return (
          <div className="flex flex-col gap-4 pb-16 pt-4">
            <VoteGrid
              key={`reality-drift-drift-check-${round}`}
              prompt="Is this headline real or made up?"
              options={[
                { index: 0, label: "Real -- this actually happened" },
                { index: 1, label: "Hallucination -- completely made up" },
              ]}
              onConfirm={handleVoteConfirm}
            />
          </div>
        );
      case "results":
      case "final-scores":
        return renderWatchScreen("Check the main screen for results!");
      default:
        return <WaitingScreen phase={currentPhase} />;
    }
  }

  function renderHotTake(currentPhase: string) {
    switch (currentPhase) {
      case "topic-setup":
        return (
          <TopicSetup
            categories={((privateData?.categories as string[]) ?? []).filter(
              (category): category is string => typeof category === "string" && category.length > 0,
            )}
            onSubmit={(topic, category) => {
              sendMessage("player:submit", { content: topic, category });
            }}
          />
        );
      case "ai-generating":
        return <WaitingScreen phase="ai-generating" />;
      case "showing-prompt":
        return renderWatchScreen("Read the statement on the main screen...");
      case "voting":
        return (
          <div className="flex flex-col gap-4 pb-16 pt-4">
            <Slider prompt="How do you feel about this?" onSubmit={handleSliderSubmit} />
          </div>
        );
      case "results":
      case "final-scores":
        return renderWatchScreen("Check the main screen for results!");
      default:
        return <WaitingScreen phase={currentPhase} />;
    }
  }

  function renderBrainBattle(currentPhase: string) {
    switch (currentPhase) {
      case "topic-submit":
        return <BrainBattleTopicSubmit sendMessage={sendMessage} />;

      case "board-generating":
      case "board-reveal":
        return <WaitingScreen phase={currentPhase} />;

      case "clue-select":
        if (privateData?.isSelector) {
          const board =
            (privateData?.board as Array<{
              name: string;
              clues: Array<{ id: string; value: number; answered: boolean }>;
            }>) ?? [];
          const categories = board.map((cat) => cat.name);
          const answeredClues = (privateData?.answeredClues as string[]) ?? [];
          const values = [200, 400, 600, 800, 1000];
          return (
            <div className="flex flex-col gap-3 px-2 pb-16 pt-4">
              <p className="text-center font-display text-lg font-bold text-text-primary">
                Pick a clue!
              </p>
              {/* Mini-board grid */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {categories.map((cat) => (
                        <th
                          key={cat}
                          className="px-1 py-1 text-center font-display text-[10px] font-bold text-accent-7 uppercase tracking-wider"
                        >
                          {cat.length > 8 ? `${cat.slice(0, 8)}...` : cat}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {values.map((val, rowIdx) => (
                      <tr key={val}>
                        {categories.map((_cat, colIdx) => {
                          const clueId = `cat${colIdx}_clue${rowIdx}`;
                          const isAnswered = answeredClues.includes(clueId);
                          return (
                            <td key={clueId} className="p-0.5">
                              <button
                                type="button"
                                disabled={isAnswered}
                                onClick={() => {
                                  haptics.tap();
                                  sendMessage("player:select-clue", { clueId });
                                }}
                                className="h-12 w-full rounded-lg font-display text-sm font-bold transition-all active:scale-95 disabled:opacity-30 disabled:active:scale-100"
                                style={{
                                  backgroundColor: isAnswered
                                    ? "rgba(255,255,255,0.03)"
                                    : "rgba(255,255,255,0.08)",
                                  color: isAnswered
                                    ? "rgba(255,255,255,0.2)"
                                    : "var(--color-accent-7, #818cf8)",
                                }}
                              >
                                ${val}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }
        return (
          <div className="flex flex-col items-center gap-4 px-4 pb-16 pt-8">
            <p className="text-center text-lg text-text-muted">
              Waiting for {(privateData?.selectorName as string) ?? "selector"} to pick a clue...
            </p>
          </div>
        );

      case "buzzing":
        return (
          <BuzzButton
            onBuzz={() => sendMessage("player:buzz")}
            playerColor={(privateData?.avatarColor as string) ?? undefined}
          />
        );

      case "answering":
        if (privateData?.isBuzzWinner) {
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <TextInput
                prompt='Your answer -- start with "What is..."'
                placeholder="What is...?"
                maxChars={100}
                onSubmit={handleTextSubmit}
              />
            </div>
          );
        }
        return (
          <div className="flex flex-col items-center gap-4 px-4 pb-16 pt-8">
            <p className="text-center text-lg text-text-muted">
              Waiting for {(privateData?.buzzWinnerName as string) ?? "player"}&apos;s answer...
            </p>
          </div>
        );

      case "appeal-window":
        if (privateData?.canAppeal) {
          return (
            <div className="flex flex-col gap-4 pb-16 pt-4">
              <div className="text-center text-sm text-text-muted">
                Appeals remaining: {(privateData?.appealsRemaining as number) ?? 0}
              </div>
              <TextInput
                prompt="Make your case to the judge!"
                placeholder="I believe my answer is correct because..."
                maxChars={140}
                onSubmit={handleTextSubmit}
              />
            </div>
          );
        }
        return (
          <div className="flex flex-col items-center gap-4 px-4 pb-16 pt-8">
            <p className="text-center text-lg text-text-muted">Waiting for the appeal...</p>
          </div>
        );

      case "appeal-judging":
      case "appeal-result":
      case "clue-result":
      case "final-scores":
        return renderWatchScreen("Check the main screen!");

      default:
        return <WaitingScreen phase={currentPhase} />;
    }
  }

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
    if (currentPhase.includes("draw")) {
      return (
        <div className="flex flex-col gap-4 pb-16 pt-4">
          <DrawCanvas onStrokeSend={handleDrawStroke} />
        </div>
      );
    }
    return renderWatchScreen("Watch the main screen...");
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

  function renderSuccessCard(title: string, subtitle: string) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 pb-16 pt-10 animate-fade-in-up">
        <GlassPanel glow className="flex flex-col items-center gap-4 px-8 py-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-5/15">
            <Check className="h-7 w-7 text-accent-5" strokeWidth={3} />
          </div>
          <p className="font-display text-xl font-bold text-accent-5">{title}</p>
          <p className="text-center font-body text-sm text-text-muted">{subtitle}</p>
        </GlassPanel>
      </div>
    );
  }
}
