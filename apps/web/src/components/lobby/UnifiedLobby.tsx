"use client";

import type { Complexity, PlayerData } from "@flimflam/shared";
import { MIN_PLAYERS } from "@flimflam/shared";
import { AnimatedBackground, GameThemeProvider, haptics, useGameTheme } from "@flimflam/ui";
import type { GameTheme } from "@flimflam/ui";
import { useCallback, useEffect } from "react";
import { DifficultySelector } from "./DifficultySelector";
import { GameCarousel } from "./GameCarousel";
import { LaunchButton } from "./LaunchButton";
import { LobbyHeader } from "./LobbyHeader";
import { PlayerArena } from "./PlayerArena";
import { ReadinessBar } from "./ReadinessBar";
import { WaitingEngagement } from "./WaitingEngagement";

export interface UnifiedLobbyProps {
  roomCode: string;
  players: PlayerData[];
  selectedGameId: string;
  complexity: Complexity;
  isHost: boolean;
  mySessionId: string | null;
  sendMessage: (type: string, data?: Record<string, unknown>) => void;
}

const GAME_ID_TO_THEME: Record<string, GameTheme> = {
  "brain-board": "brain-board",
  "lucky-letters": "lucky-letters",
  "survey-smash": "survey-smash",
};

export function UnifiedLobby(props: UnifiedLobbyProps) {
  const theme = GAME_ID_TO_THEME[props.selectedGameId] ?? "default";

  return (
    <GameThemeProvider defaultTheme={theme}>
      <LobbyContent {...props} />
    </GameThemeProvider>
  );
}

function LobbyContent({
  roomCode,
  players,
  selectedGameId,
  complexity,
  isHost,
  mySessionId,
  sendMessage,
}: UnifiedLobbyProps) {
  const { setTheme } = useGameTheme();
  const playerCount = players.length;
  const hasEnoughPlayers = playerCount >= MIN_PLAYERS;
  const hasSelectedGame = selectedGameId !== "";
  const canStart = hasEnoughPlayers && hasSelectedGame;
  const myPlayer = players.find((p) => p.sessionId === mySessionId);
  const amReady = myPlayer?.ready ?? false;
  const hostActionLabel = !hasEnoughPlayers
    ? "Waiting for Players..."
    : !hasSelectedGame
      ? "Select a Game"
      : "Start Game";
  const hostStatusLabel = !hasEnoughPlayers
    ? `Min ${MIN_PLAYERS} Players`
    : !hasSelectedGame
      ? "Pick a game to unlock start"
      : "All set!";

  useEffect(() => {
    const theme = GAME_ID_TO_THEME[selectedGameId] ?? "default";
    setTheme(theme);
  }, [selectedGameId, setTheme]);

  const handleSelectGame = useCallback(
    (gameId: string) => {
      sendMessage("host:select-game", { gameId });
    },
    [sendMessage],
  );

  const handleSetComplexity = useCallback(
    (value: Complexity) => {
      sendMessage("host:set-complexity", { complexity: value });
    },
    [sendMessage],
  );

  const handleStartGame = useCallback(() => {
    haptics.confirm();
    sendMessage("host:start-game");
  }, [sendMessage]);

  const handleToggleReady = useCallback(() => {
    haptics.tap();
    sendMessage("player:ready", { ready: !amReady });
  }, [sendMessage, amReady]);

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-x-hidden overflow-y-auto">
      <AnimatedBackground variant="subtle" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 pb-[env(safe-area-inset-bottom,16px)] sm:p-6 lg:gap-8 lg:p-10">
        {/* Header — Room code + Share + QR */}
        <LobbyHeader roomCode={roomCode} />

        {/* Two-column layout on desktop */}
        <div className="flex flex-1 flex-col gap-6 lg:flex-row lg:gap-12">
          {/* LEFT COLUMN — Players */}
          <div className="flex flex-col gap-6 lg:w-[380px] lg:shrink-0">
            <PlayerArena
              players={players}
              isHost={isHost}
              mySessionId={mySessionId}
              sendMessage={sendMessage}
            />

            {playerCount < MIN_PLAYERS && (
              <div className="flex animate-pulse items-center justify-center gap-2 text-accent-3">
                <div className="h-2 w-2 rounded-full bg-accent-3" />
                <span className="font-body text-sm font-medium">
                  Need {MIN_PLAYERS - playerCount} more player
                  {MIN_PLAYERS - playerCount > 1 ? "s" : ""} to start
                </span>
              </div>
            )}

            {/* Readiness bar */}
            {players.length > 0 && <ReadinessBar players={players} />}
          </div>

          {/* RIGHT COLUMN — Game config, action buttons */}
          <div className="flex flex-col gap-6 lg:flex-1">
            {/* Game selection */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-6 rounded-full bg-primary shadow-[0_0_10px_var(--color-primary)]" />
                <h2 className="font-display text-lg font-black uppercase tracking-tight text-text-primary sm:text-xl">
                  {isHost ? "Select Game" : "Game"}
                </h2>
              </div>
              <GameCarousel
                selectedGameId={selectedGameId}
                isHost={isHost}
                onSelect={handleSelectGame}
              />
            </div>

            {/* Difficulty — segmented control */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-6 rounded-full bg-primary shadow-[0_0_10px_var(--color-primary)]" />
                <h2 className="font-display text-lg font-black uppercase tracking-tight text-text-primary sm:text-xl">
                  Difficulty
                </h2>
              </div>
              <DifficultySelector
                complexity={complexity}
                isHost={isHost}
                onChange={handleSetComplexity}
              />
            </div>

            {/* Waiting engagement tips */}
            {hasSelectedGame && <WaitingEngagement selectedGameId={selectedGameId} />}

            {/* Action button area */}
            <div className="mt-auto">
              <LaunchButton
                isHost={isHost}
                canStart={canStart}
                amReady={amReady}
                hostActionLabel={hostActionLabel}
                hostStatusLabel={hostStatusLabel}
                onStartGame={handleStartGame}
                onToggleReady={handleToggleReady}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
