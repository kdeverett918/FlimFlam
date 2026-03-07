"use client";

import type { PlayerData } from "@flimflam/shared";
import { GameThemeProvider } from "@flimflam/ui";
import type { GameTheme } from "@flimflam/ui";

import { BrainBoardGame } from "@/components/games/BrainBoardGame";
import { LuckyLettersGame } from "@/components/games/LuckyLettersGame";
import { SurveySmashGame } from "@/components/games/SurveySmashGame";

// ─── Types ──────────────────────────────────────────────────────────────────

interface UnifiedGameViewProps {
  gameId: string;
  phase: string;
  round: number;
  totalRounds: number;
  players: PlayerData[];
  gamePayload: Record<string, unknown>;
  privateData: Record<string, unknown> | null;
  gameEvents: Record<string, Record<string, unknown>>;
  mySessionId: string | null;
  isHost: boolean;
  timerEndTime: number | null;
  sendMessage: (type: string, data?: Record<string, unknown>) => void;
  room: {
    onMessage: (type: string, cb: (data: Record<string, unknown>) => void) => () => void;
    send: (type: string, data?: Record<string, unknown>) => void;
  } | null;
  errorNonce?: number;
}

const GAME_THEME_MAP: Record<string, GameTheme> = {
  "brain-board": "brain-board",
  "lucky-letters": "lucky-letters",
  "survey-smash": "survey-smash",
};

// ─── Component ──────────────────────────────────────────────────────────────

export function UnifiedGameView({
  gameId,
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
}: UnifiedGameViewProps) {
  const themeKey = GAME_THEME_MAP[gameId] ?? "default";

  const commonProps = {
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
  };

  let gameContent: React.ReactNode;

  switch (gameId) {
    case "brain-board":
      gameContent = <BrainBoardGame {...commonProps} />;
      break;
    case "lucky-letters":
      gameContent = <LuckyLettersGame {...commonProps} />;
      break;
    case "survey-smash":
      gameContent = <SurveySmashGame {...commonProps} />;
      break;
    default:
      gameContent = (
        <div className="flex min-h-dvh items-center justify-center">
          <p className="font-display text-[48px] text-text-muted">Unknown game: {gameId}</p>
        </div>
      );
  }

  return <GameThemeProvider defaultTheme={themeKey}>{gameContent}</GameThemeProvider>;
}
