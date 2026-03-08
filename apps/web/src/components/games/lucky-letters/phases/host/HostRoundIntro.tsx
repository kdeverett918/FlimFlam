"use client";

import { GlassPanel, createScopedTimeline, sounds, useReducedMotion } from "@flimflam/ui";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import type { WheelGameState } from "../../shared/ll-types";

export function HostRoundIntro({ state }: { state: WheelGameState }) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [roundVisible, setRoundVisible] = useState(reducedMotion);
  const [categoryRevealed, setCategoryRevealed] = useState(reducedMotion);
  const [categoryText, setCategoryText] = useState(reducedMotion ? state.category : "");
  const [hintVisible, setHintVisible] = useState(reducedMotion);
  const [puzzleBlanksCount, setPuzzleBlanksCount] = useState(
    reducedMotion ? state.puzzleDisplay.length : 0,
  );

  useEffect(() => {
    if (!containerRef.current || reducedMotion) return;

    const tl = createScopedTimeline(containerRef);

    // Round number scales in huge with gold glow
    tl.call(() => {
      setRoundVisible(true);
      sounds.reveal();
    });

    tl.fromTo(
      ".round-number",
      { scale: 0.3, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        duration: 0.6,
        ease: "back.out(2)",
      },
    );

    // Category typewriter effect
    tl.call(
      () => {
        setCategoryRevealed(true);
      },
      [],
      "+=0.3",
    );

    const cat = state.category;
    for (let i = 0; i <= cat.length; i++) {
      tl.call(
        () => {
          setCategoryText(cat.slice(0, i));
          if (i > 0) sounds.tick();
        },
        [],
        i === 0 ? "+=0.1" : "+=0.04",
      );
    }

    // Hint
    if (state.hint) {
      tl.call(
        () => {
          setHintVisible(true);
        },
        [],
        "+=0.3",
      );
    }

    // Puzzle blanks animate in one by one (50ms per tile)
    const displayLen = state.puzzleDisplay.length;
    for (let i = 0; i <= displayLen; i++) {
      tl.call(
        () => {
          setPuzzleBlanksCount(i);
          if (i > 0 && state.puzzleDisplay[i - 1] !== " ") {
            sounds.tick();
          }
        },
        [],
        i === 0 ? "+=0.3" : "+=0.05",
      );
    }

    return () => {
      tl.kill();
    };
  }, [state.category, state.hint, state.puzzleDisplay, reducedMotion]);

  // Build puzzle blank display
  const blanksToShow = state.puzzleDisplay.slice(0, puzzleBlanksCount);

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center gap-8 p-8">
      {/* Round number with gold glow */}
      {roundVisible && (
        <motion.h1
          className="round-number font-display font-black text-accent-luckyletters"
          style={{
            fontSize: "clamp(80px, 12vw, 120px)",
            textShadow: "0 0 40px oklch(0.78 0.2 85 / 0.6), 0 0 80px oklch(0.78 0.2 85 / 0.3)",
            lineHeight: 1,
          }}
          initial={reducedMotion ? {} : { scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.6, ease: "easeOut" }}
        >
          ROUND {state.round}
        </motion.h1>
      )}

      {/* Category with dashed gold border and typewriter */}
      {categoryRevealed && (
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <GlassPanel
            glow
            glowColor="oklch(0.78 0.2 85 / 0.3)"
            className="relative px-12 py-6 overflow-hidden"
          >
            {/* Animated dashed gold border */}
            {!reducedMotion && (
              <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{
                  border: "2px dashed oklch(0.82 0.18 85 / 0.5)",
                  borderRadius: "inherit",
                }}
                animate={{
                  borderColor: [
                    "oklch(0.82 0.18 85 / 0.3)",
                    "oklch(0.82 0.18 85 / 0.7)",
                    "oklch(0.82 0.18 85 / 0.3)",
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              />
            )}
            <span className="font-display text-[clamp(24px,3vw,40px)] text-accent-luckyletters uppercase tracking-wider">
              {categoryText}
              {!reducedMotion && categoryText.length < state.category.length && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY }}
                  className="text-accent-luckyletters/50"
                >
                  |
                </motion.span>
              )}
            </span>
          </GlassPanel>
        </motion.div>
      )}

      {/* Hint */}
      {hintVisible && state.hint && (
        <motion.span
          initial={reducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="font-body text-[clamp(20px,2.5vw,32px)] text-text-muted italic"
        >
          Hint: {state.hint}
        </motion.span>
      )}

      {/* Puzzle blanks animating in one by one */}
      {puzzleBlanksCount > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {blanksToShow.split("").map((ch, i) => {
            const isSpace = ch === " ";
            if (isSpace) {
              return <div key={`blank-${String(i)}`} style={{ width: "clamp(12px, 2vw, 24px)" }} />;
            }
            return (
              <motion.div
                key={`blank-${String(i)}`}
                initial={reducedMotion ? {} : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  duration: 0.15,
                  ease: "easeOut",
                }}
                className="flex items-center justify-center rounded-md border-2 border-accent-luckyletters/30 bg-white/10"
                style={{
                  width: "clamp(36px, 5vw, 64px)",
                  height: "clamp(44px, 6vw, 76px)",
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
