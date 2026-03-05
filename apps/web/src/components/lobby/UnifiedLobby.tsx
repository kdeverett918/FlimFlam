"use client";

import type { Complexity, PlayerData } from "@flimflam/shared";
import { MIN_PLAYERS } from "@flimflam/shared";
import { AnimatedBackground, GameThemeProvider, haptics, useGameTheme } from "@flimflam/ui";
import type { GameTheme } from "@flimflam/ui";
import { motion } from "motion/react";
import { useCallback, useEffect } from "react";
import { ComplexityPicker } from "./ComplexityPicker";
import { GameSelector } from "./GameSelector";
import { PlayerList } from "./PlayerList";
import { SharePanel } from "./SharePanel";

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
  const canStart = playerCount >= MIN_PLAYERS && selectedGameId !== "";
  const myPlayer = players.find((p) => p.sessionId === mySessionId);
  const amReady = myPlayer?.ready ?? false;

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
    <div className="relative flex min-h-[100dvh] flex-col overflow-x-hidden">
      <AnimatedBackground variant="subtle" />

      {/* Mobile: single column. Desktop: two columns */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 p-4 pb-[env(safe-area-inset-bottom,16px)] sm:p-6 lg:flex-row lg:gap-12 lg:p-10">
        {/* LEFT COLUMN — Room code, QR, Players */}
        <div className="flex flex-col gap-8 lg:w-[380px] lg:shrink-0">
          <SharePanel roomCode={roomCode} />
          <PlayerList
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
        </div>

        {/* RIGHT COLUMN — Game config, action buttons */}
        <div className="flex flex-1 flex-col gap-8">
          {/* Game selection */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-6 rounded-full bg-primary shadow-[0_0_10px_var(--color-primary)]" />
              <h2 className="font-display text-lg font-black uppercase tracking-tight text-text-primary sm:text-xl">
                {isHost ? "Select Game" : "Game"}
              </h2>
            </div>
            <GameSelector
              selectedGameId={selectedGameId}
              isHost={isHost}
              onSelect={handleSelectGame}
            />
          </div>

          {/* Complexity / Difficulty */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-6 rounded-full bg-primary shadow-[0_0_10px_var(--color-primary)]" />
              <h2 className="font-display text-lg font-black uppercase tracking-tight text-text-primary sm:text-xl">
                {isHost ? "Difficulty" : "Difficulty"}
              </h2>
            </div>
            <ComplexityPicker
              complexity={complexity}
              isHost={isHost}
              onChange={handleSetComplexity}
            />
          </div>

          {/* Action button area */}
          <div className="mt-auto flex flex-col items-center gap-4 pt-4">
            {isHost ? (
              <>
                {/* Host: Start Game button */}
                <div className="relative w-full max-w-lg">
                  {canStart && (
                    <div className="absolute -inset-3 animate-glow-breathe rounded-full bg-primary/20 blur-2xl" />
                  )}
                  <motion.button
                    whileHover={canStart ? { scale: 1.02, y: -2 } : {}}
                    whileTap={canStart ? { scale: 0.98 } : {}}
                    type="button"
                    onClick={handleStartGame}
                    disabled={!canStart}
                    className={`relative w-full rounded-2xl border-[3px] py-5 font-display text-xl font-black uppercase tracking-wider transition-all duration-500 shadow-xl sm:text-2xl ${
                      canStart
                        ? "border-primary bg-primary/10 text-primary cursor-pointer shadow-primary/20"
                        : "border-white/10 bg-white/5 text-white/20 cursor-not-allowed"
                    }`}
                    style={{
                      backdropFilter: "blur(20px)",
                      minHeight: 56,
                      textShadow: canStart ? "0 0 20px oklch(0.75 0.22 25 / 0.5)" : "none",
                    }}
                  >
                    {canStart ? "Start Game" : "Waiting for Players..."}
                  </motion.button>
                </div>
                <p className="font-body text-xs font-medium uppercase tracking-widest text-text-muted/60 sm:text-sm">
                  {playerCount < MIN_PLAYERS ? `Min ${MIN_PLAYERS} Players` : "All set!"}
                </p>
              </>
            ) : (
              <>
                {/* Non-host: Ready button + waiting message */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={handleToggleReady}
                  className={`w-full max-w-lg rounded-2xl border-[3px] py-5 font-display text-xl font-black uppercase tracking-wider transition-all duration-300 sm:text-2xl ${
                    amReady
                      ? "border-accent-5 bg-accent-5/15 text-accent-5 shadow-[0_0_20px_oklch(0.7_0.15_210/0.3)]"
                      : "border-white/20 bg-white/10 text-text-primary hover:border-primary/40 hover:bg-primary/10"
                  }`}
                  style={{ minHeight: 56, backdropFilter: "blur(20px)" }}
                >
                  {amReady ? "Ready!" : "Ready Up"}
                </motion.button>
                <p className="font-body text-sm text-text-muted/60">Waiting for host to start...</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
