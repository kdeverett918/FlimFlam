"use client";

import { GameView } from "@/components/game/GameView";
import { PhaseTransition } from "@/components/game/PhaseTransition";
import { ReactionOverlay } from "@/components/game/ReactionOverlay";
import { VolumeControl } from "@/components/game/VolumeControl";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { useGameState } from "@/hooks/useGameState";
import { GAME_MANIFESTS, analyzeGameState, getLastRoundCommentary } from "@flimflam/shared";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useRoomContext } from "../RoomProvider";

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const routeCode = (params?.code as string)?.toUpperCase() ?? "";
  const preselectedGame = useRef(searchParams?.get("game") ?? null);
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
    reconnecting,
    roomCode,
    ready,
  } = useRoomContext();
  const gameState = useGameState({ state, players, gameData });
  const initialized = useRef(false);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionLabel, setTransitionLabel] = useState("");
  const [transitionSubtitle, setTransitionSubtitle] = useState<string | null>(null);
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

  // Auto-select game from ?game= query param
  useEffect(() => {
    if (!connected || !room || !preselectedGame.current) return;
    const gameId = preselectedGame.current;
    const valid = GAME_MANIFESTS.some((g) => g.id === gameId);
    if (valid) {
      sendMessage("host:select-game", { gameId });
    }
    preselectedGame.current = null;
    // Strip query string from URL
    router.replace(`/room/${roomCode ?? routeCode}`);
  }, [connected, room, sendMessage, router, roomCode, routeCode]);

  // Phase transition effect
  useEffect(() => {
    if (gameState.phase === "lobby") {
      setShowTransition(false);
      prevPhase.current = gameState.phase;
      return;
    }

    if (prevPhase.current !== gameState.phase) {
      let label = formatPhaseLabel(gameState.phase);
      const isLastRound = gameState.round === gameState.totalRounds && gameState.round > 0;

      // Override label for final round transition phases
      if (
        isLastRound &&
        (gameState.phase === "round-transition" || gameState.phase === "round-intro")
      ) {
        label = "FINAL ROUND";
      }

      if (label) {
        setTransitionLabel(label);
        // Generate dynamic commentary from game standings
        const standings = gameState.playerList
          .filter((p) => !p.isHost)
          .map((p) => ({ name: p.name, score: p.score }));
        const commentary = analyzeGameState(standings, isLastRound);
        setTransitionSubtitle(commentary ?? (isLastRound ? getLastRoundCommentary() : null));
        setShowTransition(true);
        const timer = setTimeout(() => setShowTransition(false), 2000);
        return () => clearTimeout(timer);
      }
    }
    prevPhase.current = gameState.phase;
  }, [gameState.phase, gameState.playerList, gameState.round, gameState.totalRounds]);

  if (!connected || !room) {
    const isCreateRoute = routeCode === "NEW" || routeCode.length !== 4;
    const displayCode = (roomCode ?? routeCode).toUpperCase();
    const label = reconnecting
      ? displayCode && displayCode !== "NEW" && displayCode.length === 4
        ? `Reconnecting to room ${displayCode}...`
        : "Reconnecting..."
      : isCreateRoute
        ? "Creating room..."
        : `Connecting to room ${displayCode}...`;

    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-bg-dark">
        <div className="flex flex-col items-center gap-6">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/40 border-t-primary" />
          <p className="font-display text-[36px] text-text-primary">{label}</p>
          {error && <p className="text-[24px] text-accent-6">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-bg-dark">
      {/* Phase transition overlay */}
      {showTransition && (
        <PhaseTransition
          label={transitionLabel}
          gameId={gameState.selectedGameId}
          round={gameState.round}
          totalRounds={gameState.totalRounds}
          subtitle={transitionSubtitle}
          isFinalRound={gameState.round === gameState.totalRounds && gameState.round > 0}
        />
      )}

      {/* Reaction overlay */}
      <ReactionOverlay room={room} />

      {/* Volume control */}
      <VolumeControl />

      {/* Main content based on game phase */}
      {gameState.screenView === "lobby" && (
        <LobbyScreen
          roomCode={roomCode ?? routeCode}
          players={gameState.playerList}
          selectedGameId={gameState.selectedGameId}
          complexity={gameState.complexity}
          hotTakePlayerInputEnabled={false}
          playerCount={gameState.playerCount}
          onSelectGame={(gameId) => sendMessage("host:select-game", { gameId })}
          onSetComplexity={(complexity) => sendMessage("host:set-complexity", { complexity })}
          onSetHotTakePlayerInput={() => {}}
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

          <div className="pointer-events-none absolute bottom-8 right-8 z-50 flex gap-3">
            <button
              type="button"
              onClick={() => sendMessage("host:skip")}
              className="pointer-events-auto h-12 rounded-xl border-2 border-white/20 bg-bg-surface/90 px-5 font-display text-sm text-text-primary uppercase tracking-wider backdrop-blur transition-all hover:bg-bg-surface active:scale-95"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={() => sendMessage("host:end-game")}
              className="pointer-events-auto h-12 rounded-xl border-2 border-primary/40 bg-primary/15 px-5 font-display text-sm text-primary uppercase tracking-wider backdrop-blur transition-all hover:bg-primary/25 active:scale-95"
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
    // Brain Board
    "category-reveal": "Here Are the Categories!",
    "clue-select": "Pick a Clue",
    answering: "Answer Time",
    "power-play-wager": "Power Play!",
    "power-play-answer": "Power Play Answer",
    "clue-result": "Results",
    "round-transition": "Double Down!",
    "all-in-category": "All-In Round",
    "all-in-wager": "Place Your Wager",
    "all-in-answer": "Final Answer",
    "all-in-reveal": "All-In Reveal",
    // Lucky Letters
    "round-intro": "New Round!",
    spinning: "Spin the Wheel!",
    "guess-consonant": "Pick a Consonant",
    "buy-vowel": "Buying a Vowel",
    "solve-attempt": "Solving...",
    "letter-result": "Letter Reveal",
    "round-result": "Round Complete",
    "bonus-round": "Bonus Round!",
    "bonus-reveal": "Bonus Reveal",
    // Survey Smash
    "question-reveal": "New Question!",
    "face-off": "Face Off!",
    guessing: "Guess an Answer",
    strike: "Strike!",
    "steal-chance": "Snag It!",
    "answer-reveal": "The People Say...",
    "lightning-round": "Lightning Round!",
    "lightning-round-reveal": "Lightning Round Results",
    // Shared
    "final-scores": "Final Scores",
  };
  return labels[phase] ?? "";
}
