"use client";

import type { PlayerData } from "@flimflam/shared";
import { MAX_PLAYERS } from "@flimflam/shared";
import { GlassPanel, haptics } from "@flimflam/ui";
import { Crown, Wifi, WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";

interface PlayerListProps {
  players: PlayerData[];
  isHost: boolean;
  mySessionId: string | null;
  sendMessage: (type: string, data?: Record<string, unknown>) => void;
}

export function PlayerList({ players, isHost, mySessionId, sendMessage }: PlayerListProps) {
  const [transferTarget, setTransferTarget] = useState<string | null>(null);

  const handlePlayerTap = useCallback(
    (sessionId: string) => {
      if (!isHost || sessionId === mySessionId) return;
      haptics.tap();
      setTransferTarget((prev) => (prev === sessionId ? null : sessionId));
    },
    [isHost, mySessionId],
  );

  const handleTransferHost = useCallback(
    (sessionId: string) => {
      haptics.confirm();
      sendMessage("host:transfer", { targetSessionId: sessionId });
      setTransferTarget(null);
    },
    [sendMessage],
  );

  const emptySlots = Math.max(0, MAX_PLAYERS - players.length);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-6 rounded-full bg-primary shadow-[0_0_10px_var(--color-primary)]" />
          <h2 className="font-display text-lg font-black uppercase tracking-tight text-text-primary sm:text-xl lg:text-[28px]">
            Players
          </h2>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1">
          <span className="font-mono text-base font-bold leading-none text-text-primary sm:text-lg">
            {players.length}
          </span>
          <span className="text-text-muted/50">/</span>
          <span className="font-mono text-base leading-none text-text-muted sm:text-lg">
            {MAX_PLAYERS}
          </span>
        </div>
      </div>

      {/* Player grid — horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide sm:grid sm:grid-cols-4 sm:overflow-visible lg:grid-cols-4 xl:grid-cols-8">
        <AnimatePresence mode="popLayout">
          {players.map((player, index) => {
            const isMe = player.sessionId === mySessionId;
            const isTransferTarget = transferTarget === player.sessionId;

            return (
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
                className="relative flex shrink-0 min-w-[80px] flex-col items-center gap-2"
              >
                {/* Avatar */}
                <button
                  type="button"
                  onClick={() => handlePlayerTap(player.sessionId)}
                  disabled={!isHost || isMe}
                  className="group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
                  aria-label={`${player.name}${player.isHost ? " (Host)" : ""}`}
                >
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-black text-bg-deep border-[3px] border-white/20 transition-transform duration-300 group-hover:scale-105 sm:h-20 sm:w-20 sm:text-3xl"
                    style={{
                      backgroundColor: player.avatarColor,
                      boxShadow: `0 0 20px ${player.avatarColor}60`,
                    }}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Pulsing ring for new joins */}
                  {player.ready && (
                    <div
                      className="absolute -inset-1.5 animate-pulse rounded-full"
                      style={{ border: `2px solid ${player.avatarColor}` }}
                      aria-hidden="true"
                    />
                  )}

                  {/* Host crown */}
                  {player.isHost && (
                    <div className="absolute -right-1 -top-1 animate-crown-pulse" aria-label="Host">
                      <Crown className="h-5 w-5 fill-accent-3 text-accent-3 drop-shadow-lg" />
                    </div>
                  )}

                  {/* Connection indicator */}
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-bg-deep ${
                      player.connected ? "bg-success" : "bg-destructive"
                    }`}
                  >
                    {player.connected ? (
                      <Wifi className="h-2.5 w-2.5 text-white" />
                    ) : (
                      <WifiOff className="h-2.5 w-2.5 text-white" />
                    )}
                  </div>
                </button>

                {/* Name */}
                <span className="w-20 truncate text-center font-display text-sm font-bold leading-tight text-text-primary sm:text-base">
                  {player.name}
                  {isMe && <span className="text-text-dim text-xs"> (you)</span>}
                </span>

                {/* Ready badge */}
                {player.ready && (
                  <span className="rounded-full border border-accent-5/30 bg-accent-5/20 px-2 py-0.5 font-mono text-[11px] font-bold uppercase text-accent-5">
                    Ready
                  </span>
                )}

                {/* Transfer host popover */}
                <AnimatePresence>
                  {isTransferTarget && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.9 }}
                      className="absolute -bottom-12 z-20"
                    >
                      <GlassPanel rounded="xl" className="border border-white/20 px-3 py-1.5">
                        <button
                          type="button"
                          onClick={() => handleTransferHost(player.sessionId)}
                          className="flex items-center gap-1.5 font-display text-xs font-bold uppercase text-accent-3 whitespace-nowrap"
                        >
                          <Crown className="h-3.5 w-3.5" />
                          Make Host
                        </button>
                      </GlassPanel>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {/* Empty slot placeholders */}
          {Array.from({ length: emptySlots }, (_, i) => (
            <motion.div
              key={`empty-${i + 1}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              className="flex shrink-0 min-w-[80px] flex-col items-center gap-2"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-dashed border-text-dim/30 text-2xl text-text-dim/30 sm:h-20 sm:w-20 sm:text-3xl">
                ?
              </div>
              <div className="h-4 w-16 rounded-full bg-white/5" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
