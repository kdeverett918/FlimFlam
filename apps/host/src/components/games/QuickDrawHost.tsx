"use client";

import { Scoreboard } from "@/components/game/Scoreboard";
import { Timer } from "@/components/game/Timer";
import type { DrawStrokeBroadcast, PlayerData, ScoreEntry } from "@partyline/shared";
import type { Room } from "colyseus.js";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef } from "react";

interface QuickDrawHostProps {
  phase: string;
  round: number;
  totalRounds: number;
  players: PlayerData[];
  payload: Record<string, unknown>;
  timerEndTime: number | null;
  room: Room | null;
}

export function QuickDrawHost({
  phase,
  round,
  totalRounds,
  players,
  payload,
  timerEndTime,
  room,
}: QuickDrawHostProps) {
  switch (phase) {
    case "picking-drawer":
      return <PickingDrawerView payload={payload} players={players} />;
    case "drawing":
      return (
        <DrawingView
          payload={payload}
          players={players}
          timerEndTime={timerEndTime}
          round={round}
          totalRounds={totalRounds}
          room={room}
        />
      );
    case "guessing":
      return (
        <GuessingView payload={payload} players={players} timerEndTime={timerEndTime} room={room} />
      );
    case "word-reveal":
      return <WordRevealView payload={payload} players={players} />;
    case "final-scores":
      return <DrawFinalScoresView players={players} />;
    default:
      return (
        <div className="flex min-h-screen items-center justify-center">
          <p className="font-display text-[36px] text-text-muted">Quick Draw - {phase}</p>
        </div>
      );
  }
}

function PickingDrawerView({
  payload,
  players,
}: {
  payload: Record<string, unknown>;
  players: PlayerData[];
}) {
  const drawerId = payload.drawerId as string | undefined;
  const drawer = players.find((p) => p.sessionId === drawerId);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8">
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
        className="text-[96px]"
      >
        {"\u270F\uFE0F"}
      </motion.div>
      <h2 className="font-display text-[56px] text-text-primary">PICKING THE ARTIST...</h2>
      {drawer && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
          className="flex flex-col items-center gap-4"
        >
          <div
            className="flex h-[100px] w-[100px] items-center justify-center rounded-full text-[48px] font-bold text-bg-dark"
            style={{
              backgroundColor: drawer.avatarColor,
              boxShadow: `0 0 30px ${drawer.avatarColor}60`,
            }}
          >
            {drawer.name.charAt(0).toUpperCase()}
          </div>
          <span className="font-display text-[40px] text-accent-2">{drawer.name} is drawing!</span>
        </motion.div>
      )}
    </div>
  );
}

interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  size: number;
}

function CanvasMirror({ room }: { room: Room | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);

  const drawStroke = useCallback((stroke: Stroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (stroke.points.length < 2) return;

    ctx.beginPath();
    const firstPoint = stroke.points[0];
    if (firstPoint) {
      ctx.moveTo(firstPoint.x * canvas.width, firstPoint.y * canvas.height);
    }
    for (let i = 1; i < stroke.points.length; i++) {
      const pt = stroke.points[i];
      if (pt) {
        ctx.lineTo(pt.x * canvas.width, pt.y * canvas.height);
      }
    }
    ctx.stroke();
  }, []);

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#1a1625";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokesRef.current) {
      drawStroke(stroke);
    }
  }, [drawStroke]);

  useEffect(() => {
    if (!room) return;

    const handler = (data: DrawStrokeBroadcast) => {
      const stroke: Stroke = {
        points: data.points,
        color: data.color,
        size: data.size,
      };
      strokesRef.current.push(stroke);
      drawStroke(stroke);
    };

    const unsubscribeStroke = room.onMessage("draw-stroke", handler);

    // Clear canvas on phase change
    const clearHandler = () => {
      strokesRef.current = [];
      redrawAll();
    };
    const unsubscribeClear = room.onMessage("clear-canvas", clearHandler);

    return () => {
      unsubscribeStroke();
      unsubscribeClear();
    };
  }, [room, drawStroke, redrawAll]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#1a1625";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full rounded-2xl border-2 border-bg-card"
      style={{ imageRendering: "auto" }}
    />
  );
}

function DrawingView({
  payload,
  players,
  timerEndTime,
  round,
  totalRounds,
  room,
}: {
  payload: Record<string, unknown>;
  players: PlayerData[];
  timerEndTime: number | null;
  round: number;
  totalRounds: number;
  room: Room | null;
}) {
  const drawerId = payload.drawerId as string | undefined;
  const drawer = players.find((p) => p.sessionId === drawerId);

  return (
    <div className="flex min-h-screen flex-col p-8">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-display text-[28px] text-text-muted">
            ROUND {round} / {totalRounds}
          </span>
          {drawer && <span className="text-[28px] text-accent-2">{drawer.name} is drawing</span>}
        </div>
        {timerEndTime && <Timer endTime={timerEndTime} />}
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <div className="mx-auto aspect-[4/3] max-h-[70vh] max-w-[960px]">
          <CanvasMirror room={room} />
        </div>
      </div>
    </div>
  );
}

function GuessingView({
  payload,
  players,
  timerEndTime,
  room,
}: {
  payload: Record<string, unknown>;
  players: PlayerData[];
  timerEndTime: number | null;
  room: Room | null;
}) {
  const drawerId = payload.drawerId as string | undefined;
  const drawer = players.find((p) => p.sessionId === drawerId);
  const guesses =
    (payload.recentGuesses as Array<{
      playerName: string;
      guess: string;
      correct: boolean;
    }>) ?? [];

  return (
    <div className="flex min-h-screen flex-col p-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="font-display text-[36px] text-accent-1">GUESS THE DRAWING!</h2>
          {drawer && <span className="text-[24px] text-text-muted">Artist: {drawer.name}</span>}
        </div>
        {timerEndTime && <Timer endTime={timerEndTime} />}
      </div>

      <div className="flex flex-1 gap-6">
        {/* Canvas */}
        <div className="flex-1">
          <div className="aspect-[4/3] max-h-[65vh]">
            <CanvasMirror room={room} />
          </div>
        </div>

        {/* Guess feed */}
        <div className="w-[320px] overflow-hidden rounded-2xl border border-bg-card bg-bg-card/50 p-4">
          <h3 className="mb-4 font-display text-[24px] text-accent-2">GUESSES</h3>
          <div className="flex flex-col gap-2 overflow-y-auto">
            <AnimatePresence>
              {guesses.map((guess, i) => (
                <motion.div
                  key={`${guess.playerName}-${i}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`rounded-xl p-3 ${
                    guess.correct ? "border border-accent-2/50 bg-accent-2/10" : "bg-bg-dark/50"
                  }`}
                >
                  <span className="text-[18px] font-medium text-text-muted">
                    {guess.playerName}:
                  </span>{" "}
                  <span
                    className={`text-[20px] ${guess.correct ? "font-bold text-accent-2" : "text-text-primary"}`}
                  >
                    {guess.correct ? "GOT IT!" : guess.guess}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function WordRevealView({
  payload,
  players,
}: {
  payload: Record<string, unknown>;
  players: PlayerData[];
}) {
  const word = (payload.word as string) ?? "???";
  const correctGuessers = (payload.correctGuessers as string[]) ?? [];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10">
      <h2 className="font-display text-[48px] text-text-muted">THE WORD WAS</h2>
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="font-display text-[96px] text-accent-3"
      >
        {word.toUpperCase()}
      </motion.div>

      {correctGuessers.length > 0 && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-[28px] text-accent-2">Correct guessers:</p>
          <div className="flex gap-4">
            {correctGuessers.map((id) => {
              const player = players.find((p) => p.sessionId === id);
              if (!player) return null;
              return (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div
                    className="flex h-[60px] w-[60px] items-center justify-center rounded-full text-[28px] font-bold text-bg-dark"
                    style={{ backgroundColor: player.avatarColor }}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[22px] text-text-primary">{player.name}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DrawFinalScoresView({ players }: { players: PlayerData[] }) {
  const scores: ScoreEntry[] = players
    .map((p) => ({
      sessionId: p.sessionId,
      name: p.name,
      score: p.score,
      rank: 0,
      breakdown: [],
    }))
    .sort((a, b) => b.score - a.score)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 p-12">
      <h1 className="font-display text-[64px] text-accent-3">FINAL SCORES</h1>
      <div className="w-full max-w-4xl">
        <Scoreboard scores={scores} />
      </div>
    </div>
  );
}
