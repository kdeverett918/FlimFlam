"use client";

import { AbilityButton } from "@/components/controls/AbilityButton";
import { DrawCanvas } from "@/components/controls/DrawCanvas";
import { Slider } from "@/components/controls/Slider";
import { TextInput } from "@/components/controls/TextInput";
import { VoteGrid } from "@/components/controls/VoteGrid";
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
  sendMessage: (type: string, data?: Record<string, unknown>) => void;
}

export function GameController({
  gameId,
  phase,
  round,
  totalRounds,
  privateData,
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
    phase === "picking-drawer";

  if (isWaitingPhase) {
    return <WaitingScreen phase={phase} />;
  }

  // Render based on game + phase
  switch (gameId) {
    case "world-builder":
      return renderWorldBuilder(phase);
    case "bluff-engine":
      return renderBluffEngine(phase);
    case "quick-draw":
      return renderQuickDraw(phase);
    case "reality-drift":
      return renderRealityDrift(phase);
    case "hot-take":
      return renderHotTake(phase);
    default:
      return renderGenericPhase(phase);
  }

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
                onClick={() => sendMessage("player:ready")}
                className="h-14 w-full rounded-xl bg-accent-2 font-display text-lg text-bg-dark uppercase tracking-wider transition-all active:scale-95"
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
              prompt={`Round ${round}/${totalRounds} — What does your character do?`}
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
        return (
          <div className="flex flex-col items-center gap-4 px-4 pb-16 pt-8">
            <p className="text-center text-lg text-text-muted">
              Watch the story unfold on the main screen...
            </p>
          </div>
        );
      case "reveal":
      case "final-scores":
        return (
          <div className="flex flex-col items-center gap-4 px-4 pb-16 pt-8">
            <p className="text-center text-lg text-text-muted">
              Check the main screen for results!
            </p>
          </div>
        );
      default:
        return <WaitingScreen phase={currentPhase} />;
    }
  }

  function renderBluffEngine(currentPhase: string) {
    switch (currentPhase) {
      case "answer-input":
        return (
          <div className="flex flex-col gap-4 pb-16 pt-4">
            <TextInput
              prompt={`Round ${round}/${totalRounds} — Write a convincing fake answer!`}
              placeholder="Write your bluff..."
              onSubmit={handleTextSubmit}
            />
          </div>
        );
      case "voting": {
        // The options will come from game-data messages
        const options = (privateData?.voteOptions as { index: number; label: string }[]) ?? [];
        return (
          <div className="flex flex-col gap-4 pb-16 pt-4">
            <VoteGrid
              prompt="Which answer do you think is real?"
              options={options.map((opt) => ({
                index: opt.index,
                label: opt.label,
              }))}
              onConfirm={handleVoteConfirm}
            />
          </div>
        );
      }
      case "results":
      case "final-scores":
        return (
          <div className="flex flex-col items-center gap-4 px-4 pb-16 pt-8">
            <p className="text-center text-lg text-text-muted">
              Check the main screen for results!
            </p>
          </div>
        );
      default:
        return <WaitingScreen phase={currentPhase} />;
    }
  }

  function renderQuickDraw(currentPhase: string) {
    const isDrawer = Boolean(privateData?.isDrawer);
    const word = typeof privateData?.word === "string" ? (privateData.word as string) : null;

    // Drawer keeps drawing even after the host transitions to "guessing" (phases overlap).
    if ((currentPhase === "drawing" || currentPhase === "guessing") && isDrawer) {
      return (
        <div className="flex flex-col gap-4 pb-16 pt-4">
          {word && (
            <div className="mx-4 rounded-xl border-2 border-accent-2/40 bg-accent-2/10 px-4 py-3 text-center">
              <div className="text-xs font-medium uppercase tracking-wider text-accent-2">
                Your Word
              </div>
              <div className="font-display text-2xl text-text-primary">{word.toUpperCase()}</div>
            </div>
          )}
          <p className="px-4 text-center text-lg font-medium text-text-primary">
            Draw the word — be quick!
          </p>
          <DrawCanvas onStrokeSend={handleDrawStroke} />
        </div>
      );
    }

    switch (currentPhase) {
      case "drawing":
        return <WaitingScreen phase="drawing" />;
      case "guessing":
        return (
          <div className="flex flex-col gap-4 pb-16 pt-4">
            <TextInput
              prompt="What is being drawn?"
              placeholder="Type your guess..."
              onSubmit={handleTextSubmit}
            />
          </div>
        );
      case "word-reveal":
      case "final-scores":
        return (
          <div className="flex flex-col items-center gap-4 px-4 pb-16 pt-8">
            <p className="text-center text-lg text-text-muted">
              Check the main screen for the reveal!
            </p>
          </div>
        );
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
                prompt={`Round ${round}/${totalRounds} — Pick the correct answer`}
                options={options.map((opt) => ({
                  index: opt.index,
                  label: opt.label,
                }))}
                onConfirm={handleVoteConfirm}
              />
            </div>
          );
        }
        return (
          <div className="flex flex-col gap-4 pb-16 pt-4">
            <TextInput
              prompt={`Round ${round}/${totalRounds} — What's your answer?`}
              placeholder="Type your answer..."
              onSubmit={handleTextSubmit}
            />
          </div>
        );
      }
      case "drift-check":
        return (
          <div className="flex flex-col gap-4 pb-16 pt-4">
            <VoteGrid
              prompt="Is this question real or made up?"
              options={[
                { index: 0, label: "Real — this is a genuine question" },
                { index: 1, label: "Drift — this is completely fake" },
              ]}
              onConfirm={handleVoteConfirm}
            />
          </div>
        );
      case "results":
      case "final-scores":
        return (
          <div className="flex flex-col items-center gap-4 px-4 pb-16 pt-8">
            <p className="text-center text-lg text-text-muted">
              Check the main screen for results!
            </p>
          </div>
        );
      default:
        return <WaitingScreen phase={currentPhase} />;
    }
  }

  function renderHotTake(currentPhase: string) {
    switch (currentPhase) {
      case "showing-prompt":
        return (
          <div className="flex flex-col items-center gap-4 px-4 pb-16 pt-8">
            <p className="text-center text-lg text-text-muted">
              Read the statement on the main screen...
            </p>
          </div>
        );
      case "voting":
        return (
          <div className="flex flex-col gap-4 pb-16 pt-4">
            <Slider prompt="How do you feel about this?" onSubmit={handleSliderSubmit} />
          </div>
        );
      case "results":
      case "final-scores":
        return (
          <div className="flex flex-col items-center gap-4 px-4 pb-16 pt-8">
            <p className="text-center text-lg text-text-muted">
              Check the main screen for results!
            </p>
          </div>
        );
      default:
        return <WaitingScreen phase={currentPhase} />;
    }
  }

  function renderGenericPhase(currentPhase: string) {
    // Fallback for unknown games/phases
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
      return (
        <div className="flex flex-col items-center gap-4 px-4 pb-16 pt-8">
          <p className="text-center text-lg text-text-muted">Waiting for vote options...</p>
        </div>
      );
    }
    if (currentPhase.includes("draw")) {
      return (
        <div className="flex flex-col gap-4 pb-16 pt-4">
          <DrawCanvas onStrokeSend={handleDrawStroke} />
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-4 px-4 pb-16 pt-8">
        <p className="text-center text-lg text-text-muted">Watch the main screen...</p>
      </div>
    );
  }
}
