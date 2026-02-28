"use client";

import { GameView } from "@/components/game/GameView";
import { PhaseTransition } from "@/components/game/PhaseTransition";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { useGameState } from "@/hooks/useGameState";
import { useRoom } from "@/hooks/useRoom";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  } = useRoom();
  const gameState = useGameState({ state, players, gameData });
  const initialized = useRef(false);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionLabel, setTransitionLabel] = useState("");
  const prevPhase = useRef(gameState.phase);

  // Connect to room on mount
  useEffect(() => {
    if (!ready || initialized.current || !routeCode) return;
    if (connected && room) return;
    initialized.current = true;

    const isCreateRoute = routeCode.length !== 4;

    if (isCreateRoute) {
      createRoom()
        .then((createdCode) => {
          router.replace(`/room/${createdCode}`);
        })
        .catch((err) => {
          console.error("Failed to create room:", err);
        });
      return;
    }

    // Join existing room by code
    joinRoom(routeCode).catch((err) => {
      console.error("Failed to join room:", err);
    });
  }, [ready, routeCode, connected, room, joinRoom, createRoom, router]);

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
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-accent-1/30 border-t-accent-1" />
          <p className="font-display text-[36px] text-text-muted">
            {routeCode.length === 4 ? `Connecting to room ${routeCode}...` : "Creating room..."}
          </p>
          {error && <p className="text-[24px] text-red-400">{error}</p>}
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
          playerCount={gameState.playerCount}
          onSelectGame={(gameId) => sendMessage("host:select-game", { gameId })}
          onSetComplexity={(complexity) => sendMessage("host:set-complexity", { complexity })}
          onStartGame={() => sendMessage("host:start-game", { gameId: gameState.selectedGameId })}
        />
      )}

      {gameState.screenView === "game" && (
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
    "showing-prompt": "Hot Take Incoming",
    "final-scores": "Final Scores",
  };
  return labels[phase] ?? "";
}
