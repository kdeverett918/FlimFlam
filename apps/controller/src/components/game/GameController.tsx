"use client";
import { TextInput } from "@/components/controls/TextInput";
import { GameThemeProvider, GlassPanel } from "@flimflam/ui";
import type { GameTheme } from "@flimflam/ui";
import { Monitor, Trophy } from "lucide-react";
import { useCallback } from "react";
import { ReactionBar } from "./ReactionBar";

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
  errorNonce: _errorNonce,
  sendMessage,
}: GameControllerProps) {
  const handleTextSubmit = useCallback(
    (text: string) => {
      sendMessage("player:submit", { content: text });
    },
    [sendMessage],
  );

  const _handleVoteConfirm = useCallback(
    (targetIndex: number) => {
      sendMessage("player:vote", { targetIndex });
    },
    [sendMessage],
  );

  const themeKey = GAME_THEME_MAP[gameId] ?? "default";
  const gameName = GAME_DISPLAY_NAMES[gameId] ?? gameId;
  const accentClass = GAME_ACCENT_CLASSES[gameId] ?? "text-accent-1 bg-accent-1/15";

  // Game controller views will be added here as new games are implemented.
  const content = renderGenericPhase(phase);

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

  function _renderFinalScoresCard() {
    const playerScore = typeof privateData?.score === "number" ? privateData.score : null;
    const playerRank = typeof privateData?.rank === "number" ? privateData.rank : null;
    const total = typeof privateData?.totalPlayers === "number" ? privateData.totalPlayers : null;

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
