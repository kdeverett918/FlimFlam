"use client";

import type { Complexity, PlayerData } from "@partyline/shared";
import { MIN_PLAYERS } from "@partyline/shared";
import { AnimatePresence, motion } from "framer-motion";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
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

export function LobbyScreen({
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
  const [qrSvg, setQrSvg] = useState<string>("");
  const qrGenerated = useRef(false);

  const controllerUrl =
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_CONTROLLER_URL ?? "http://localhost:3001")
      : "http://localhost:3001";

  const joinUrl = `${controllerUrl}?code=${roomCode}`;
  const canStart = playerCount >= MIN_PLAYERS && selectedGameId !== "";
  const showHotTakeToggle = selectedGameId === "hot-take";
  const effectiveHotTakePlayerInputEnabled =
    complexity === "advanced" ? true : complexity === "kids" ? false : hotTakePlayerInputEnabled;
  const hotTakeToggleDisabled = complexity !== "standard";

  useEffect(() => {
    if (qrGenerated.current && qrSvg) return;
    qrGenerated.current = true;

    QRCode.toString(joinUrl, {
      type: "svg",
      color: {
        dark: "#e8e6f0",
        light: "#00000000",
      },
      margin: 1,
      width: 200,
    })
      .then((svg) => setQrSvg(svg))
      .catch(console.error);
  }, [joinUrl, qrSvg]);

  return (
    <div className="flex min-h-screen flex-col p-8 lg:p-12">
      {/* Top section: Room code + QR */}
      <div className="flex flex-wrap items-start justify-between gap-8">
        {/* Room Code */}
        <div className="flex flex-col gap-4">
          <p className="text-[28px] font-medium tracking-widest text-text-muted">
            JOIN AT{" "}
            <span className="text-accent-2">{controllerUrl.replace(/^https?:\/\//, "")}</span>
          </p>
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border-2 border-accent-2/30 bg-bg-card px-10 py-4">
              <span className="font-display text-[120px] leading-none tracking-[0.2em] text-text-primary">
                {roomCode}
              </span>
            </div>
          </div>
          <p className="text-[24px] text-text-muted">Enter this code on your phone</p>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="rounded-2xl border-2 border-accent-2/20 bg-bg-card p-4"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: QR code SVG from trusted library
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <p className="text-[20px] text-text-muted">Scan to join</p>
        </div>
      </div>

      {/* Player list */}
      <div className="my-8">
        <div className="mb-4 flex items-baseline gap-4">
          <h2 className="font-display text-[36px] text-text-primary">PLAYERS</h2>
          <span className="text-[28px] text-text-muted">{playerCount} / 8</span>
          {playerCount < MIN_PLAYERS && (
            <span className="text-[24px] text-accent-3">
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
                  className="flex h-[80px] w-[80px] items-center justify-center rounded-full text-[36px] font-bold text-bg-dark shadow-lg"
                  style={{
                    backgroundColor: player.avatarColor,
                    boxShadow: `0 0 20px ${player.avatarColor}40`,
                  }}
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[100px] truncate text-[22px] font-medium text-text-primary">
                  {player.name}
                </span>
                {player.ready && <span className="text-[18px] text-accent-2">Ready</span>}
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
              <div className="flex h-[80px] w-[80px] items-center justify-center rounded-full border-2 border-dashed border-text-muted/30 text-[36px] text-text-muted/30">
                ?
              </div>
              <span className="text-[22px] text-text-muted/30">Waiting...</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Game selection */}
      <div className="mb-6">
        <h2 className="mb-4 font-display text-[36px] text-text-primary">SELECT GAME</h2>
        <GameSelector selectedGameId={selectedGameId} onSelect={onSelectGame} />
      </div>

      {/* Complexity picker */}
      <div className="mb-8">
        <h2 className="mb-4 font-display text-[36px] text-text-primary">DIFFICULTY</h2>
        <ComplexityPicker complexity={complexity} onChange={onSetComplexity} />
      </div>

      {showHotTakeToggle && (
        <div className="mb-8 rounded-2xl border-2 border-accent-2/30 bg-bg-card p-6">
          <div className="mb-3 flex items-center justify-between gap-6">
            <div>
              <h3 className="font-display text-[30px] text-text-primary">AI PLAYER INPUT</h3>
              <p className="text-[20px] text-text-muted">
                Players submit topics and AI tailors prompts to the group.
              </p>
            </div>
            <button
              type="button"
              disabled={hotTakeToggleDisabled}
              onClick={() => onSetHotTakePlayerInput(!effectiveHotTakePlayerInputEnabled)}
              className={`relative h-14 w-28 rounded-full border-2 transition-all ${
                effectiveHotTakePlayerInputEnabled
                  ? "border-accent-2 bg-accent-2/30"
                  : "border-text-muted/30 bg-bg-dark"
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
          <p className="text-[18px] text-text-muted">
            {complexity === "advanced" && "Advanced mode always enables player input."}
            {complexity === "kids" && "Kids mode always uses static prompts."}
            {complexity === "standard" &&
              (effectiveHotTakePlayerInputEnabled
                ? "Enabled for this game."
                : "Disabled - Hot Take will use static prompts.")}
          </p>
        </div>
      )}

      {/* Start game button */}
      <div className="mt-auto flex justify-center pb-8">
        <button
          type="button"
          onClick={onStartGame}
          disabled={!canStart}
          className="rounded-2xl border-2 border-accent-2/50 bg-accent-2/10 px-20 py-6 font-display text-[42px] text-accent-2 transition-all duration-300 hover:border-accent-2 hover:bg-accent-2/20 hover:shadow-[0_0_40px_oklch(0.83_0.18_195/0.3)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-accent-2/50 disabled:hover:bg-accent-2/10 disabled:hover:shadow-none"
        >
          {canStart ? "START GAME" : "WAITING FOR PLAYERS..."}
        </button>
      </div>
    </div>
  );
}
