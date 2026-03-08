"use client";

import type { PlayerData } from "@flimflam/shared";
import { MAX_PLAYERS } from "@flimflam/shared";
import { ConfettiBurst, GlassPanel, haptics, sounds, useReducedMotion } from "@flimflam/ui";
import { Crown, Wifi, WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface PlayerArenaProps {
  players: PlayerData[];
  isHost: boolean;
  mySessionId: string | null;
  sendMessage: (type: string, data?: Record<string, unknown>) => void;
}

export function PlayerArena({ players, isHost, mySessionId, sendMessage }: PlayerArenaProps) {
  const [transferTarget, setTransferTarget] = useState<string | null>(null);
  const [celebratingId, setCelebratingId] = useState<string | null>(null);
  const prevPlayerIdsRef = useRef<Set<string>>(new Set());
  const reducedMotion = useReducedMotion();

  // Detect new player joins for celebration
  useEffect(() => {
    const currentIds = new Set(players.map((p) => p.sessionId));
    const prevIds = prevPlayerIdsRef.current;

    for (const id of currentIds) {
      if (!prevIds.has(id)) {
        // New player joined — trigger celebration
        setCelebratingId(id);
        if (!reducedMotion) {
          sounds.correct();
          haptics.celebrate();
        }
        const timeout = setTimeout(() => setCelebratingId(null), 800);
        // Only celebrate the most recent join
        prevPlayerIdsRef.current = currentIds;
        return () => clearTimeout(timeout);
      }
    }

    prevPlayerIdsRef.current = currentIds;
  }, [players, reducedMotion]);

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
          <h2 className="font-display text-lg font-black uppercase tracking-tight text-text-primary sm:text-xl">
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

      {/* Player grid */}
      <div
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide sm:grid sm:grid-cols-4 sm:overflow-visible lg:grid-cols-4 xl:grid-cols-8"
        data-testid="lobby-player-list"
      >
        <AnimatePresence mode="popLayout">
          {players.map((player, index) => {
            const isMe = player.sessionId === mySessionId;
            const isTransferTarget = transferTarget === player.sessionId;
            const isCelebrating = celebratingId === player.sessionId;

            return (
              <motion.div
                key={player.sessionId}
                initial={reducedMotion ? false : { opacity: 0, scale: 0.3, y: 40 }}
                animate={{
                  opacity: 1,
                  scale: isCelebrating && !reducedMotion ? 1.05 : 1,
                  y: 0,
                }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                  delay: index * 0.05,
                }}
                className="relative flex shrink-0 min-w-[80px] flex-col items-center gap-2"
              >
                {/* Portal ring on join */}
                {isCelebrating && !reducedMotion && (
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-16 w-16 sm:h-20 sm:w-20 rounded-full border-primary animate-portal-ring pointer-events-none"
                    style={{ borderStyle: "solid" }}
                    aria-hidden="true"
                  />
                )}

                {/* Confetti on join */}
                <ConfettiBurst
                  trigger={isCelebrating}
                  preset="correct"
                  origin={{ x: 0.5, y: 0.3 }}
                />

                {/* Avatar */}
                <button
                  type="button"
                  onClick={() => handlePlayerTap(player.sessionId)}
                  disabled={!isHost || isMe}
                  className="group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
                  aria-label={`${player.name}${player.isHost ? " (Host)" : ""}`}
                >
                  <motion.div
                    className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl font-black text-bg-deep border-[3px] transition-transform duration-300 group-hover:scale-105 sm:h-20 sm:w-20 sm:text-3xl ${
                      !reducedMotion ? "animate-avatar-bob" : ""
                    }`}
                    style={{
                      backgroundColor: player.avatarColor,
                      boxShadow: `0 0 20px ${player.avatarColor}60`,
                      animationDelay: `${index * 0.4}s`,
                      borderColor: player.ready ? "oklch(0.72 0.18 150)" : "oklch(1 0 0 / 0.2)",
                    }}
                    initial={isCelebrating && !reducedMotion ? { y: 40, opacity: 0 } : false}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 15,
                    }}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </motion.div>

                  {/* Ready ring */}
                  {player.ready && (
                    <div
                      className="absolute -inset-1.5 rounded-full animate-result-correct"
                      style={{ border: "2px solid oklch(0.72 0.18 150)" }}
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
                    aria-label={`${player.name} ${player.connected ? "connected" : "disconnected"}`}
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
                  <motion.span
                    initial={reducedMotion ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 15,
                    }}
                    className="rounded-full border border-success/30 bg-success/20 px-2 py-0.5 font-mono text-[11px] font-bold uppercase text-success"
                    aria-label={`${player.name} ready`}
                  >
                    Ready
                  </motion.span>
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

          {/* Empty slot ghosts */}
          {Array.from({ length: emptySlots }, (_, i) => (
            <motion.div
              key={`empty-${i + 1}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex shrink-0 min-w-[80px] flex-col items-center gap-2"
              data-testid="empty-player-slot"
            >
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-dashed border-text-dim/20 text-2xl text-text-dim/20 sm:h-20 sm:w-20 sm:text-3xl ${
                  !reducedMotion ? "animate-glow-breathe" : ""
                }`}
                style={{ opacity: 0.4 }}
              >
                ?
              </div>
              {i === 0 && emptySlots > 0 && (
                <span className="w-20 truncate text-center font-body text-[10px] text-text-dim/40">
                  Invite a friend
                </span>
              )}
              {i > 0 && <div className="h-4 w-16 rounded-full bg-white/5" />}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
