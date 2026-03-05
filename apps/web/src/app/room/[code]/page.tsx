"use client";

import { GameReels } from "@/components/game/GameReels";
import { useGameRoomContext } from "@/components/game/GameRoomProvider";
import { PhaseTransition } from "@/components/game/PhaseTransition";
import { ReactionOverlay } from "@/components/game/ReactionOverlay";
import { ScoreBadge } from "@/components/game/ScoreBadge";
import { TimerBar } from "@/components/game/TimerBar";
import { VolumeControl } from "@/components/game/VolumeControl";
import { UnifiedGameView } from "@/components/games/UnifiedGameView";
import { UnifiedLobby } from "@/components/lobby/UnifiedLobby";
import { GAME_MANIFESTS, analyzeGameState, getLastRoundCommentary } from "@flimflam/shared";
import { soundManager, sounds } from "@flimflam/ui";
import { AnimatePresence, motion } from "motion/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const LOBBY_PHASES = new Set(["lobby", "", "between-games"]);

const phaseTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const routeCode = ((params?.code as string | undefined) ?? "").toUpperCase();
  const preselectedGame = useRef(searchParams?.get("game") ?? null);

  const {
    room,
    state,
    playerList,
    gameData,
    privateData,
    gameEvents,
    mySessionId,
    myPlayer,
    isHost,
    createRoom,
    joinRoom,
    sendMessage,
    error,
    errorNonce,
    connected,
    reconnecting,
    roomCode,
    ready,
    clockOffset,
  } = useGameRoomContext();

  const initialized = useRef(false);
  const [showReels, setShowReels] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionLabel, setTransitionLabel] = useState("");
  const [transitionSubtitle, setTransitionSubtitle] = useState<string | null>(null);
  const prevPhase = useRef("lobby");
  const prevAudioPhase = useRef("lobby");

  const phase = state?.phase ?? "lobby";
  const gameId = state?.selectedGameId ?? "";
  const isLobby = LOBBY_PHASES.has(phase);

  // Compute timer end time with clock offset
  const timerEndTime = useMemo(() => {
    if (!state?.timerEndsAt) return null;
    return state.timerEndsAt + clockOffset;
  }, [state?.timerEndsAt, clockOffset]);

  // Get name/color from query params (set by landing page navigation)
  const qName = searchParams?.get("name") ?? "Player";
  const qColor = searchParams?.get("color") ?? "#FF3366";

  // Connect to room on mount.
  useEffect(() => {
    if (!ready || initialized.current) return;
    if (connected && room) return;

    const isCreateRoute = routeCode === "NEW" || routeCode.length !== 4;

    if (isCreateRoute) {
      initialized.current = true;
      createRoom({ name: qName, color: qColor }).catch((err) => {
        console.error("Failed to create room:", err);
        initialized.current = false;
      });
      return;
    }

    if (!routeCode) return;

    // Join existing room with name/color from query params
    initialized.current = true;
    joinRoom(routeCode, qName, qColor).catch((err) => {
      console.error("Failed to join room:", err);
      initialized.current = false;
    });
  }, [ready, routeCode, connected, room, createRoom, joinRoom, qName, qColor]);

  // Navigate to the real room URL once we have the room code.
  useEffect(() => {
    if (!roomCode) return;
    if (roomCode === routeCode) return;
    router.replace(`/room/${roomCode}`);
  }, [roomCode, routeCode, router]);

  // Auto-select game from ?game= query param (host only).
  useEffect(() => {
    if (!connected || !room || !preselectedGame.current || !isHost) return;
    const gId = preselectedGame.current;
    const valid = GAME_MANIFESTS.some((g) => g.id === gId);
    if (valid) {
      sendMessage("host:select-game", { gameId: gId });
    }
    preselectedGame.current = null;
    router.replace(`/room/${roomCode ?? routeCode}`);
  }, [connected, room, isHost, sendMessage, router, roomCode, routeCode]);

  // Audio: stop music on unmount
  useEffect(() => {
    return () => {
      soundManager.stopMusic({ fadeMs: 250 });
    };
  }, []);

  // Per-game BGM
  useEffect(() => {
    if (isLobby || !gameId) {
      soundManager.playMusic("lobby");
      return;
    }
    if (gameId === "brain-board" || gameId === "lucky-letters" || gameId === "survey-smash") {
      soundManager.playMusic(gameId);
    } else {
      soundManager.playMusic("lobby");
    }
  }, [isLobby, gameId]);

  // Phase transition SFX
  useEffect(() => {
    if (prevAudioPhase.current !== phase) {
      sounds.whoosh();
      if (phase === "final-scores") sounds.win();
      prevAudioPhase.current = phase;
    }
  }, [phase]);

  // Phase transition overlay
  useEffect(() => {
    if (phase === "lobby") {
      setShowTransition(false);
      prevPhase.current = phase;
      return;
    }

    if (prevPhase.current !== phase) {
      const label = formatPhaseLabel(phase);
      const isLastRound = state?.round === state?.totalRounds && (state?.round ?? 0) > 0;

      const displayLabel =
        isLastRound && (phase === "round-transition" || phase === "round-intro")
          ? "FINAL ROUND"
          : label;

      if (displayLabel) {
        setTransitionLabel(displayLabel);
        const standings = playerList.map((p) => ({ name: p.name, score: p.score }));
        const commentary = analyzeGameState(standings, isLastRound ?? false);
        setTransitionSubtitle(commentary ?? (isLastRound ? getLastRoundCommentary() : null));
        setShowTransition(true);
        sounds.reveal();
        const timer = setTimeout(() => setShowTransition(false), 2000);
        prevPhase.current = phase;
        return () => clearTimeout(timer);
      }
    }
    prevPhase.current = phase;
  }, [phase, playerList, state?.round, state?.totalRounds]);

  // Loading / reconnecting state
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
      <main className="flex min-h-dvh flex-col items-center justify-center bg-bg-dark">
        <div className="flex flex-col items-center gap-6">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/40 border-t-primary sm:h-16 sm:w-16" />
          <p className="px-4 text-center font-display text-xl text-text-primary sm:text-4xl">
            {label}
          </p>
          {error && <p className="px-4 text-center text-base text-accent-6 sm:text-xl">{error}</p>}
          {!reconnecting && !isCreateRoute && (
            <a
              href="/"
              className="mt-4 font-body text-sm text-text-muted underline transition-colors hover:text-text-primary"
            >
              Back to home
            </a>
          )}
        </div>
      </main>
    );
  }

  // Lobby phase
  if (isLobby) {
    return (
      <UnifiedLobby
        roomCode={roomCode ?? routeCode}
        players={playerList}
        selectedGameId={gameId}
        complexity={state?.complexity ?? "standard"}
        isHost={isHost}
        mySessionId={mySessionId}
        sendMessage={sendMessage}
      />
    );
  }

  // Game phase
  const myScore = myPlayer?.score ?? 0;
  const myColor = myPlayer?.avatarColor ?? "#6366f1";
  const myRank = (() => {
    const sorted = [...playerList].sort((a, b) => b.score - a.score);
    const idx = sorted.findIndex((p) => p.sessionId === myPlayer?.sessionId);
    return idx >= 0 ? idx + 1 : playerList.length;
  })();

  return (
    <main className="relative flex min-h-dvh flex-col pb-14 pt-2">
      {/* Phase transition overlay */}
      {showTransition && (
        <PhaseTransition
          label={transitionLabel}
          gameId={gameId}
          round={state?.round ?? 0}
          totalRounds={state?.totalRounds ?? 0}
          subtitle={transitionSubtitle}
          isFinalRound={state?.round === state?.totalRounds && (state?.round ?? 0) > 0}
        />
      )}

      {/* Reaction overlay */}
      <ReactionOverlay room={room} />

      {/* Volume control */}
      <VolumeControl />

      {/* Timer bar */}
      <TimerBar timerEndsAt={timerEndTime ?? 0} />

      {/* Game content with phase transitions */}
      <AnimatePresence mode="wait">
        <motion.div key={`${gameId}-${phase}`} {...phaseTransition} className="flex-1">
          <UnifiedGameView
            gameId={gameId}
            phase={phase}
            round={state?.round ?? 0}
            totalRounds={state?.totalRounds ?? 0}
            players={playerList}
            gamePayload={(gameData as unknown as Record<string, unknown>) ?? {}}
            privateData={privateData}
            gameEvents={gameEvents}
            mySessionId={mySessionId}
            isHost={isHost}
            timerEndTime={timerEndTime}
            sendMessage={sendMessage}
            room={room}
            errorNonce={errorNonce}
          />
        </motion.div>
      </AnimatePresence>

      {/* View Reels button (final-scores phase only) */}
      {phase === "final-scores" && (
        <motion.div
          className="fixed bottom-20 left-1/2 z-30 -translate-x-1/2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 0.5 }}
        >
          <button
            type="button"
            onClick={() => setShowReels(true)}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-6 py-3 font-display text-sm font-bold text-text-primary backdrop-blur-md transition-all hover:bg-white/20 active:scale-95 sm:text-base"
          >
            <span aria-hidden="true">{"\u{1F3AC}"}</span>
            Game Reels
          </button>
        </motion.div>
      )}

      {/* Game Reels overlay */}
      {showReels && (
        <GameReels players={playerList} gameId={gameId} onClose={() => setShowReels(false)} />
      )}

      {/* Score badge footer */}
      <ScoreBadge
        avatarColor={myColor}
        score={myScore}
        rank={myRank}
        totalPlayers={playerList.length}
        players={playerList}
        mySessionId={mySessionId}
      />
    </main>
  );
}

function formatPhaseLabel(phase: string): string {
  const labels: Record<string, string> = {
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
    "round-intro": "New Round!",
    spinning: "Spin the Wheel!",
    "guess-consonant": "Pick a Consonant",
    "buy-vowel": "Buying a Vowel",
    "solve-attempt": "Solving...",
    "letter-result": "Letter Reveal",
    "round-result": "Round Complete",
    "bonus-round": "Bonus Round!",
    "bonus-reveal": "Bonus Reveal",
    "question-reveal": "New Question!",
    "face-off": "Face Off!",
    guessing: "Guess an Answer",
    strike: "Strike!",
    "steal-chance": "Snag It!",
    "answer-reveal": "The People Say...",
    "lightning-round": "Lightning Round!",
    "lightning-round-reveal": "Lightning Round Results",
    "final-scores": "Final Scores",
  };
  return labels[phase] ?? "";
}
