"use client";

import type { PlayerData } from "@flimflam/shared";
import {
  AnimatedCounter,
  ConfettiBurst,
  GlassPanel,
  createScopedTimeline,
  fireParticleEffect,
  haptics,
  soundManager,
  sounds,
  useReducedMotion,
  withReducedMotion,
} from "@flimflam/ui";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type React from "react";

import { PlayerAvatar, getPlayerColor, getPlayerName } from "../../shared/ll-helpers";
import type { RoundResultData, WheelGameState } from "../../shared/ll-types";

export function HostRoundResult({
  state,
  roundResult,
  players,
  standingsBar,
}: {
  state: WheelGameState;
  roundResult: RoundResultData;
  players: PlayerData[];
  standingsBar: React.ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const winnerName = roundResult.winnerId ? getPlayerName(players, roundResult.winnerId) : null;
  const winnerColor = roundResult.winnerId ? getPlayerColor(players, roundResult.winnerId) : "#999";
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSolveBonus, setShowSolveBonus] = useState(false);
  const [showWinner, setShowWinner] = useState(reducedMotion);
  const [boardGlow, setBoardGlow] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const tl = createScopedTimeline(containerRef);

    const live = withReducedMotion(tl, reducedMotion, () => {
      setShowWinner(true);
      setShowSolveBonus(true);
      setBoardGlow(true);
      if (winnerName) setShowConfetti(true);
    });

    if (!live) return;

    // Golden glow across board as blanks fill
    tl.call(
      () => {
        setBoardGlow(true);
        soundManager.playSfx("lucky.solve");
      },
      [],
      "+=0.2",
    );

    tl.fromTo(".board-glow", { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "power2.out" });

    // Winner reveal
    if (winnerName) {
      tl.call(
        () => {
          setShowWinner(true);
          haptics.celebrate();
        },
        [],
        "+=0.5",
      );

      tl.fromTo(
        ".winner-section",
        { opacity: 0, scale: 0.7, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "back.out(2)" },
      );

      // Gold spotlight on winner avatar
      tl.fromTo(
        ".winner-spotlight",
        { opacity: 0, scale: 0.5 },
        {
          opacity: 0.6,
          scale: 1.5,
          duration: 0.6,
          ease: "power2.out",
          onComplete: () => {
            setShowConfetti(true);
            void fireParticleEffect("sparkle-trail", {
              scale: 0.6,
              origin: { x: 0.5, y: 0.55 },
            });
          },
        },
        "-=0.3",
      );

      // Solve bonus if present
      if ((roundResult.solveBonusAwarded ?? 0) > 0) {
        tl.call(
          () => {
            setShowSolveBonus(true);
          },
          [],
          "+=0.4",
        );

        tl.fromTo(
          ".solve-bonus",
          { opacity: 0, x: -20, scale: 0.8 },
          {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 0.4,
            ease: "back.out(1.5)",
            onComplete: () => {
              void fireParticleEffect("sparkle-trail", {
                scale: 0.3,
                origin: { x: 0.5, y: 0.65 },
              });
            },
          },
        );
      }
    } else {
      // No winner
      tl.call(
        () => {
          setShowWinner(true);
          sounds.buzz();
        },
        [],
        "+=0.5",
      );
    }

    return () => {
      tl.kill();
    };
  }, [roundResult, winnerName, reducedMotion]);

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center gap-8 p-8">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-[clamp(28px,3.5vw,44px)] text-accent-luckyletters uppercase tracking-wider"
      >
        Round {state.round} Complete!
      </motion.h2>

      {/* Answer with golden glow */}
      <div className="relative">
        {boardGlow && !reducedMotion && (
          <div
            className="board-glow absolute -inset-4 rounded-2xl"
            style={{
              background:
                "radial-gradient(ellipse at center, oklch(0.78 0.2 85 / 0.25), transparent 70%)",
              filter: "blur(8px)",
            }}
          />
        )}
        <GlassPanel
          glow
          glowColor={boardGlow ? "oklch(0.78 0.2 85 / 0.4)" : "oklch(0.78 0.2 85 / 0.15)"}
          className="relative px-12 py-8 transition-all duration-500"
        >
          <span
            className="font-display text-[clamp(32px,4.5vw,56px)] font-bold text-text-primary"
            style={boardGlow ? { textShadow: "0 0 20px oklch(0.78 0.2 85 / 0.4)" } : undefined}
          >
            {roundResult.answer}
          </span>
        </GlassPanel>
      </div>

      {showWinner && winnerName && (
        <div className="winner-section relative flex items-center gap-4">
          {/* Gold spotlight behind avatar */}
          {!reducedMotion && (
            <div
              className="winner-spotlight absolute -inset-8 rounded-full"
              style={{
                background: `radial-gradient(circle, ${winnerColor}40, transparent 70%)`,
                filter: "blur(12px)",
              }}
            />
          )}
          <PlayerAvatar name={winnerName} color={winnerColor} size={72} />
          <div className="flex flex-col">
            <span className="font-display text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary">
              {winnerName} wins!
            </span>
            <span className="font-mono text-[clamp(24px,3vw,36px)] font-bold text-success">
              +
              <AnimatedCounter
                value={roundResult.roundCashEarned}
                duration={1000}
                format={(v) => `$${v.toLocaleString()}`}
              />
            </span>
          </div>
        </div>
      )}

      {showSolveBonus && (roundResult.solveBonusAwarded ?? 0) > 0 && (
        <div className="solve-bonus flex items-center gap-2">
          <span data-testid="lucky-solve-bonus" className="font-body text-base text-emerald-400">
            Solve bonus +${(roundResult.solveBonusAwarded ?? 0).toLocaleString()}
          </span>
          {!reducedMotion && (
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
              className="text-lg"
            >
              &#10024;
            </motion.span>
          )}
        </div>
      )}

      {showWinner && !winnerName && (
        <span
          data-testid="lucky-timeout-banner"
          className="font-display text-[clamp(28px,3.5vw,40px)] text-text-muted"
        >
          Time&apos;s up. No one solved it!
        </span>
      )}

      <ConfettiBurst trigger={showConfetti} preset="correct" />
      {standingsBar}
    </div>
  );
}
