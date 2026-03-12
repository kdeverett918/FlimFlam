"use client";

import { haptics, useReducedMotion } from "@flimflam/ui";
import { Home, Menu, Settings, SkipForward, StopCircle, Volume2, X } from "lucide-react";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { createContext, useCallback, useContext, useState } from "react";
import { LeaveGameDialog } from "./LeaveGameDialog";

/* ----------------------------------------------------------------
   Context for controlling the menu from anywhere
   ---------------------------------------------------------------- */

interface PlayerMenuContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const PlayerMenuContext = createContext<PlayerMenuContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
});

export function usePlayerMenu() {
  return useContext(PlayerMenuContext);
}

export function PlayerMenuProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <PlayerMenuContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </PlayerMenuContext.Provider>
  );
}

/* ----------------------------------------------------------------
   Menu Trigger Button
   ---------------------------------------------------------------- */

export function MenuTrigger({ className }: { className?: string }) {
  const { toggle, isOpen } = usePlayerMenu();

  return (
    <button
      type="button"
      onClick={() => {
        haptics.tap();
        toggle();
      }}
      className={`flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/8 text-text-muted backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-text-primary active:scale-[0.95] ${className ?? ""}`}
      aria-label={isOpen ? "Close menu" : "Open menu"}
    >
      {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </button>
  );
}

/* ----------------------------------------------------------------
   Player Menu Bottom Sheet
   ---------------------------------------------------------------- */

interface PlayerMenuSheetProps {
  roomCode: string | null;
  playerCount: number;
  gameName: string | null;
  isHost: boolean;
  isInGame: boolean;
  onLeave: () => void;
  onSkipRound?: () => void;
  onEndGame?: () => void;
}

export function PlayerMenuSheet({
  roomCode,
  playerCount,
  gameName,
  isHost,
  isInGame,
  onLeave,
  onSkipRound,
  onEndGame,
}: PlayerMenuSheetProps) {
  const { isOpen, close } = usePlayerMenu();
  const reducedMotion = useReducedMotion();
  const dragControls = useDragControls();
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [betaMode, setBetaMode] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("flimflam_beta_mode") === "true";
    } catch {
      return false;
    }
  });

  const handleLeaveClick = useCallback(() => {
    if (isInGame) {
      setLeaveDialogOpen(true);
    } else {
      onLeave();
    }
  }, [isInGame, onLeave]);

  const handleToggleBeta = useCallback(() => {
    haptics.tap();
    setBetaMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("flimflam_beta_mode", String(next));
      } catch {}
      return next;
    });
  }, []);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] bg-black/60"
              onClick={close}
              onKeyDown={(e) => {
                if (e.key === "Escape") close();
              }}
            />

            {/* Sheet */}
            <motion.div
              initial={reducedMotion ? { opacity: 0 } : { y: "100%" }}
              animate={reducedMotion ? { opacity: 1 } : { y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { y: "100%" }}
              transition={
                reducedMotion
                  ? { duration: 0.15 }
                  : { type: "spring", damping: 30, stiffness: 300 }
              }
              drag={reducedMotion ? false : "y"}
              dragControls={dragControls}
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(_e, info) => {
                if (info.offset.y > 100) close();
              }}
              className="fixed inset-x-0 bottom-0 z-[61] max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-white/[0.12] bg-bg-surface/95 backdrop-blur-2xl"
              style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
            >
              {/* Drag handle */}
              <div className="flex justify-center py-3">
                <div className="h-1.5 w-10 rounded-full bg-white/20" />
              </div>

              <div className="flex flex-col gap-2 px-5 pb-6">
                {/* Room info pill */}
                {roomCode && (
                  <div className="mb-2 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="font-mono text-lg font-black tracking-wider text-primary">
                      {roomCode}
                    </span>
                    <span className="text-text-dim">|</span>
                    <span className="font-body text-sm text-text-muted">
                      {playerCount} player{playerCount !== 1 ? "s" : ""}
                    </span>
                    {gameName && (
                      <>
                        <span className="text-text-dim">|</span>
                        <span className="font-body text-sm text-text-muted">{gameName}</span>
                      </>
                    )}
                  </div>
                )}

                {/* Home */}
                <button
                  type="button"
                  onClick={() => {
                    haptics.tap();
                    handleLeaveClick();
                  }}
                  className="flex w-full items-center gap-4 rounded-xl px-4 py-4 text-left transition-colors hover:bg-white/8 active:scale-[0.98]"
                  style={{ minHeight: 56 }}
                >
                  <Home className="h-5 w-5 text-text-muted" />
                  <span className="font-display text-base font-bold text-text-primary">Home</span>
                </button>

                {/* Settings section */}
                <div className="rounded-xl border border-white/10 bg-white/[0.04]">
                  <div className="flex items-center gap-4 px-4 py-3">
                    <Settings className="h-4 w-4 text-text-dim" />
                    <span className="font-display text-xs font-bold uppercase tracking-wider text-text-dim">
                      Settings
                    </span>
                  </div>

                  {/* Volume */}
                  <div className="flex items-center gap-4 px-4 py-3">
                    <Volume2 className="h-5 w-5 text-text-muted" />
                    <span className="flex-1 font-body text-sm text-text-primary">Sound</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      defaultValue="80"
                      className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-white/20 accent-primary"
                      onChange={(e) => {
                        const vol = Number(e.target.value) / 100;
                        try {
                          localStorage.setItem("flimflam_volume", String(vol));
                        } catch {}
                      }}
                    />
                  </div>

                  {/* Beta mode */}
                  <div className="flex items-center gap-4 px-4 py-3">
                    <span className="flex h-5 w-5 items-center justify-center font-mono text-xs font-bold text-text-muted">
                      B
                    </span>
                    <span className="flex-1 font-body text-sm text-text-primary">Beta Mode</span>
                    <button
                      type="button"
                      onClick={handleToggleBeta}
                      className={`relative h-7 w-12 rounded-full transition-colors ${
                        betaMode ? "bg-primary" : "bg-white/20"
                      }`}
                      role="switch"
                      aria-checked={betaMode}
                    >
                      <motion.div
                        className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow"
                        animate={{ x: betaMode ? 20 : 2 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>
                </div>

                {/* Host controls (in-game only) */}
                {isHost && isInGame && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.04]">
                    <div className="flex items-center gap-4 px-4 py-3">
                      <span className="font-display text-xs font-bold uppercase tracking-wider text-accent-3">
                        Host Controls
                      </span>
                    </div>

                    {onSkipRound && (
                      <button
                        type="button"
                        onClick={() => {
                          haptics.tap();
                          onSkipRound();
                          close();
                        }}
                        className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-white/8"
                        style={{ minHeight: 56 }}
                      >
                        <SkipForward className="h-5 w-5 text-text-muted" />
                        <span className="font-body text-sm text-text-primary">Skip Round</span>
                      </button>
                    )}

                    {onEndGame && (
                      <button
                        type="button"
                        onClick={() => {
                          haptics.warn();
                          onEndGame();
                          close();
                        }}
                        className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-white/8"
                        style={{ minHeight: 56 }}
                      >
                        <StopCircle className="h-5 w-5 text-accent-6" />
                        <span className="font-body text-sm text-accent-6">End Game</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Leave confirmation dialog */}
      <LeaveGameDialog
        open={leaveDialogOpen}
        onOpenChange={setLeaveDialogOpen}
        isHost={isHost}
        onLeave={() => {
          setLeaveDialogOpen(false);
          close();
          onLeave();
        }}
        onEndGame={
          onEndGame
            ? () => {
                setLeaveDialogOpen(false);
                close();
                onEndGame();
              }
            : undefined
        }
      />
    </>
  );
}
