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

import { PlayerAvatar, getPlayerColor, getPlayerName } from "../../shared/ll-helpers";
import type { BonusRevealData } from "../../shared/ll-types";

export function HostBonusReveal({
  bonusReveal,
  players,
}: {
  bonusReveal: BonusRevealData;
  players: PlayerData[];
}) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const bonusName = getPlayerName(players, bonusReveal.bonusPlayerId);
  const bonusColor = getPlayerColor(players, bonusReveal.bonusPlayerId);

  const [, setPhase] = useState<"drumroll" | "reveal" | "result">(
    reducedMotion ? "result" : "drumroll",
  );
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const tl = createScopedTimeline(containerRef);

    const live = withReducedMotion(tl, reducedMotion, () => {
      setPhase("result");
      if (bonusReveal.solved) setShowConfetti(true);
    });

    if (!live) return;

    // Phase 1: Dim + drumroll + shimmer
    tl.call(() => {
      setPhase("drumroll");
      soundManager.playSfx("lucky.drumroll");
    });

    tl.fromTo(".dim-overlay", { opacity: 0 }, { opacity: 0.4, duration: 0.6 });

    tl.fromTo(
      ".shimmer-tiles",
      { opacity: 0.5 },
      {
        opacity: 1,
        duration: 0.8,
        repeat: 2,
        yoyo: true,
        ease: "sine.inOut",
      },
      "-=0.3",
    );

    // Phase 2: Reveal
    tl.call(
      () => {
        setPhase("reveal");
      },
      [],
      "+=0.5",
    );

    if (bonusReveal.solved) {
      // SOLVED sequence
      // Letters fill golden
      tl.fromTo(
        ".answer-panel",
        { scale: 0.9, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.5,
          ease: "power2.out",
        },
      );

      // Pause for dramatic effect
      tl.call(() => {}, [], "+=0.5");

      // "SOLVED!" slams from scale(3) to 1
      tl.fromTo(
        ".solved-stamp",
        { scale: 3, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.4,
          ease: "power4.out",
          onComplete: () => {
            soundManager.playSfx("lucky.solve");
            haptics.celebrate();
            setShowConfetti(true);
            // Confetti from both sides
            void fireParticleEffect("confetti-burst", {
              scale: 1.2,
              origin: { x: 0.2, y: 0.5 },
            });
            void fireParticleEffect("confetti-burst", {
              scale: 1.2,
              origin: { x: 0.8, y: 0.5 },
            });
          },
        },
        "+=0.2",
      );

      // Prize rolls up
      tl.call(
        () => {
          setPhase("result");
          // Golden rain
          void fireParticleEffect("golden-rain", {
            scale: 1.0,
            origin: { x: 0.5, y: 0.3 },
          });
          sounds.goldenRain();
        },
        [],
        "+=0.4",
      );

      tl.fromTo(
        ".prize-amount",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" },
      );
    } else {
      // NOT SOLVED sequence
      tl.fromTo(
        ".answer-panel",
        { opacity: 0 },
        { opacity: 0.6, duration: 0.8, ease: "power2.out" },
      );

      tl.call(
        () => {
          setPhase("result");
          sounds.buzz();
          haptics.error();
        },
        [],
        "+=0.3",
      );

      tl.fromTo(".fail-message", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 });

      tl.fromTo(
        ".jackpot-cross",
        { scaleX: 0 },
        { scaleX: 1, duration: 0.3, ease: "power2.out" },
        "+=0.2",
      );
    }

    return () => {
      tl.kill();
    };
  }, [bonusReveal, reducedMotion]);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center gap-8 p-8"
    >
      {/* Dim overlay */}
      <div
        className="dim-overlay pointer-events-none fixed inset-0 z-0 bg-black"
        style={{ opacity: 0 }}
      />

      {/* Title */}
      <h1
        className="relative z-10 font-display text-[clamp(40px,5.5vw,64px)] font-black text-accent-luckyletters"
        style={{ textShadow: "0 0 24px oklch(0.78 0.2 85 / 0.4)" }}
      >
        BONUS ROUND
      </h1>

      {/* Answer panel */}
      <div className="answer-panel relative z-10">
        <GlassPanel
          glow
          glowColor={
            bonusReveal.solved ? "oklch(0.68 0.18 150 / 0.4)" : "oklch(0.68 0.25 20 / 0.3)"
          }
          className="px-12 py-8"
        >
          <span
            className={`shimmer-tiles font-display text-[clamp(32px,4.5vw,56px)] font-bold ${
              bonusReveal.solved ? "text-accent-luckyletters" : "text-text-muted"
            }`}
            style={
              bonusReveal.solved ? { textShadow: "0 0 20px oklch(0.78 0.2 85 / 0.5)" } : undefined
            }
          >
            {bonusReveal.answer}
          </span>
        </GlassPanel>
      </div>

      {/* Player info */}
      <div className="relative z-10 flex items-center gap-4">
        <PlayerAvatar name={bonusName} color={bonusColor} size={64} />
        <span className="font-display text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary">
          {bonusName}
        </span>
      </div>

      {/* Result */}
      {bonusReveal.solved ? (
        <div className="relative z-10 flex flex-col items-center gap-3">
          <motion.div
            className="solved-stamp"
            initial={reducedMotion ? { scale: 1, opacity: 1 } : { scale: 3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.4, ease: "easeOut" }}
          >
            <span
              className="font-display text-[clamp(36px,4.5vw,56px)] font-black text-success"
              style={{ textShadow: "0 0 30px oklch(0.68 0.18 150 / 0.5)" }}
            >
              SOLVED IT!
            </span>
          </motion.div>
          <div className="prize-amount">
            <span className="font-mono text-[clamp(28px,3.5vw,44px)] font-bold text-accent-luckyletters">
              +
              <AnimatedCounter
                value={bonusReveal.bonusPrize}
                duration={1200}
                format={(v) => `$${v.toLocaleString()}`}
              />
            </span>
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex flex-col items-center gap-2">
          <span className="fail-message font-display text-[clamp(32px,4vw,48px)] text-accent-6 font-bold">
            Not this time!
          </span>
          <div className="relative inline-block">
            <span className="font-mono text-[clamp(20px,2.5vw,32px)] text-text-muted">
              ${bonusReveal.bonusPrize.toLocaleString()}
            </span>
            <div
              className="jackpot-cross absolute left-0 top-1/2 h-[3px] w-full -translate-y-1/2 bg-accent-6"
              style={{ transformOrigin: "left center" }}
            />
          </div>
        </div>
      )}

      <ConfettiBurst trigger={showConfetti} preset="win" />
    </div>
  );
}
