"use client";

import { GameController } from "@/components/game/GameController";
import { ReactionBar } from "@/components/game/ReactionBar";
import { ScoreBadge } from "@/components/game/ScoreBadge";
import { TimerBar } from "@/components/game/TimerBar";
import { WaitingScreen } from "@/components/game/WaitingScreen";
import { useRoom } from "@/hooks/useRoom";
import { AnimatedBackground, GlassPanel } from "@flimflam/ui";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PlayPage() {
  const router = useRouter();
  const {
    state,
    players,
    privateData,
    sendMessage,
    connected,
    everConnected,
    myPlayer,
    error,
    errorNonce,
    ready,
  } = useRoom();
  const [toast, setToast] = useState<{ message: string; nonce: number } | null>(null);

  // Only redirect after we've finished attempting an auto-reconnect.
  useEffect(() => {
    if (!ready || connected) return;
    if (everConnected) return;
    router.push("/");
  }, [connected, ready, everConnected, router]);

  useEffect(() => {
    if (!error) return;
    setToast({ message: error, nonce: errorNonce });
    const timeout = setTimeout(() => {
      setToast((current) => (current?.nonce === errorNonce ? null : current));
    }, 4000);
    return () => clearTimeout(timeout);
  }, [error, errorNonce]);

  if (!connected) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6">
        <AnimatedBackground variant="subtle" />
        <GlassPanel className="flex flex-col items-center gap-4 px-8 py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
          <p className="font-body text-text-primary">Connecting...</p>
          {error && (
            <p className="text-center font-body text-sm font-medium text-accent-6">{error}</p>
          )}
        </GlassPanel>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6">
        <AnimatedBackground variant="subtle" />
        <WaitingScreen />
      </main>
    );
  }

  const { phase, gameId, round, totalRounds, timerEndsAt } = state;

  // Lobby state -- waiting for host to start a game
  if (phase === "lobby" || !gameId) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6">
        <AnimatedBackground variant="subtle" />
        <GlassPanel glow className="flex max-w-sm flex-col items-center gap-5 px-8 py-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-5/15">
            <Check className="h-8 w-8 text-accent-5" strokeWidth={3} />
          </div>
          <h2 className="font-display text-2xl font-bold text-text-primary">You're in!</h2>
          <p className="text-center font-body text-text-primary/80">
            Waiting for the host to start a game...
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {players.map((player) => (
              <GlassPanel
                key={player.sessionId}
                rounded="2xl"
                className="flex items-center gap-2 px-3 py-1.5"
              >
                <div
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: player.avatarColor }}
                />
                <span className="font-body text-sm text-text-primary">{player.name}</span>
              </GlassPanel>
            ))}
          </div>
        </GlassPanel>
        <ReactionBar sendMessage={sendMessage} />
      </main>
    );
  }

  // Between games
  if (phase === "between-games") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6">
        <AnimatedBackground variant="subtle" />
        <GlassPanel glow className="flex max-w-sm flex-col items-center gap-4 px-8 py-10">
          <h2 className="font-display text-2xl font-bold text-text-primary">
            Next game starting...
          </h2>
          <p className="text-center font-body text-text-primary/80">
            The host is picking the next game.
          </p>
        </GlassPanel>
        <ReactionBar sendMessage={sendMessage} />
      </main>
    );
  }

  // In-game rendering
  const myScore = myPlayer?.score ?? 0;
  const myColor = myPlayer?.avatarColor ?? "#6366f1";
  const myRank = (() => {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const idx = sorted.findIndex((p) => p.sessionId === myPlayer?.sessionId);
    return idx >= 0 ? idx + 1 : players.length;
  })();

  return (
    <main className="flex min-h-dvh flex-col pb-14 pt-2">
      {/* Timer bar */}
      <TimerBar timerEndsAt={timerEndsAt} />

      {/* Error toast */}
      {toast && (
        <div className="fixed inset-x-0 top-3 z-50 flex justify-center px-4">
          <GlassPanel className="max-w-md border-accent-6/30 px-4 py-3 text-center font-body text-sm text-accent-6">
            {toast.message}
          </GlassPanel>
        </div>
      )}

      {/* Game content */}
      <GameController
        gameId={gameId}
        phase={phase}
        round={round}
        totalRounds={totalRounds}
        privateData={privateData}
        errorNonce={errorNonce}
        sendMessage={sendMessage}
      />

      {/* Score badge footer */}
      <ScoreBadge
        avatarColor={myColor}
        score={myScore}
        rank={myRank}
        totalPlayers={players.length}
      />
    </main>
  );
}
