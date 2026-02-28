"use client";

import { JoinForm } from "@/components/join/JoinForm";
import { useRoom } from "@/hooks/useRoom";
import { AnimatedBackground } from "@partyline/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect } from "react";

function JoinPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { joinRoom, error, connected } = useRoom();

  const initialCode = searchParams.get("code") ?? "";

  const handleJoin = useCallback(
    async (code: string, name: string, color: string): Promise<boolean> => {
      return joinRoom(code, name, color);
    },
    [joinRoom],
  );

  useEffect(() => {
    if (connected) {
      router.replace("/play");
    }
  }, [connected, router]);

  if (connected) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-8">
        <AnimatedBackground variant="subtle" />
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-accent-1" />
          <p className="font-body text-text-muted">Joining room...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-8">
      <AnimatedBackground variant="subtle" />

      {/* Logo */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <h1
          className="font-display text-[48px] font-extrabold leading-none tracking-tight text-text-primary"
          style={{
            textShadow: "0 0 32px oklch(0.7 0.18 265 / 0.4), 0 0 64px oklch(0.7 0.18 265 / 0.15)",
          }}
        >
          PARTYLINE
        </h1>
        <p className="font-body text-sm text-text-muted">Join the party from your phone</p>
      </div>

      <JoinForm initialCode={initialCode} onJoin={handleJoin} error={error} />
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh flex-col items-center justify-center">
          <AnimatedBackground variant="subtle" />
          <h1
            className="font-display text-[48px] font-extrabold leading-none tracking-tight text-text-primary"
            style={{
              textShadow: "0 0 32px oklch(0.7 0.18 265 / 0.4), 0 0 64px oklch(0.7 0.18 265 / 0.15)",
            }}
          >
            PARTYLINE
          </h1>
        </main>
      }
    >
      <JoinPageContent />
    </Suspense>
  );
}
