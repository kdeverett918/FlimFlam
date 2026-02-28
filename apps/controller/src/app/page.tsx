"use client";

import { JoinForm } from "@/components/join/JoinForm";
import { useRoom } from "@/hooks/useRoom";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";

function JoinPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { joinRoom, error, connected } = useRoom();

  const initialCode = searchParams.get("code") ?? "";

  const handleJoin = useCallback(
    async (code: string, name: string, color: string): Promise<boolean> => {
      const success = await joinRoom(code, name, color);
      if (success) {
        router.push("/play");
      }
      return success;
    },
    [joinRoom, router],
  );

  if (connected) {
    router.push("/play");
    return null;
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-8">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <h1 className="font-display text-4xl tracking-tight text-accent-1">PARTYLINE</h1>
        <p className="text-sm text-text-muted">Join the party from your phone</p>
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
          <h1 className="font-display text-4xl tracking-tight text-accent-1">PARTYLINE</h1>
        </main>
      }
    >
      <JoinPageContent />
    </Suspense>
  );
}
