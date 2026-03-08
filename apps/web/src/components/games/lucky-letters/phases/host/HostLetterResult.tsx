"use client";

import type gsap from "gsap";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type React from "react";

import {
  AnimatedCounter,
  createScopedTimeline,
  fireParticleEffect,
  haptics,
  soundManager,
  sounds,
  withReducedMotion,
} from "@flimflam/ui";

import { HostPuzzleBoard } from "../../shared/HostPuzzleBoard";
import type { LetterResultData, WheelGameState } from "../../shared/ll-types";

export function HostLetterResult({
  state,
  letterResult,
  highlightLetters,
  reducedMotion,
  standingsBar,
}: {
  state: WheelGameState;
  letterResult: LetterResultData;
  highlightLetters: Set<string>;
  reducedMotion: boolean;
  standingsBar: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showEarned, setShowEarned] = useState(false);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [, setBoardHighlightIndex] = useState(-1);
  const [showShake, setShowShake] = useState(false);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  // Celebration tier: 1 = subtle, 2-3 = medium, 4+ = full confetti
  const celebrationTier =
    letterResult.count >= 4 ? "full" : letterResult.count >= 2 ? "medium" : "subtle";

  useEffect(() => {
    if (!containerRef.current) return;

    const tl = createScopedTimeline(containerRef);
    tlRef.current = tl;

    const live = withReducedMotion(tl, reducedMotion, () => {
      setCardFlipped(true);
      setShowEarned(true);
      if (letterResult.count > 0) {
        setBoardHighlightIndex(letterResult.count);
      }
    });

    if (!live) return;

    // Beat 1: Card flip — letter appears face-down then flips
    tl.to(".letter-card", {
      rotateY: 0,
      duration: 0.5,
      ease: "power2.out",
      onStart: () => {
        sounds.cardFlip();
      },
      onComplete: () => {
        setCardFlipped(true);
      },
    });

    if (letterResult.inPuzzle) {
      // Beat 2: Each instance lights up on board in sequence (150ms stagger)
      const instanceCount = letterResult.count;
      for (let i = 0; i < instanceCount; i++) {
        tl.call(
          () => {
            setBoardHighlightIndex(i + 1);
            soundManager.playSfx("lucky.ding");
            haptics.tap();
          },
          [],
          "+=0.15",
        );
      }

      // Beat 3: Show earned amount
      tl.call(
        () => {
          setShowEarned(true);
          if (celebrationTier === "full") {
            soundManager.playSfx("lucky.solve");
            haptics.celebrate();
            void fireParticleEffect("confetti-burst", {
              scale: 1.0,
              origin: { x: 0.5, y: 0.45 },
            });
          } else if (celebrationTier === "medium") {
            sounds.correct();
            haptics.confirm();
            void fireParticleEffect("sparkle-trail", {
              scale: 0.6,
              origin: { x: 0.5, y: 0.45 },
            });
          } else {
            sounds.correct();
            haptics.tap();
          }
        },
        [],
        "+=0.3",
      );

      // Scale pulse on the earned amount
      tl.fromTo(
        ".earned-display",
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)" },
        "-=0.1",
      );
    } else {
      // Not in puzzle: tile shakes + turns red
      tl.call(
        () => {
          setShowShake(true);
          sounds.buzz();
          haptics.error();
        },
        [],
        "+=0.3",
      );
      tl.call(
        () => {
          setShowEarned(true);
        },
        [],
        "+=0.4",
      );
    }

    return () => {
      tl.kill();
    };
  }, [letterResult, reducedMotion, celebrationTier]);

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center gap-6 p-8">
      <HostPuzzleBoard
        display={letterResult.puzzleDisplay}
        category={state.category}
        highlightLetters={highlightLetters}
        reducedMotion={reducedMotion}
      />
      <div className="flex flex-col items-center gap-3">
        {/* Letter card with flip animation */}
        <div style={{ perspective: "600px" }}>
          <motion.div
            className={`letter-card flex items-center justify-center rounded-xl border-4 ${
              cardFlipped
                ? letterResult.inPuzzle
                  ? "border-success bg-success/15"
                  : showShake
                    ? "border-accent-6 bg-accent-6/15"
                    : "border-accent-6 bg-accent-6/15"
                : "border-accent-luckyletters/40 bg-accent-luckyletters/10"
            }`}
            style={{
              width: 96,
              height: 96,
              rotateY: reducedMotion ? 0 : 180,
              backfaceVisibility: "hidden",
            }}
            animate={
              showShake && !reducedMotion
                ? {
                    x: [0, -8, 8, -6, 6, -3, 3, 0],
                    transition: { duration: 0.46 },
                  }
                : undefined
            }
          >
            {cardFlipped && (
              <span className="font-display text-[56px] font-black text-text-primary">
                {letterResult.letter}
              </span>
            )}
            {!cardFlipped && !reducedMotion && (
              <span className="font-display text-[36px] font-black text-accent-luckyletters/30">
                ?
              </span>
            )}
          </motion.div>
        </div>

        {/* Radial flash behind letter when highlighted */}
        {cardFlipped && letterResult.inPuzzle && !reducedMotion && (
          <motion.div
            className="absolute pointer-events-none"
            style={{
              width: 160,
              height: 160,
              marginTop: -32,
              background: "radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)",
            }}
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: [0, 0.8, 0], scale: [0.3, 1.2, 1.5] }}
            transition={{ duration: 0.6 }}
          />
        )}

        {/* Result text */}
        {showEarned &&
          (letterResult.inPuzzle ? (
            <div className="earned-display flex flex-col items-center gap-1">
              <span className="font-display text-[clamp(24px,3vw,36px)] text-success font-bold">
                {letterResult.count} {letterResult.count === 1 ? "time" : "times"}!
              </span>
              {letterResult.earned > 0 && (
                <span className="font-display text-[clamp(20px,2.5vw,32px)] text-accent-luckyletters font-bold">
                  +
                  <AnimatedCounter
                    value={letterResult.earned}
                    duration={800}
                    format={(v) => `$${v.toLocaleString()}`}
                  />
                </span>
              )}
            </div>
          ) : (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-display text-[clamp(24px,3vw,36px)] text-accent-6 font-bold"
            >
              Not in the puzzle!
            </motion.span>
          ))}
      </div>
      {standingsBar}
    </div>
  );
}
