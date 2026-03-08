"use client";

import type { PlayerData } from "@flimflam/shared";
import {
  AnimatedCounter,
  ConfettiBurst,
  GlassPanel,
  type MotionFidelity,
  createScopedTimeline,
  sounds,
} from "@flimflam/ui";
import { useEffect, useRef, useState } from "react";
import { PlayerAvatar, getPlayerColor, getPlayerName } from "./bb-helpers";
import type { ClueResultData } from "./bb-types";

interface AnswerRevealSequenceProps {
  clueResult: ClueResultData;
  players: PlayerData[];
  motionFidelity: MotionFidelity;
}

function getCelebrationTier(value: number): "subtle" | "medium" | "full" {
  if (value >= 1000) return "full";
  if (value >= 600) return "medium";
  return "subtle";
}

function getConfettiPreset(tier: "subtle" | "medium" | "full") {
  if (tier === "full") return "celebration" as const;
  if (tier === "medium") return "win" as const;
  return "correct" as const;
}

export function AnswerRevealSequence({
  clueResult,
  players,
  motionFidelity,
}: AnswerRevealSequenceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isReduced = motionFidelity === "minimal";
  const [confettiTriggered, setConfettiTriggered] = useState(false);

  const correctCountFromResults = clueResult.results.filter((r) => r.correct).length;
  const correctCount =
    typeof clueResult.correctCount === "number" ? clueResult.correctCount : correctCountFromResults;
  const anyCorrect =
    typeof clueResult.anyCorrect === "boolean"
      ? clueResult.anyCorrect
      : typeof clueResult.correct === "boolean"
        ? clueResult.correct
        : correctCountFromResults > 0;

  const tier = getCelebrationTier(clueResult.value);

  // Check for speed bonuses
  const hasSpeedBonus = clueResult.results.some((r) => r.speedBonus && r.speedBonus > 0);

  useEffect(() => {
    if (isReduced || !containerRef.current) return;

    const container = containerRef.current;
    const q = (sel: string) => container.querySelectorAll(sel);

    const tl = createScopedTimeline(containerRef);

    // 0ms: Dim overlay
    tl.to(q('[data-anim="dim"]'), { opacity: 0.3, duration: 0.4 }, 0);

    // 400ms: Question scales up
    tl.fromTo(
      q('[data-anim="question"]'),
      { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 0.35 },
      0.4,
    );

    // 800ms: Drumroll moment - "The answer is..." with pulsing
    tl.fromTo(
      q('[data-anim="drumroll"]'),
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1, duration: 0.3, ease: "power2.out" },
      0.8,
    );
    tl.call(() => sounds.gameDrumroll(), [], 0.8);

    // Pulsing effect
    tl.to(
      q('[data-anim="drumroll"]'),
      { scale: 1.08, duration: 0.3, repeat: 3, yoyo: true, ease: "power1.inOut" },
      1.0,
    );

    // Tempo ticks
    tl.call(() => sounds.tick(), [], 1.0);
    tl.call(() => sounds.tick(), [], 1.25);
    tl.call(() => sounds.tick(), [], 1.45);
    tl.call(() => sounds.tick(), [], 1.6);
    tl.call(() => sounds.tick(), [], 1.72);

    // Hide drumroll
    tl.to(q('[data-anim="drumroll"]'), { opacity: 0, duration: 0.2 }, 1.85);

    // 2.0s: Correct answer card flips in
    tl.fromTo(
      q('[data-anim="answer"]'),
      { opacity: 0, scale: 0.8, rotateX: -90 },
      { opacity: 1, scale: 1, rotateX: 0, duration: 0.5, ease: "back.out(1.4)" },
      2.0,
    );

    tl.call(() => sounds.cardFlip(), [], 2.0);

    // 2.5s: Verdict flash + confetti or shake
    if (anyCorrect) {
      tl.call(
        () => {
          setConfettiTriggered(true);
          sounds.correct();
        },
        [],
        2.5,
      );
      // Green flash
      tl.fromTo(
        q('[data-anim="verdict-flash"]'),
        { opacity: 0.5 },
        { opacity: 0, duration: 0.4 },
        2.5,
      );
    } else {
      tl.fromTo(
        q('[data-anim="answer"]'),
        { x: 0 },
        { x: 10, duration: 0.08, repeat: 5, yoyo: true, ease: "power1.inOut" },
        2.5,
      );
      tl.call(() => sounds.strike(), [], 2.5);
      // Red flash
      tl.fromTo(
        q('[data-anim="verdict-flash-wrong"]'),
        { opacity: 0.4 },
        { opacity: 0, duration: 0.4 },
        2.5,
      );
    }

    // 3.0s: Speed bonus badge pop-in
    if (hasSpeedBonus) {
      tl.fromTo(
        q('[data-anim="speed-bonus"]'),
        { opacity: 0, scale: 0, y: 10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: "back.out(2)" },
        3.0,
      );
      tl.call(() => sounds.speedBonus(), [], 3.0);
    }

    // 3.2s+: Player results stagger in
    tl.fromTo(
      q('[data-anim="result"]'),
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.3, stagger: 0.3 },
      3.2,
    );

    return () => {
      tl.kill();
    };
  }, [isReduced, anyCorrect, hasSpeedBonus]);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center gap-8 p-8"
    >
      {/* Dim overlay */}
      <div
        data-anim="dim"
        className={`absolute inset-0 pointer-events-none ${isReduced ? "bg-black/30" : "bg-black/0"}`}
      />

      {/* Verdict flash overlays */}
      <div
        data-anim="verdict-flash"
        className="absolute inset-0 pointer-events-none bg-success/20 opacity-0"
      />
      <div
        data-anim="verdict-flash-wrong"
        className="absolute inset-0 pointer-events-none bg-destructive/20 opacity-0"
      />

      {/* Power Play badge */}
      {clueResult.isPowerPlay && (
        <span
          className="font-display text-[clamp(24px,3vw,36px)] font-bold"
          style={{ color: "oklch(0.82 0.2 85)" }}
        >
          POWER PLAY
        </span>
      )}

      {/* Question */}
      <div data-anim="question" className={isReduced ? "" : "opacity-0"}>
        <GlassPanel className="max-w-3xl px-12 py-6">
          <p className="text-center font-body text-[clamp(24px,3vw,36px)] text-text-muted">
            {clueResult.question}
          </p>
        </GlassPanel>
      </div>

      {/* Drumroll moment */}
      <div data-anim="drumroll" className={isReduced ? "hidden" : "opacity-0"}>
        <span className="font-display text-[clamp(28px,3.5vw,40px)] font-bold text-accent-brainboard animate-pulse">
          The answer is...
        </span>
      </div>

      {/* Correct answer */}
      <div
        data-anim="answer"
        className={`flex flex-col items-center gap-3 ${isReduced ? "" : "opacity-0 scale-[0.8]"}`}
        style={{ perspective: "800px" }}
      >
        <span className="font-display text-[clamp(20px,2vw,28px)] text-text-muted uppercase tracking-wider">
          Correct Answer
        </span>
        <span className="font-display text-[clamp(36px,4.5vw,56px)] font-bold text-accent-brainboard">
          {clueResult.correctAnswer}
        </span>
      </div>

      {/* Speed bonus badge */}
      {hasSpeedBonus && (
        <div data-anim="speed-bonus" className={isReduced ? "" : "opacity-0"}>
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-4 py-2 font-display text-sm font-bold text-amber-400 uppercase tracking-wider"
            style={{ boxShadow: "0 0 16px oklch(0.82 0.18 85 / 0.3)" }}
          >
            +SPEED BONUS
          </span>
        </div>
      )}

      {/* Correct count summary */}
      <div data-anim="result" className={isReduced ? "" : "opacity-0"}>
        <span className="font-display text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary">
          {anyCorrect
            ? correctCount === 1
              ? "1 player got it!"
              : `${correctCount} players got it!`
            : "No one got it!"}
        </span>
      </div>

      {/* Player results */}
      {clueResult.results.map((r) => {
        const pName = getPlayerName(players, r.sessionId);
        const pColor = getPlayerColor(players, r.sessionId);
        return (
          <div
            key={r.sessionId}
            data-anim="result"
            className={`flex items-center gap-3 rounded-xl px-5 py-3 ${
              isReduced ? "" : "opacity-0"
            } ${
              r.correct
                ? "bg-success/15 border border-success/30"
                : r.answer
                  ? "bg-accent-6/10 border border-accent-6/20"
                  : "bg-white/5 border border-white/10"
            }`}
          >
            <PlayerAvatar name={pName} color={pColor} size={32} />
            <span className="font-body text-[16px] text-text-primary">{pName}</span>
            <span
              className={`font-body text-[14px] italic ${r.correct ? "text-success" : "text-text-muted"}`}
            >
              {r.answer || "(no answer)"}
            </span>
            {r.speedBonus && r.speedBonus > 0 && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-400">
                +{r.speedBonus} speed
              </span>
            )}
            {r.delta !== 0 && (
              <AnimatedCounter
                value={r.delta}
                duration={800}
                format={(v) => `${v > 0 ? "+" : ""}${v}`}
                className={`text-[14px] font-bold ${r.delta > 0 ? "text-success" : "text-accent-6"}`}
              />
            )}
          </div>
        );
      })}

      <ConfettiBurst
        trigger={isReduced ? anyCorrect : confettiTriggered}
        preset={getConfettiPreset(tier)}
      />
    </div>
  );
}
