"use client";

import { useRoom } from "@/hooks/useRoom";
import { AnimatedBackground } from "@flimflam/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { JoinForm } from "./JoinForm";

interface JoinPageClientProps {
  initialCode: string;
}

export function JoinPageClient({ initialCode }: JoinPageClientProps) {
  const router = useRouter();
  const { joinRoom, error, connected } = useRoom();

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
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-primary" />
          <p className="font-body text-text-muted">Joining room...</p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center px-6 py-8"
      style={{
        paddingTop: "max(2rem, env(safe-area-inset-top))",
        paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
      }}
    >
      <AnimatedBackground variant="subtle" />

      <div className="mb-10 flex flex-col items-center gap-3">
        <h1
          className="font-display font-extrabold leading-none tracking-tight text-text-primary"
          style={{
            fontSize: "clamp(2rem, 10vw, 3rem)",
            textShadow: "0 0 32px oklch(0.72 0.22 25 / 0.4), 0 0 64px oklch(0.72 0.22 25 / 0.15)",
          }}
        >
          FLIMFLAM
        </h1>
        <p className="font-body text-sm text-text-muted">Join the party from your phone</p>
      </div>

      <JoinForm initialCode={initialCode} onJoin={handleJoin} error={error} />
    </main>
  );
}
