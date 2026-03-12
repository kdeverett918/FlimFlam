"use client";

import { GameReels } from "@/components/game/GameReels";
import { useGameRoomContext } from "@/components/game/GameRoomProvider";
import {
  HUD_BOTTOM_DOCK_COLLAPSED_HEIGHT,
  HUD_BOTTOM_DOCK_EXPANDED_HEIGHT,
  HUD_TOP_DOCK_HEIGHT,
  HudShell,
} from "@/components/game/HudShell";
import { PhaseTransition } from "@/components/game/PhaseTransition";
import { ReactionOverlay } from "@/components/game/ReactionOverlay";
import { VolumeControl } from "@/components/game/VolumeControl";
import { UnifiedGameView } from "@/components/games/UnifiedGameView";
import { UnifiedLobby } from "@/components/lobby/UnifiedLobby";
import { GAME_MANIFESTS, analyzeGameState, getLastRoundCommentary } from "@flimflam/shared";
import { emitAudioEvent, soundManager } from "@flimflam/ui";
import { AnimatePresence, motion } from "motion/react";
import { useParams, useSearchParams } from "next/navigation";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";

const LOBBY_PHASES = new Set(["lobby", "", "between-games"]);
const REACTION_SUPPRESSED_PHASES = new Set([
  "topic-chat",
  "generating-board",
  "category-submit",
  "category-vote",
  "clue-select",
  "guessing",
  "answering",
  "all-in-answer",
  "solve-attempt",
]);
const VOLUME_ALLOWED_PHASES = new Set(["final-scores", "round-result", "bonus-reveal"]);
const BOTTOM_DOCK_HIDDEN_PHASES = new Set([
  "topic-chat",
  "generating-board",
  "category-submit",
  "category-vote",
]);
const BRAIN_BOARD_BOTTOM_DOCK_HIDDEN_PHASES = new Set([
  "clue-select",
  "answering",
  "power-play-wager",
  "power-play-answer",
  "all-in-wager",
  "all-in-answer",
]);
const LUCKY_LETTERS_REACTION_SUPPRESSED_PHASES = new Set([
  "round-intro",
  "spinning",
  "guess-consonant",
  "buy-vowel",
  "bonus-round",
]);
const LUCKY_LETTERS_BOTTOM_DOCK_HIDDEN_PHASES = new Set([
  "category-vote",
  "round-intro",
  "spinning",
  "guess-consonant",
  "buy-vowel",
  "solve-attempt",
  "bonus-pick",
  "bonus-solve",
  "bonus-round",
]);
const MACRO_TRANSITION_PHASES: Record<string, Set<string>> = {
  "brain-board": new Set([
    "category-reveal",
    "round-transition",
    "all-in-category",
    "all-in-reveal",
    "final-scores",
  ]),
  "lucky-letters": new Set(["round-intro", "round-result", "bonus-round", "final-scores"]),
  "survey-smash": new Set([
    "question-reveal",
    "answer-reveal",
    "lightning-round-reveal",
    "final-scores",
  ]),
};
const ROOM_WHOOSH_PHASES: Record<string, Set<string>> = {
  "brain-board": new Set([
    "category-reveal",
    "round-transition",
    "all-in-category",
    "final-scores",
  ]),
  "lucky-letters": new Set(["round-intro", "round-result", "bonus-round", "final-scores"]),
  "survey-smash": new Set(["question-reveal", "lightning-round", "final-scores"]),
};
const ROOM_REVEAL_PHASES: Record<string, Set<string>> = {
  "brain-board": new Set(["category-reveal", "round-transition", "all-in-category"]),
  "lucky-letters": new Set(["round-intro", "round-result", "bonus-round"]),
  "survey-smash": new Set(["question-reveal", "lightning-round"]),
};
const ROOM_AUDIO_DEDUPE_MS = 2500;
const ROOM_AUDIO_THROTTLE_MS = 120;

const phaseTransition = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(2px)",
    transition: { duration: 0.25, ease: [0.4, 0, 1, 1] as const },
  },
};

function shouldShowReactionBar(gameId: string, phase: string, isInputFocused: boolean): boolean {
  if (isInputFocused || phase === "final-scores") return false;
  if (REACTION_SUPPRESSED_PHASES.has(phase)) return false;
  if (gameId === "lucky-letters" && LUCKY_LETTERS_REACTION_SUPPRESSED_PHASES.has(phase)) {
    return false;
  }
  return true;
}

function shouldShowBottomDock(gameId: string, phase: string): boolean {
  if (BOTTOM_DOCK_HIDDEN_PHASES.has(phase)) return false;
  if (gameId === "brain-board" && BRAIN_BOARD_BOTTOM_DOCK_HIDDEN_PHASES.has(phase)) {
    return false;
  }
  if (gameId === "lucky-letters" && LUCKY_LETTERS_BOTTOM_DOCK_HIDDEN_PHASES.has(phase)) {
    return false;
  }
  return true;
}

function shouldShowPhaseTransition(gameId: string, phase: string): boolean {
  const allowlist = MACRO_TRANSITION_PHASES[gameId];
  if (!allowlist) {
    return phase === "final-scores";
  }
  return allowlist.has(phase);
}

function shouldPlayRoomCue(
  phaseMap: Record<string, Set<string>>,
  gameId: string,
  phase: string,
): boolean {
  const allowlist = phaseMap[gameId];
  if (!allowlist) return phase === "final-scores";
  return allowlist.has(phase);
}

export default function RoomPage() {
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
    leaveRoom,
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
  const [isInputFocused, setIsInputFocused] = useState(false);
  const hasAutoUnlockedAudio = useRef(false);
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

  // Get name/color from query params (set by landing page navigation).
  // Store in refs so they survive URL changes (router.replace drops params).
  const qNameRef = useRef(searchParams?.get("name") ?? "Player");
  const qColorRef = useRef(searchParams?.get("color") ?? "#FF3366");
  // Update refs if fresh query params arrive (e.g. direct navigation with params)
  const freshName = searchParams?.get("name");
  const freshColor = searchParams?.get("color");
  if (freshName) qNameRef.current = freshName;
  if (freshColor) qColorRef.current = freshColor;

  // Connect to room on mount.
  useEffect(() => {
    if (!ready || initialized.current) return;
    if (connected && room) return;

    const isCreateRoute = routeCode === "NEW" || routeCode.length !== 4;
    const name = qNameRef.current;
    const color = qColorRef.current;

    if (isCreateRoute) {
      initialized.current = true;
      createRoom({ name, color }).catch((err) => {
        console.error("Failed to create room:", err);
        initialized.current = false;
      });
      return;
    }

    if (!routeCode) return;

    // Join existing room with name/color from query params
    initialized.current = true;
    joinRoom(routeCode, name, color).catch((err) => {
      console.error("Failed to join room:", err);
      initialized.current = false;
    });
  }, [ready, routeCode, connected, room, createRoom, joinRoom]);

  // Update the URL to show the real room code (without triggering Next.js re-navigation).
  useEffect(() => {
    if (!roomCode) return;
    if (roomCode === routeCode) return;
    // Use history.replaceState to avoid re-mounting the layout/provider,
    // which would cause a double-join to the Colyseus room.
    window.history.replaceState(null, "", `/room/${roomCode}`);
  }, [roomCode, routeCode]);

  // Auto-select game from ?game= query param (host only).
  useEffect(() => {
    if (!connected || !room || !preselectedGame.current || !isHost) return;
    const gId = preselectedGame.current;
    const valid = GAME_MANIFESTS.some((g) => g.id === gId);
    if (valid) {
      sendMessage("host:select-game", { gameId: gId });
    }
    preselectedGame.current = null;
    window.history.replaceState(null, "", `/room/${roomCode ?? routeCode}`);
  }, [connected, room, isHost, sendMessage, roomCode, routeCode]);

  // Audio: stop music on unmount
  useEffect(() => {
    return () => {
      soundManager.stopMusic({ fadeMs: 250 });
    };
  }, []);

  // E2E: enable audio/motion event capture when requested by the test harness.
  useEffect(() => {
    soundManager.setE2EEnabled(process.env.NEXT_PUBLIC_FLIMFLAM_E2E === "1");
  }, []);

  // Auto-unlock audio on the first user gesture so gameplay cues work without opening volume controls.
  useEffect(() => {
    if (hasAutoUnlockedAudio.current) return;

    const unlock = () => {
      if (hasAutoUnlockedAudio.current) return;
      hasAutoUnlockedAudio.current = true;
      soundManager.unlock();
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };

    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);
    return () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
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
    if (prevAudioPhase.current === phase) return;
    const previousPhase = prevAudioPhase.current;
    prevAudioPhase.current = phase;
    if (isLobby || !gameId) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

    const round = state?.round ?? 0;
    const context = `phase:${previousPhase}->${phase}:round:${round}`;
    if (shouldPlayRoomCue(ROOM_WHOOSH_PHASES, gameId, phase)) {
      soundManager.playSfx("game:whoosh", {
        source: "room-shell",
        context,
        dedupeKey: `room-shell:whoosh:${gameId}:${phase}:${round}`,
        dedupeMs: ROOM_AUDIO_DEDUPE_MS,
        throttleMs: ROOM_AUDIO_THROTTLE_MS,
      });
    }
    if (phase === "final-scores") {
      soundManager.playSfx("celebration:win", {
        source: "room-shell",
        context,
        dedupeKey: `room-shell:win:${gameId}:${phase}:${round}`,
        dedupeMs: ROOM_AUDIO_DEDUPE_MS,
        throttleMs: ROOM_AUDIO_THROTTLE_MS,
      });
    }
  }, [gameId, isLobby, phase, state?.round]);

  // Phase transition overlay
  useEffect(() => {
    if (phase === "lobby") {
      setShowTransition(false);
      prevPhase.current = phase;
      return;
    }

    if (prevPhase.current !== phase) {
      if (!shouldShowPhaseTransition(gameId, phase)) {
        setShowTransition(false);
        prevPhase.current = phase;
        return;
      }

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
        if (shouldPlayRoomCue(ROOM_REVEAL_PHASES, gameId, phase)) {
          const round = state?.round ?? 0;
          soundManager.playSfx("game:reveal", {
            source: "room-shell",
            context: `phase-transition:${gameId}:${phase}:round:${round}`,
            dedupeKey: `room-shell:reveal:${gameId}:${phase}:${round}`,
            dedupeMs: ROOM_AUDIO_DEDUPE_MS,
            throttleMs: ROOM_AUDIO_THROTTLE_MS,
          });
          if (gameId === "brain-board" && phase === "category-reveal") {
            emitAudioEvent("audio.brain.board.reveal", { round, phase });
          }
        }
        const timer = setTimeout(() => setShowTransition(false), 2000);
        prevPhase.current = phase;
        return () => clearTimeout(timer);
      }
    }
    prevPhase.current = phase;
  }, [phase, gameId, playerList, state?.round, state?.totalRounds]);

  useEffect(() => {
    const syncFocusState = () => {
      setIsInputFocused(isEditableElement(document.activeElement));
    };

    const deferredSync = () => requestAnimationFrame(syncFocusState);

    syncFocusState();
    document.addEventListener("focusin", syncFocusState, true);
    document.addEventListener("focusout", deferredSync, true);
    return () => {
      document.removeEventListener("focusin", syncFocusState, true);
      document.removeEventListener("focusout", deferredSync, true);
    };
  }, []);

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
        onLeave={leaveRoom}
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

  const showReactionBar = shouldShowReactionBar(gameId, phase, isInputFocused);
  const showBottomDock = shouldShowBottomDock(gameId, phase);
  const showVolumeControl = !isInputFocused && VOLUME_ALLOWED_PHASES.has(phase);
  const bottomDockHeight = !showBottomDock
    ? 0
    : showReactionBar
      ? HUD_BOTTOM_DOCK_EXPANDED_HEIGHT
      : HUD_BOTTOM_DOCK_COLLAPSED_HEIGHT;
  const hudSafeTop = `calc(env(safe-area-inset-top) + ${HUD_TOP_DOCK_HEIGHT}px)`;
  const hudSafeBottom = `calc(env(safe-area-inset-bottom) + ${bottomDockHeight}px)`;
  const roomShellStyle: CSSProperties & Record<"--hud-safe-top" | "--hud-safe-bottom", string> = {
    "--hud-safe-top": hudSafeTop,
    "--hud-safe-bottom": hudSafeBottom,
    paddingTop: "var(--hud-safe-top)",
    paddingBottom: "var(--hud-safe-bottom)",
  };

  return (
    <main className="relative flex min-h-dvh flex-col" style={roomShellStyle}>
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

      {showVolumeControl && <VolumeControl />}

      <div className={showTransition ? "pointer-events-none" : undefined}>
        <HudShell
          gameId={gameId}
          isHost={isHost}
          phase={phase}
          timerEndTime={timerEndTime}
          sendMessage={sendMessage}
          showReactions={showReactionBar}
          showBottomDock={showBottomDock}
          myScore={myScore}
          myColor={myColor}
          myRank={myRank}
          players={playerList}
          mySessionId={mySessionId}
        />
      </div>

      {/* Game content with phase transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${gameId}-${phase}`}
          {...phaseTransition}
          className={`flex-1 ${showTransition ? "invisible pointer-events-none" : ""}`}
          data-testid="hero-surface"
        >
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
          className="fixed left-1/2 z-30 -translate-x-1/2"
          style={{
            bottom: "calc(var(--hud-safe-bottom) + 20px)",
          }}
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
    </main>
  );
}

function isEditableElement(target: Element | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName;
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target.isContentEditable
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
