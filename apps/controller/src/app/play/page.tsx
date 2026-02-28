"use client";

import { GameController } from "@/components/game/GameController";
import { ScoreBadge } from "@/components/game/ScoreBadge";
import { TimerBar } from "@/components/game/TimerBar";
import { WaitingScreen } from "@/components/game/WaitingScreen";
import { useRoom } from "@/hooks/useRoom";
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
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-text-muted/30 border-t-accent-1" />
          <p className="text-text-muted">Connecting...</p>
          {error && <p className="text-center text-sm text-accent-1">{error}</p>}
        </div>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6">
        <WaitingScreen />
      </main>
    );
  }

  const { phase, gameId, round, totalRounds, timerEndsAt } = state;

  // Lobby state — waiting for host to start a game
  if (phase === "lobby" || !gameId) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-2/20">
            <svg
              className="h-10 w-10 text-accent-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              role="img"
            >
              <title>Joined</title>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-display text-2xl text-text-primary">You're in!</h2>
          <p className="text-center text-text-muted">Waiting for the host to start a game...</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {players.map((player) => (
              <div
                key={player.sessionId}
                className="flex items-center gap-2 rounded-full border border-text-muted/20 bg-bg-card px-3 py-1.5"
              >
                <div
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: player.avatarColor }}
                />
                <span className="text-sm text-text-primary">{player.name}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // Between games
  if (phase === "between-games") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4">
          <h2 className="font-display text-2xl text-text-primary">Next game starting...</h2>
          <p className="text-center text-text-muted">The host is picking the next game.</p>
        </div>
      </main>
    );
  }

  // In-game rendering
  const myScore = myPlayer?.score ?? 0;
  const myColor = myPlayer?.avatarColor ?? "#FF3366";
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
          <div className="max-w-md rounded-xl border border-accent-1/30 bg-bg-dark/90 px-4 py-3 text-center text-sm text-accent-1 backdrop-blur-sm">
            {toast.message}
          </div>
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
