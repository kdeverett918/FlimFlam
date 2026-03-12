"use client";

import { haptics } from "@flimflam/ui";
import { ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { MenuTrigger, usePlayerMenu } from "./PlayerMenu";

interface NavBarProps {
  roomCode: string | null;
  gameName: string | null;
  round: number;
  totalRounds: number;
  myScore: number;
  isInGame: boolean;
  betaMode?: boolean;
}

type NavContext = "homepage" | "lobby" | "in-game" | "arcade" | "other";

function resolveContext(pathname: string, isInGame: boolean): NavContext {
  if (pathname === "/") return "homepage";
  if (pathname.startsWith("/room/")) {
    return isInGame ? "in-game" : "lobby";
  }
  if (pathname.startsWith("/flimflap") || pathname.startsWith("/trumpybird")) return "arcade";
  return "other";
}

export function NavBar({
  roomCode,
  gameName,
  round,
  totalRounds,
  myScore,
  isInGame,
  betaMode,
}: NavBarProps) {
  const pathname = usePathname() ?? "/";
  const ctx = useMemo(() => resolveContext(pathname, isInGame), [pathname, isInGame]);

  // Hidden on homepage
  if (ctx === "homepage") return null;

  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-bg-deep/80 backdrop-blur-xl"
      style={{ height: "calc(56px + env(safe-area-inset-top))" }}
    >
      <div
        className="mx-auto flex h-full max-w-7xl items-center gap-3 px-3"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {/* Left */}
        <div className="flex w-12 shrink-0 items-center">
          <AnimatePresence mode="wait">
            {(ctx === "lobby" || ctx === "arcade" || ctx === "other") && (
              <motion.a
                key="back"
                href="/"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                onClick={() => haptics.tap()}
                className="flex h-12 w-12 items-center justify-center rounded-xl text-text-muted transition-colors hover:text-text-primary"
                aria-label="Back to home"
              >
                <ArrowLeft className="h-5 w-5" />
              </motion.a>
            )}
            {ctx === "in-game" && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                <MenuTrigger />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Center */}
        <div className="flex min-w-0 flex-1 items-center justify-center">
          <AnimatePresence mode="wait">
            {ctx === "lobby" && roomCode && (
              <motion.div
                key="room-code"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <span className="font-mono text-lg font-black tracking-wider text-primary">
                  {roomCode}
                </span>
                {betaMode && (
                  <span className="rounded-full border border-accent-3/40 bg-accent-3/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-accent-3">
                    Beta
                  </span>
                )}
              </motion.div>
            )}
            {ctx === "in-game" && (
              <motion.div
                key="game-info"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                {gameName && (
                  <span className="font-display text-sm font-bold text-text-primary">
                    {gameName}
                  </span>
                )}
                {round > 0 && totalRounds > 0 && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-xs text-text-muted">
                    {round}/{totalRounds}
                  </span>
                )}
              </motion.div>
            )}
            {ctx === "arcade" && (
              <motion.div
                key="arcade"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <span className="font-display text-base font-bold text-text-primary">
                  {pathname?.startsWith("/flimflap") ? "FlimFlap" : "TrumpyBird"}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right */}
        <div className="flex w-12 shrink-0 items-center justify-end">
          {(ctx === "lobby" || ctx === "arcade") && <MenuTrigger />}
          {ctx === "in-game" && myScore > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-sm font-bold text-primary"
            >
              {myScore}
            </motion.div>
          )}
        </div>
      </div>
    </nav>
  );
}
