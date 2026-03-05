"use client";

import type { PlayerData } from "@flimflam/shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  GlassPanel,
  haptics,
} from "@flimflam/ui";
import { ChevronDown, ChevronUp, Crown, RotateCcw, SkipForward, Square } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";

interface HostControlBarProps {
  isHost: boolean;
  phase: string;
  players: PlayerData[];
  sendMessage: (type: string, data?: Record<string, unknown>) => void;
}

export function HostControlBar({ isHost, phase, players, sendMessage }: HostControlBarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showTransferPicker, setShowTransferPicker] = useState(false);

  const isFinalScores = phase === "final-scores";

  const handleSkip = useCallback(() => {
    haptics.tap();
    sendMessage("host:skip");
  }, [sendMessage]);

  const handleEndGame = useCallback(() => {
    haptics.warn();
    setShowEndConfirm(true);
  }, []);

  const confirmEndGame = useCallback(() => {
    haptics.confirm();
    sendMessage("host:end-game");
    setShowEndConfirm(false);
  }, [sendMessage]);

  const handleRestart = useCallback(() => {
    haptics.confirm();
    sendMessage("host:restart-game");
  }, [sendMessage]);

  const handleTransferHost = useCallback(
    (targetSessionId: string) => {
      haptics.confirm();
      sendMessage("host:transfer", { targetSessionId });
      setShowTransferPicker(false);
    },
    [sendMessage],
  );

  if (!isHost) return null;

  return (
    <>
      {/* Floating control bar */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <GlassPanel
          rounded="2xl"
          className="border-2 border-white/15 bg-bg-deep/80 shadow-2xl backdrop-blur-xl"
        >
          {/* Collapse toggle */}
          <button
            type="button"
            onClick={() => {
              haptics.tap();
              setCollapsed((prev) => !prev);
            }}
            className="flex w-full items-center justify-center gap-1 px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-text-muted hover:text-text-primary transition-colors"
            aria-label={collapsed ? "Expand host controls" : "Collapse host controls"}
          >
            <Crown className="h-3.5 w-3.5 text-accent-3" />
            <span>Host</span>
            {collapsed ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-2 px-3 pb-3">
                  {/* Skip */}
                  {!isFinalScores && (
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="flex h-10 min-w-[48px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 font-display text-xs font-bold uppercase tracking-wider text-text-primary transition-all hover:border-white/20 hover:bg-white/10 active:scale-95"
                    >
                      <SkipForward className="h-4 w-4" />
                      Skip
                    </button>
                  )}

                  {/* End Game */}
                  {!isFinalScores && (
                    <button
                      type="button"
                      onClick={handleEndGame}
                      className="flex h-10 min-w-[48px] items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 font-display text-xs font-bold uppercase tracking-wider text-destructive transition-all hover:border-destructive/50 hover:bg-destructive/20 active:scale-95"
                    >
                      <Square className="h-3.5 w-3.5" />
                      End Game
                    </button>
                  )}

                  {/* Restart (only during final-scores) */}
                  {isFinalScores && (
                    <button
                      type="button"
                      onClick={handleRestart}
                      className="flex h-10 min-w-[48px] items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 font-display text-xs font-bold uppercase tracking-wider text-primary transition-all hover:border-primary/50 hover:bg-primary/20 active:scale-95"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Play Again
                    </button>
                  )}

                  {/* Transfer Host */}
                  <button
                    type="button"
                    onClick={() => {
                      haptics.tap();
                      setShowTransferPicker(true);
                    }}
                    className="flex h-10 min-w-[48px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 font-display text-xs font-bold uppercase tracking-wider text-text-muted transition-all hover:border-accent-3/30 hover:bg-accent-3/10 hover:text-accent-3 active:scale-95"
                  >
                    <Crown className="h-4 w-4" />
                    Transfer
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassPanel>
      </motion.div>

      {/* End Game confirmation dialog */}
      <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <DialogContent className="max-w-sm" style={{ width: "min(calc(100vw - 2rem), 24rem)" }}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-text-primary">
              End Game?
            </DialogTitle>
            <DialogDescription className="font-body text-sm text-text-muted">
              This will end the current game for all players and return to the lobby.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setShowEndConfirm(false)}
              className="h-10 rounded-xl border-2 border-white/20 bg-bg-surface/90 px-4 font-display text-sm uppercase tracking-wider text-text-primary backdrop-blur transition-all hover:bg-bg-surface active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmEndGame}
              className="h-10 rounded-xl bg-destructive px-5 font-display text-sm font-bold uppercase tracking-wider text-white transition-all hover:shadow-[0_0_20px_oklch(0.62_0.22_25/0.4)] active:scale-95"
            >
              End Game
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Host picker dialog */}
      <Dialog open={showTransferPicker} onOpenChange={setShowTransferPicker}>
        <DialogContent className="max-w-sm" style={{ width: "min(calc(100vw - 2rem), 24rem)" }}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-text-primary">
              Transfer Host
            </DialogTitle>
            <DialogDescription className="font-body text-sm text-text-muted">
              Choose a player to make the new host.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            {players
              .filter((p) => !p.isHost && p.connected)
              .map((p) => (
                <button
                  key={p.sessionId}
                  type="button"
                  onClick={() => handleTransferHost(p.sessionId)}
                  className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 transition-all hover:border-accent-3/30 hover:bg-accent-3/10 active:scale-98"
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-bg-deep"
                    style={{ backgroundColor: p.avatarColor }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-display text-sm font-bold text-text-primary">{p.name}</span>
                  <Crown className="ml-auto h-4 w-4 text-accent-3/50" />
                </button>
              ))}
            {players.filter((p) => !p.isHost && p.connected).length === 0 && (
              <p className="py-4 text-center font-body text-sm text-text-muted">
                No other connected players
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
