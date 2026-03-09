"use client";

import { useReducedMotion } from "@flimflam/ui";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { ActionPanel } from "@/components/landing/ActionPanel";
import { GameShowcase } from "@/components/landing/GameShowcase";
import { HeroSection } from "@/components/landing/HeroSection";

const PARTY_FACTS = [
  {
    value: "Zero app installs",
    detail: "Everyone joins from the browser already on their phone.",
  },
  {
    value: "4 games, one hub",
    detail: "Host the room once, then keep the whole night moving.",
  },
  {
    value: "Saved FlimFlap runs",
    detail: "Optional login keeps your solo progress and daily scores.",
  },
] as const;

export default function HomePage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  const clearStaleTokens = useCallback(() => {
    for (const key of ["flimflam_reconnect_token", "flimflam_room_code"]) {
      try {
        sessionStorage.removeItem(key);
      } catch {}
      try {
        localStorage.removeItem(key);
      } catch {}
    }
  }, []);

  const handleJoin = useCallback(
    async (code: string, name: string, color: string): Promise<boolean> => {
      clearStaleTokens();
      router.push(
        `/room/${code.toUpperCase()}?name=${encodeURIComponent(name)}&color=${encodeURIComponent(color)}`,
      );
      return true;
    },
    [clearStaleTokens, router],
  );

  const handleCreateRoom = useCallback(
    (name: string, color: string) => {
      if (creating) return;
      clearStaleTokens();
      setCreating(true);
      router.push(
        `/room/new?name=${encodeURIComponent(name.trim() || "Host")}&color=${encodeURIComponent(color)}`,
      );
    },
    [clearStaleTokens, creating, router],
  );

  const safeAreaPadding = {
    paddingTop: "max(2rem, env(safe-area-inset-top))",
    paddingRight: "max(1rem, env(safe-area-inset-right))",
    paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
    paddingLeft: "max(1rem, env(safe-area-inset-left))",
  } as const;

  return (
    <main
      className="landing-page flex min-h-dvh flex-col items-center gap-8 overflow-x-hidden px-4 pb-16 pt-8 sm:gap-12"
      style={safeAreaPadding}
    >
      <HeroSection />

      {/* Action panel — centered, primary CTA */}
      <div className="w-full max-w-md">
        <ActionPanel
          onJoin={handleJoin}
          onCreateRoom={handleCreateRoom}
          creating={creating}
          error={error}
        />
      </div>

      <div className="grid w-full max-w-5xl gap-3 sm:grid-cols-3">
        {PARTY_FACTS.map((fact, index) => (
          <motion.div
            key={fact.value}
            className="rounded-[28px] border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-sm"
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 2.15 + index * 0.1,
              duration: 0.45,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-text-primary">
              {fact.value}
            </p>
            <p className="mt-2 font-body text-sm leading-relaxed text-text-muted">{fact.detail}</p>
          </motion.div>
        ))}
      </div>

      {/* Section header — full width */}
      <div className="w-full max-w-5xl">
        <motion.p
          className="mb-1 text-center font-display text-xs font-semibold text-text-dim uppercase tracking-[0.25em]"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.4, duration: 0.5 }}
        >
          The Lineup
        </motion.p>
        <motion.h2
          className="mb-8 text-center font-display text-2xl font-bold text-text-primary sm:text-3xl"
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.5, duration: 0.5 }}
        >
          4 games, one party
        </motion.h2>
      </div>

      {/* Game cards — 2-column grid on desktop */}
      <div className="w-full max-w-5xl">
        <GameShowcase />
      </div>
    </main>
  );
}
