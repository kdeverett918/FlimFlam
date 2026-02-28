"use client";

import { useRoom } from "@/hooks/useRoom";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const { createRoom, error } = useRoom();
  const [loading, setLoading] = useState(false);

  const handleCreateRoom = useCallback(async () => {
    setLoading(true);
    try {
      const code = await createRoom();
      router.push(`/room/${code}`);
    } catch (err) {
      console.error("Failed to create room:", err);
      setLoading(false);
    }
  }, [createRoom, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-dark">
      {/* Background grid effect */}
      <div className="pointer-events-none absolute inset-0 opacity-5">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.65 0.29 12 / 0.3) 1px, transparent 1px), linear-gradient(90deg, oklch(0.65 0.29 12 / 0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Floating particles effect */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={`particle-${i + 1}`}
            className="animate-float absolute rounded-full"
            style={{
              width: `${8 + i * 4}px`,
              height: `${8 + i * 4}px`,
              left: `${15 + i * 14}%`,
              top: `${20 + (i % 3) * 25}%`,
              background: `oklch(0.65 0.29 ${i * 60} / 0.15)`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + i * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-12">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <h1 className="animate-glow-pulse font-display text-[96px] leading-none tracking-wider text-text-primary md:text-[128px]">
            PARTYLINE
          </h1>
          <p className="text-[28px] tracking-widest text-text-muted">AI PARTY GAMES</p>
        </div>

        {/* Create room button */}
        <button
          type="button"
          onClick={handleCreateRoom}
          disabled={loading}
          className="group relative overflow-hidden rounded-2xl border-2 border-accent-1/50 bg-accent-1/10 px-16 py-6 font-display text-[36px] text-accent-1 transition-all duration-300 hover:border-accent-1 hover:bg-accent-1/20 hover:shadow-[0_0_40px_oklch(0.65_0.29_12/0.3)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {/* Button shimmer effect */}
          <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-accent-1/10 to-transparent" />
          <span className="relative">{loading ? "CONNECTING..." : "CREATE ROOM"}</span>
        </button>

        {/* Error display */}
        {error && (
          <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-8 py-4 text-[24px] text-red-400">
            {error}
          </div>
        )}

        {/* Footer info */}
        <div className="flex flex-col items-center gap-2 text-[20px] text-text-muted">
          <p>Display this screen on a shared TV or monitor</p>
          <p>Players join from their phones</p>
        </div>
      </div>
    </main>
  );
}
