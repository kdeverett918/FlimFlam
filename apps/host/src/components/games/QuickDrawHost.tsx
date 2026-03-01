"use client";

import { Scoreboard } from "@/components/game/Scoreboard";
import { Timer } from "@/components/game/Timer";
import type { DrawStrokeBroadcast, PlayerData, ScoreEntry } from "@partyline/shared";
import { AnimatedBackground, GlassPanel } from "@partyline/ui";
import type { Room } from "colyseus.js";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil } from "lucide-react";
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
  if (phase === "drawing" || phase === "guessing") {
    return (
      <ActiveRoundView
        phase={phase}
        round={round}
        totalRounds={totalRounds}
        players={players}
        payload={payload}
        timerEndTime={timerEndTime}
        room={room}
      />
    );
  }

  switch (phase) {
    case "picking-drawer":
      return <PickingDrawerView payload={payload} players={players} />;
    case "word-reveal":
      return <WordRevealView payload={payload} players={players} />;
    case "final-scores":
      return <DrawFinalScoresView players={players} />;
    default:
      return (
        <div className="flex min-h-screen items-center justify-center">
          <AnimatedBackground variant="subtle" />
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
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8">
      <AnimatedBackground />
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
        className="relative z-10"
      >
        <Pencil className="h-24 w-24 text-accent-4" />
      </motion.div>
      <h2
        className="relative z-10 font-display text-[56px] font-bold text-text-primary"
        style={{ textShadow: "0 0 30px oklch(0.75 0.15 195 / 0.4)" }}
      >
        PICKING THE ARTIST...
      </h2>
      {drawer && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
          className="relative z-10 flex flex-col items-center gap-4"
        >
          <div
            className="flex h-[100px] w-[100px] items-center justify-center rounded-full font-body text-[48px] font-bold text-bg-deep"
            style={{
              backgroundColor: drawer.avatarColor,
              boxShadow: `0 0 30px ${drawer.avatarColor}60`,
            }}
          >
            {drawer.name.charAt(0).toUpperCase()}
          </div>
          <span className="font-display text-[40px] font-bold text-accent-4">
            {drawer.name} is drawing!
          </span>
        </motion.div>
      )}
    </div>
  );
}

function ActiveRoundView({
  phase,
  round,
  totalRounds,
  players,
  payload,
  timerEndTime,
  room,
}: {
  phase: "drawing" | "guessing";
  round: number;
  totalRounds: number;
  players: PlayerData[];
  payload: Record<string, unknown>;
  timerEndTime: number | null;
  room: Room | null;
}) {
  const drawerId = payload.drawerId as string | undefined;
  const drawer = players.find((p) => p.sessionId === drawerId);
  const guesses =
    (payload.recentGuesses as Array<{ playerName: string; guess: string; correct: boolean }>) ?? [];

  const isGuessing = phase === "guessing";

  return (
    <div className="relative flex min-h-screen flex-col p-8">
      <AnimatedBackground variant="subtle" />
      <div className="relative z-10 mb-4 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="font-display text-[28px] font-semibold text-text-muted">
            ROUND {round} / {totalRounds}
          </span>
          {drawer && (
            <span className="font-body text-[28px] text-accent-4">
              {isGuessing ? `Artist: ${drawer.name}` : `${drawer.name} is drawing`}
            </span>
          )}
          {isGuessing && (
            <h2 className="font-display text-[36px] font-bold text-accent-4">GUESS!</h2>
          )}
        </div>
        {timerEndTime && <Timer endTime={timerEndTime} />}
      </div>

      <div className={`relative z-10 flex flex-1 gap-6 ${isGuessing ? "" : "justify-center"}`}>
        <div className={isGuessing ? "flex-1" : "w-full max-w-[960px]"}>
          <div className="mx-auto aspect-[4/3] max-h-[70vh] max-w-[960px]">
            <GlassPanel rounded="2xl" className="h-full w-full overflow-hidden p-1">
              <CanvasMirror room={room} />
            </GlassPanel>
          </div>
        </div>

        {isGuessing && (
          <GlassPanel rounded="2xl" className="w-[320px] overflow-hidden p-4">
            <h3 className="mb-4 font-display text-[24px] font-bold text-accent-4">GUESSES</h3>
            <div className="flex max-h-[65vh] flex-col gap-2 overflow-y-auto pr-1">
              <AnimatePresence>
                {guesses.map((guess, i) => (
                  <motion.div
                    key={`${guess.playerName}-${i}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <GlassPanel
                      glow={guess.correct}
                      glowColor="oklch(0.75 0.15 195 / 0.3)"
                      rounded="lg"
                      className="p-3"
                    >
                      <span className="font-body text-[18px] font-medium text-text-muted">
                        {guess.playerName}:
                      </span>{" "}
                      <span
                        className={`font-body text-[20px] ${
                          guess.correct ? "font-bold text-accent-4" : "text-text-primary"
                        }`}
                      >
                        {guess.correct ? "GOT IT!" : guess.guess}
                      </span>
                    </GlassPanel>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </GlassPanel>
        )}
      </div>
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
  const containerRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const canvasSizeRef = useRef<{ width: number; height: number; dpr: number }>({
    width: 0,
    height: 0,
    dpr: 1,
  });

  const clamp01 = useCallback((n: number) => {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
  }, []);

  const drawStroke = useCallback(
    (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
      const { width, height } = canvasSizeRef.current;
      if (width <= 0 || height <= 0) return;

      const points = stroke.points;
      const firstPoint = points[0];
      if (!firstPoint) return;

      const x0 = clamp01(firstPoint.x) * width;
      const y0 = clamp01(firstPoint.y) * height;

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;

      if (points.length < 2) {
        ctx.beginPath();
        ctx.arc(x0, y0, stroke.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.color;
        ctx.fill();
        return;
      }

      ctx.beginPath();
      ctx.moveTo(x0, y0);

      for (let i = 1; i < points.length; i++) {
        const pt = points[i];
        if (pt) {
          ctx.lineTo(clamp01(pt.x) * width, clamp01(pt.y) * height);
        }
      }

      ctx.stroke();
    },
    [clamp01],
  );

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height, dpr } = canvasSizeRef.current;
    if (width <= 0 || height <= 0) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = "#0d0b14";
    ctx.fillRect(0, 0, width, height);

    for (const stroke of strokesRef.current) {
      drawStroke(ctx, stroke);
    }
  }, [drawStroke]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const dpr = typeof window !== "undefined" ? (window.devicePixelRatio ?? 1) : 1;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      canvasSizeRef.current = { width, height, dpr };
      redrawAll();
    };

    resize();

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [redrawAll]);

  useEffect(() => {
    if (!room) return;

    const handler = (data: DrawStrokeBroadcast) => {
      const stroke: Stroke = {
        points: data.points,
        color: data.color,
        size: data.size,
      };

      strokesRef.current.push(stroke);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { dpr } = canvasSizeRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawStroke(ctx, stroke);
    };

    const unsubscribeStroke = room.onMessage("draw-stroke", handler);

    const clearHandler = () => {
      strokesRef.current = [];
      redrawAll();
    };
    const unsubscribeClear = room.onMessage("clear-canvas", clearHandler);

    const drawClearHandler = () => {
      strokesRef.current = [];
      redrawAll();
    };
    const unsubscribeDrawClear = room.onMessage("draw-clear", drawClearHandler);

    const undoHandler = () => {
      strokesRef.current = strokesRef.current.slice(0, -1);
      redrawAll();
    };
    const unsubscribeUndo = room.onMessage("draw-undo", undoHandler);

    return () => {
      unsubscribeStroke();
      unsubscribeClear();
      unsubscribeDrawClear();
      unsubscribeUndo();
    };
  }, [room, drawStroke, redrawAll]);

  return (
    <div ref={containerRef} className="h-full w-full">
      <canvas
        ref={canvasRef}
        className="h-full w-full rounded-xl"
        style={{ imageRendering: "auto" }}
      />
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
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-10">
      <AnimatedBackground variant="subtle" />
      <h2 className="relative z-10 font-display text-[48px] font-semibold text-text-muted">
        THE WORD WAS
      </h2>
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="relative z-10"
      >
        <GlassPanel
          glow
          glowColor="oklch(0.75 0.15 195 / 0.4)"
          rounded="2xl"
          className="px-12 py-6"
        >
          <span className="font-display text-[96px] font-bold text-accent-4">
            {word.toUpperCase()}
          </span>
        </GlassPanel>
      </motion.div>

      {correctGuessers.length > 0 && (
        <div className="relative z-10 flex flex-col items-center gap-4">
          <p className="font-body text-[28px] text-accent-4">Correct guessers:</p>
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
                    className="flex h-[60px] w-[60px] items-center justify-center rounded-full font-body text-[28px] font-bold text-bg-deep"
                    style={{ backgroundColor: player.avatarColor }}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-body text-[22px] text-text-primary">{player.name}</span>
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
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-10 p-12">
      <AnimatedBackground variant="subtle" />
      <h1 className="relative z-10 font-display text-[64px] font-bold text-accent-4">
        FINAL SCORES
      </h1>
      <div className="relative z-10 w-full max-w-4xl">
        <Scoreboard scores={scores} />
      </div>
    </div>
  );
}
