"use client";

import type { Complexity, PlayerData } from "@flimflam/shared";
import { MIN_PLAYERS } from "@flimflam/shared";
import { AnimatedBackground, GameThemeProvider, GlassPanel, useGameTheme } from "@flimflam/ui";
import type { GameTheme } from "@flimflam/ui";
import { AnimatePresence, motion } from "framer-motion";
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
  "world-builder": "world-builder",
  "bluff-engine": "bluff-engine",
  "quick-draw": "quick-draw",
  "reality-drift": "reality-drift",
  "hot-take": "hot-take",
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
  hotTakePlayerInputEnabled,
  playerCount,
  onSelectGame,
  onSetComplexity,
  onSetHotTakePlayerInput,
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
  const showHotTakeToggle = selectedGameId === "hot-take";
  const effectiveHotTakePlayerInputEnabled =
    complexity === "advanced" ? true : complexity === "kids" ? false : hotTakePlayerInputEnabled;
  const hotTakeToggleDisabled = complexity !== "standard";

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

  return (
    <div className="relative flex min-h-screen flex-col p-8 lg:p-10">
      <AnimatedBackground variant="subtle" />

      {/* Top section: Room code + QR */}
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-8">
        {/* Room Code */}
        <div className="flex flex-col gap-3">
          <p className="font-body text-[24px] tracking-widest text-text-muted">
            JOIN AT{" "}
            <span className="text-accent-4">
              {controllerUrl ? controllerUrl.replace(/^https?:\/\//, "") : "(missing URL)"}
            </span>
          </p>
          <GlassPanel
            glow
            glowColor="oklch(0.72 0.22 25 / 0.2)"
            rounded="2xl"
            className="px-10 py-4"
          >
            <span className="font-mono text-[96px] leading-none tracking-[8px] text-text-primary">
              {roomCode}
            </span>
          </GlassPanel>
          <p className="font-body text-[24px] text-text-muted">Enter this code on your phone</p>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-3">
          <GlassPanel rounded="2xl" className="p-4">
            {qrDataUrl && (
              <img src={qrDataUrl} alt="QR code to join the game" className="h-[200px] w-[200px]" />
            )}
          </GlassPanel>
          <p className="font-body text-[24px] text-text-muted">Scan to join</p>
        </div>
      </div>

      {/* Player list */}
      <div className="relative z-10 my-6">
        <div className="mb-4 flex items-baseline gap-4">
          <h2 className="font-display text-[36px] font-bold text-text-primary">PLAYERS</h2>
          <span className="font-mono text-[28px] text-text-muted">{playerCount} / 8</span>
          {playerCount < MIN_PLAYERS && (
            <span className="font-body text-[22px] text-accent-3">
              (need {MIN_PLAYERS - playerCount} more)
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-6">
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
                  delay: index * 0.1,
                }}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className="flex h-[80px] w-[80px] items-center justify-center rounded-full text-[36px] font-bold text-bg-deep"
                  style={{
                    backgroundColor: player.avatarColor,
                    boxShadow: `0 0 20px ${player.avatarColor}50, 0 0 40px ${player.avatarColor}20`,
                  }}
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[100px] truncate font-body text-[20px] font-medium text-text-primary">
                  {player.name}
                </span>
                {player.ready && <span className="font-mono text-[16px] text-accent-5">Ready</span>}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty slots */}
          {Array.from({ length: Math.max(0, MIN_PLAYERS - playerCount) }, (_, i) => (
            <motion.div
              key={`empty-${i + 1}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="flex h-[80px] w-[80px] animate-glow-breathe items-center justify-center rounded-full border-2 border-dashed border-text-dim/40 text-[36px] text-text-dim/40">
                ?
              </div>
              <span className="font-body text-[20px] text-text-dim/40">Waiting...</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Game selection */}
      <div className="relative z-10 mb-4">
        <h2 className="mb-3 font-display text-[36px] font-bold text-text-primary">SELECT GAME</h2>
        <GameSelector selectedGameId={selectedGameId} onSelect={onSelectGame} />
      </div>

      {/* Complexity picker */}
      <div className="relative z-10 mb-4">
        <h2 className="mb-3 font-display text-[36px] font-bold text-text-primary">DIFFICULTY</h2>
        <ComplexityPicker complexity={complexity} onChange={onSetComplexity} />
      </div>

      {showHotTakeToggle && (
        <GlassPanel glow rounded="2xl" className="relative z-10 mb-4 p-6">
          <div className="mb-3 flex items-center justify-between gap-6">
            <div>
              <h3 className="font-display text-[28px] font-bold text-text-primary">
                AI PLAYER INPUT
              </h3>
              <p className="font-body text-[20px] text-text-muted">
                Players submit topics and AI tailors prompts to the group.
              </p>
            </div>
            <button
              type="button"
              disabled={hotTakeToggleDisabled}
              onClick={() => onSetHotTakePlayerInput(!effectiveHotTakePlayerInputEnabled)}
              className={`relative h-14 w-28 rounded-full border-2 transition-all ${
                effectiveHotTakePlayerInputEnabled
                  ? "border-accent-5 bg-accent-5/30"
                  : "border-text-dim/30 bg-bg-dark"
              } ${hotTakeToggleDisabled ? "cursor-not-allowed opacity-50" : "hover:scale-[1.03]"}`}
              aria-pressed={effectiveHotTakePlayerInputEnabled}
              aria-label="Toggle Hot Take player input mode"
            >
              <span
                className={`absolute top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-text-primary transition-all ${
                  effectiveHotTakePlayerInputEnabled ? "left-[52px]" : "left-2"
                }`}
              />
            </button>
          </div>
          <p className="font-body text-[18px] text-text-muted">
            {complexity === "advanced" && "Advanced mode always enables player input."}
            {complexity === "kids" && "Kids mode always uses static prompts."}
            {complexity === "standard" &&
              (effectiveHotTakePlayerInputEnabled
                ? "Enabled for this game."
                : "Disabled - Hot Take will use static prompts.")}
          </p>
        </GlassPanel>
      )}

      {/* Start game button */}
      <div className="relative z-10 mt-auto flex justify-center pb-6">
        <motion.button
          whileHover={canStart ? { scale: 1.03 } : {}}
          whileTap={canStart ? { scale: 0.97 } : {}}
          type="button"
          onClick={onStartGame}
          disabled={!canStart}
          aria-label="Start the game"
          className="w-full max-w-2xl rounded-2xl border border-primary/50 bg-white/[0.04] px-20 py-6 font-display text-[42px] font-bold text-primary transition-all duration-300 hover:border-primary hover:shadow-[0_0_40px_oklch(0.72_0.22_25/0.3)] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-primary/50 disabled:hover:shadow-none"
          style={{
            backdropFilter: "blur(16px)",
          }}
        >
          {canStart ? "START GAME" : "WAITING FOR PLAYERS..."}
        </motion.button>
      </div>
    </div>
  );
}
