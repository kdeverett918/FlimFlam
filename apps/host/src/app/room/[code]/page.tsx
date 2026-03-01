"use client";

import { GameView } from "@/components/game/GameView";
import { PhaseTransition } from "@/components/game/PhaseTransition";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { useGameState } from "@/hooks/useGameState";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useRoomContext } from "../RoomProvider";

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const routeCode = (params.code as string)?.toUpperCase() ?? "";
  const {
    room,
    state,
    players,
    gameData,
    createRoom,
    joinRoom,
    sendMessage,
    error,
    connected,
    roomCode,
    ready,
  } = useRoomContext();
  const gameState = useGameState({ state, players, gameData });
  const initialized = useRef(false);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionLabel, setTransitionLabel] = useState("");
  const prevPhase = useRef(gameState.phase);

  // Connect to room on mount.
  //
  // Bug fix: the previous version called router.replace() inside the
  // createRoom().then() callback. In Next.js App Router, router.replace() called
  // from inside an async callback racing against state-triggered re-renders can
  // silently drop the navigation. Instead we:
  //   1. Call createRoom() and let it store roomCode in its own state.
  //   2. Watch roomCode via a separate useEffect and navigate there.
  //   3. Never call router.replace() from inside an async callback.
  useEffect(() => {
    if (!ready || initialized.current) return;
    if (connected && room) return;

    const isCreateRoute = routeCode === "NEW" || routeCode.length !== 4;

    if (isCreateRoute) {
      initialized.current = true;
      createRoom().catch((err) => {
        console.error("Failed to create room:", err);
        initialized.current = false; // allow retry on error
      });
      return;
    }

    if (!routeCode) return;
    initialized.current = true;

    joinRoom(routeCode).catch((err) => {
      console.error("Failed to join room:", err);
      initialized.current = false; // allow retry on error
    });
  }, [ready, routeCode, connected, room, joinRoom, createRoom]);

  // Navigate to the real room URL once we have the room code.
  // Separating this from the createRoom() call prevents the router.replace()
  // from racing with pending React state flushes.
  useEffect(() => {
    if (!roomCode) return;
    if (roomCode === routeCode) return; // already on the right URL
    router.replace(`/room/${roomCode}`);
  }, [roomCode, routeCode, router]);

  // Phase transition effect
  useEffect(() => {
    if (prevPhase.current !== gameState.phase && gameState.phase !== "lobby") {
      const label = formatPhaseLabel(gameState.phase);
      if (label) {
        setTransitionLabel(label);
        setShowTransition(true);
        const timer = setTimeout(() => setShowTransition(false), 2000);
        return () => clearTimeout(timer);
      }
    }
    prevPhase.current = gameState.phase;
  }, [gameState.phase]);

  if (!connected && !room) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-bg-dark">
        <div className="flex flex-col items-center gap-6">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
          <p className="font-display text-[36px] text-text-muted">
            {routeCode === "NEW" || routeCode.length !== 4
              ? "Creating room..."
              : `Connecting to room ${routeCode}...`}
          </p>
          {error && <p className="text-[24px] text-accent-6">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-bg-dark">
      {/* Phase transition overlay */}
      {showTransition && <PhaseTransition label={transitionLabel} />}

      {/* Main content based on game phase */}
      {gameState.screenView === "lobby" && (
        <LobbyScreen
          roomCode={roomCode ?? routeCode}
          players={gameState.playerList}
          selectedGameId={gameState.selectedGameId}
          complexity={gameState.complexity}
          hotTakePlayerInputEnabled={gameState.hotTakePlayerInputEnabled}
          playerCount={gameState.playerCount}
          onSelectGame={(gameId) => sendMessage("host:select-game", { gameId })}
          onSetComplexity={(complexity) => sendMessage("host:set-complexity", { complexity })}
          onSetHotTakePlayerInput={(enabled) => sendMessage("host:set-player-input", { enabled })}
          onStartGame={() => sendMessage("host:start-game", { gameId: gameState.selectedGameId })}
        />
      )}

      {gameState.screenView === "game" && (
        <>
          <GameView
            gameId={gameState.selectedGameId}
            phase={gameState.phase}
            round={gameState.round}
            totalRounds={gameState.totalRounds}
            players={gameState.playerList}
            gamePayload={gameState.gamePayload}
            timerEndTime={gameState.timerEndTime}
            room={room}
          />

          <div className="pointer-events-none absolute bottom-8 right-8 flex gap-3">
            <button
              type="button"
              onClick={() => sendMessage("host:skip")}
              className="pointer-events-auto h-12 rounded-xl border border-text-muted/20 bg-bg-surface/80 px-5 font-display text-sm text-text-primary uppercase tracking-wider backdrop-blur transition-all hover:bg-bg-surface active:scale-95"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={() => sendMessage("host:end-game")}
              className="pointer-events-auto h-12 rounded-xl border border-primary/30 bg-primary/10 px-5 font-display text-sm text-primary uppercase tracking-wider backdrop-blur transition-all hover:bg-primary/15 active:scale-95"
            >
              End
            </button>
          </div>
        </>
      )}
    </main>
  );
}

function formatPhaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    generating: "Generating World...",
    "role-reveal": "Meet Your Character",
    "action-input": "Choose Your Action",
    "ai-narrating": "The Story Unfolds...",
    "narration-display": "What Happened...",
    reveal: "The Big Reveal",
    "generating-prompt": "Cooking Up a Question...",
    "answer-input": "Write Your Bluff",
    voting: "Time to Vote",
    results: "Results",
    "picking-drawer": "Picking the Artist...",
    drawing: "Draw!",
    guessing: "Guess the Drawing!",
    "word-reveal": "The Word Was...",
    "generating-questions": "Generating Questions...",
    answering: "Answer Time",
    "drift-check": "Reality or Drift?",
    "topic-setup": "Pick Your Topic",
    "ai-generating": "Generating Hot Takes...",
    "showing-prompt": "Hot Take Incoming",
    "final-scores": "Final Scores",
  };
  return labels[phase] ?? "";
}
