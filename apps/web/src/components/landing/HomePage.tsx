"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { ActionPanel } from "@/components/landing/ActionPanel";
import { GameShowcase } from "@/components/landing/GameShowcase";
import { HeroSection } from "@/components/landing/HeroSection";

export default function HomePage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error] = useState<string | null>(null);

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
      className="landing-page flex min-h-dvh flex-col items-center gap-8 overflow-x-hidden px-4 py-8 sm:gap-12 lg:gap-16"
      style={safeAreaPadding}
    >
      <HeroSection />
      <GameShowcase />
      <ActionPanel
        onJoin={handleJoin}
        onCreateRoom={handleCreateRoom}
        creating={creating}
        error={error}
      />
    </main>
  );
}
