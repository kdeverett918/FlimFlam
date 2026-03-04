"use client";

import type { Complexity, PlayerData } from "@flimflam/shared";
import { MIN_PLAYERS } from "@flimflam/shared";
import { AnimatedBackground, GameThemeProvider, GlassPanel, useGameTheme } from "@flimflam/ui";
import type { GameTheme } from "@flimflam/ui";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { ComplexityPicker } from "./ComplexityPicker";
import { GameSelector } from "./GameSelector";

interface LobbyScreenProps {
  roomCode: string;
  players: PlayerData[];
  selectedGameId: string;
  complexity: Complexity;
  hotTakePlayerInputEnabled: boolean;
  playerCount: number;
  onSelectGame: (gameId: string) => void;
  onSetComplexity: (complexity: Complexity) => void;
  onSetHotTakePlayerInput: (enabled: boolean) => void;
  onStartGame: () => void;
}

const GAME_ID_TO_THEME: Record<string, GameTheme> = {
  "brain-board": "brain-board",
  "lucky-letters": "lucky-letters",
  "survey-smash": "survey-smash",
};

export function LobbyScreen(props: LobbyScreenProps) {
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
  playerCount,
  onSelectGame,
  onSetComplexity,
  onStartGame,
}: LobbyScreenProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const { setTheme } = useGameTheme();

  const controllerUrlFromEnv =
    typeof window !== "undefined" ? process.env.NEXT_PUBLIC_CONTROLLER_URL : undefined;
  const controllerUrl =
    controllerUrlFromEnv ??
    (process.env.NODE_ENV === "production" ? "https://play.flimflam.gg" : "http://localhost:3001");

  const joinUrl = controllerUrl ? `${controllerUrl}?code=${roomCode}` : "";
  const canStart = playerCount >= MIN_PLAYERS && selectedGameId !== "";

  useEffect(() => {
    const theme = GAME_ID_TO_THEME[selectedGameId] ?? "default";
    setTheme(theme);
  }, [selectedGameId, setTheme]);

  useEffect(() => {
    if (!joinUrl) return;
    let cancelled = false;
    QRCode.toDataURL(joinUrl, {
      color: {
        dark: "#f0ede6",
        light: "#00000000",
      },
      margin: 1,
      width: 200,
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [joinUrl]);

  const codeChars = roomCode.split("");

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <AnimatedBackground variant="subtle" />

      {/* Main container with max-width for consistent AAA feel */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-12 p-6 sm:p-10 md:p-16">
        {/* Logo header */}
        <div className="flex justify-center">
          <Image
            src="/flimflam-logo.png"
            alt="FLIMFLAM Party Game"
            width={688}
            height={384}
            priority
            className="h-auto w-full max-w-[480px] object-contain drop-shadow-[0_0_40px_oklch(0.75_0.22_25/0.3)]"
          />
        </div>

        {/* Top section: Room code + QR */}
        <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-12">
          {/* Room Code */}
          <div className="flex flex-col items-center lg:items-start gap-4 text-center lg:text-left">
            <p className="font-body text-[20px] sm:text-[24px] tracking-[0.2em] text-text-muted uppercase">
              JOIN AT{" "}
              <span className="text-accent-4 font-bold">
                {controllerUrl ? controllerUrl.replace(/^https?:\/\//, "") : "(missing URL)"}
              </span>
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-3 sm:gap-4">
              {codeChars.map((char, i) => (
                <motion.span
                  // biome-ignore lint/suspicious/noArrayIndexKey: Character positions in code are stable
                  key={`code-${char}-${i}`}
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 20,
                    delay: 0.2 + i * 0.08,
                  }}
                  className="flex items-center justify-center rounded-2xl border-2 border-white/15 bg-white/10 backdrop-blur-xl"
                  style={{
                    width: "clamp(64px, 15vw, 100px)",
                    height: "clamp(80px, 18vw, 120px)",
                    boxShadow: "0 0 30px oklch(0.75 0.22 25 / 0.15)",
                  }}
                >
                  <span
                    className="font-mono font-black leading-none text-text-primary"
                    style={{ fontSize: "clamp(48px, 10vw, 84px)" }}
                  >
                    {char}
                  </span>
                </motion.span>
              ))}
            </div>
            <p className="font-body text-[20px] sm:text-[24px] text-text-muted/80">
              Enter this code on your mobile device
            </p>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-4">
            <div className="group relative">
              {/* Decorative glow behind QR */}
              <div className="absolute -inset-4 rounded-3xl bg-primary/20 blur-2xl transition-opacity group-hover:opacity-100 opacity-60" />
              <GlassPanel
                rounded="2xl"
                className="relative p-5 border-2 border-white/20 bg-white/10"
              >
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR code to join the game"
                    className="h-[180px] w-[180px] sm:h-[220px] sm:w-[220px]"
                  />
                ) : (
                  <div className="h-[220px] w-[220px] animate-pulse bg-white/5 rounded-xl" />
                )}
              </GlassPanel>
            </div>
            <p className="font-body text-[20px] sm:text-[24px] font-medium text-text-muted uppercase tracking-wider">
              Scan to join
            </p>
          </div>
        </div>

        {/* Player list section */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-2 w-8 rounded-full bg-primary shadow-[0_0_12px_var(--color-primary)]" />
              <h2 className="font-display text-[32px] sm:text-[42px] font-black text-text-primary tracking-tight">
                PLAYERS
              </h2>
            </div>
            <div className="flex items-center gap-3 rounded-full bg-white/5 border border-white/10 px-6 py-2">
              <span className="font-mono text-[24px] sm:text-[32px] font-bold text-text-primary leading-none">
                {playerCount}
              </span>
              <span className="text-text-muted/50 text-2xl">/</span>
              <span className="font-mono text-[24px] sm:text-[32px] text-text-muted leading-none">
                8
              </span>
            </div>
          </div>

          {playerCount < MIN_PLAYERS && (
            <div className="flex items-center gap-3 text-accent-3 animate-pulse">
              <div className="h-2 w-2 rounded-full bg-accent-3" />
              <span className="font-body text-[20px] sm:text-[22px] font-medium">
                Wait for {MIN_PLAYERS - playerCount} more player
                {MIN_PLAYERS - playerCount > 1 ? "s" : ""} to start
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-8 py-4">
            <AnimatePresence mode="popLayout">
              {players.map((player, index) => (
                <motion.div
                  key={player.sessionId}
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    delay: index * 0.05,
                  }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="relative group">
                    <div
                      className="flex h-[90px] w-[90px] sm:h-[110px] sm:w-[110px] items-center justify-center rounded-full text-[40px] sm:text-[50px] font-black text-bg-deep border-4 border-white/20 transition-transform duration-300 group-hover:scale-110"
                      style={{
                        backgroundColor: player.avatarColor,
                        boxShadow: `0 0 30px ${player.avatarColor}60`,
                      }}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    {/* Pulsing ring for ready players */}
                    {player.ready && (
                      <div
                        className="absolute -inset-2 rounded-full animate-pulse-ring"
                        style={{
                          border: `3px solid ${player.avatarColor}`,
                        }}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <span className="w-full text-center truncate font-display text-[22px] sm:text-[26px] font-bold text-text-primary leading-tight">
                    {player.name}
                  </span>
                  {player.ready && (
                    <span className="rounded-full bg-accent-5/20 border border-accent-5/30 px-3 py-0.5 font-mono text-[14px] font-bold text-accent-5 uppercase">
                      Ready
                    </span>
                  )}
                </motion.div>
              ))}

              {/* Empty slots placeholders */}
              {Array.from({ length: Math.max(0, 8 - playerCount) }, (_, i) => (
                <motion.div
                  key={`empty-${i + 1}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="flex h-[90px] w-[90px] sm:h-[110px] sm:w-[110px] items-center justify-center rounded-full border-4 border-dashed border-text-dim/30 text-[40px] text-text-dim/30">
                    ?
                  </div>
                  <div className="h-6 w-24 bg-white/5 rounded-full" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Game selection section */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="h-2 w-8 rounded-full bg-primary shadow-[0_0_12px_var(--color-primary)]" />
            <h2 className="font-display text-[32px] sm:text-[42px] font-black text-text-primary tracking-tight">
              SELECT GAME
            </h2>
          </div>
          <GameSelector selectedGameId={selectedGameId} onSelect={onSelectGame} />
        </div>

        {/* Configuration section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          {/* Difficulty */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="h-2 w-8 rounded-full bg-primary shadow-[0_0_12px_var(--color-primary)]" />
              <h2 className="font-display text-[32px] sm:text-[42px] font-black text-text-primary tracking-tight">
                DIFFICULTY
              </h2>
            </div>
            <ComplexityPicker complexity={complexity} onChange={onSetComplexity} />
          </div>
        </div>

        {/* Start game button section */}
        <div className="mt-8 flex flex-col items-center gap-6 pb-12">
          <div className="relative w-full max-w-3xl">
            {/* Animated background glow for start button */}
            {canStart && (
              <div className="absolute -inset-4 bg-primary/20 blur-3xl animate-glow-breathe rounded-full" />
            )}

            <motion.button
              whileHover={canStart ? { scale: 1.02, y: -4 } : {}}
              whileTap={canStart ? { scale: 0.98 } : {}}
              type="button"
              onClick={onStartGame}
              disabled={!canStart}
              className={`relative w-full rounded-3xl border-4 py-8 font-display text-[32px] sm:text-[48px] font-black tracking-wider transition-all duration-500 shadow-2xl ${
                canStart
                  ? "border-primary text-primary bg-primary/10 cursor-pointer shadow-primary/20"
                  : "border-white/10 text-white/20 bg-white/5 cursor-not-allowed"
              }`}
              style={{
                backdropFilter: "blur(20px)",
                textShadow: canStart ? "0 0 20px oklch(0.75 0.22 25 / 0.5)" : "none",
              }}
            >
              {canStart ? (
                <div className="flex items-center justify-center gap-4">
                  <span className="animate-pulse">START GAME</span>
                </div>
              ) : (
                "WAITING FOR PLAYERS..."
              )}
            </motion.button>
          </div>
          <p className="font-body text-[20px] sm:text-[24px] font-medium text-text-muted/60 uppercase tracking-widest">
            {playerCount < MIN_PLAYERS ? `Min ${MIN_PLAYERS} Players` : "All set!"}
          </p>
        </div>
      </div>
    </div>
  );
}
