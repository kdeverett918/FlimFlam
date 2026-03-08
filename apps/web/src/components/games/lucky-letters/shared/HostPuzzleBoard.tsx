"use client";

import { ANIMATION_DURATIONS, ANIMATION_EASINGS } from "@flimflam/ui";
import { AnimatePresence, motion } from "motion/react";

export function HostPuzzleBoard({
  display,
  category,
  highlightLetters,
  reducedMotion = false,
}: { display: string; category: string; highlightLetters?: Set<string>; reducedMotion?: boolean }) {
  const cells: Array<{ char: string; pos: number; isSpace: boolean }> = [];
  for (let pos = 0; pos < display.length; pos++) {
    const ch = display[pos] ?? "";
    cells.push({ char: ch, pos, isSpace: ch === " " });
  }
  const wordGroups: Array<typeof cells> = [];
  let current: typeof cells = [];
  for (const cell of cells) {
    if (cell.isSpace) {
      if (current.length > 0) wordGroups.push(current);
      current = [];
    } else {
      current.push(cell);
    }
  }
  if (current.length > 0) wordGroups.push(current);

  return (
    <div className="flex flex-col items-center gap-4">
      <span className="font-display text-[clamp(18px,2vw,28px)] text-accent-luckyletters uppercase tracking-widest">
        {category}
      </span>
      <div className="flex flex-wrap justify-center gap-2">
        {wordGroups.map((wordCells) => {
          const wordKey = wordCells.map((c) => `${c.pos}`).join("-");
          return (
            <div key={wordKey} className="flex gap-1">
              {wordCells.map((cell) => {
                const ch = cell.char;
                const isLetter = /[A-Z_]/.test(ch);
                const isBlank = ch === "_";
                const isHighlighted = highlightLetters?.has(ch.toUpperCase()) ?? false;
                const cellKey = `cell-${cell.pos}`;
                if (!isLetter) {
                  return (
                    <span
                      key={cellKey}
                      className="font-display text-[clamp(28px,4vw,56px)] text-text-muted"
                    >
                      {ch}
                    </span>
                  );
                }
                return (
                  <motion.div
                    key={cellKey}
                    data-testid="lucky-letter-tile"
                    data-reveal-style={reducedMotion ? "fade" : "flip"}
                    className={`relative flex items-center justify-center overflow-hidden rounded-md border-2 ${isBlank ? "border-accent-luckyletters/30 bg-white/10" : isHighlighted ? "border-accent-luckyletters bg-accent-luckyletters/30" : "border-accent-luckyletters/50 bg-bg-elevated"}`}
                    style={{ width: "clamp(36px, 5vw, 64px)", height: "clamp(44px, 6vw, 76px)" }}
                    animate={
                      isHighlighted
                        ? reducedMotion
                          ? {
                              opacity: [1, 0.82, 1],
                              transition: { duration: ANIMATION_DURATIONS.reveal },
                            }
                          : {
                              scale: [1, 1.18, 1],
                              rotateX: [0, -8, 0],
                              boxShadow: [
                                "0 0 0 rgba(245, 158, 11, 0)",
                                "0 0 30px rgba(245, 158, 11, 0.55)",
                                "0 0 14px rgba(245, 158, 11, 0.18)",
                              ],
                              transition: {
                                duration: 0.72,
                                ease: ANIMATION_EASINGS.crispOut,
                                delay: (cell.pos % 6) * 0.04,
                              },
                            }
                        : undefined
                    }
                  >
                    {isHighlighted && !reducedMotion && (
                      <motion.div
                        aria-hidden="true"
                        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.6),rgba(255,255,255,0))]"
                        initial={{ opacity: 0, scale: 0.4 }}
                        animate={{
                          opacity: [0, 0.9, 0],
                          scale: [0.45, 1.15, 1.45],
                        }}
                        transition={{
                          duration: 0.6,
                          ease: ANIMATION_EASINGS.crispOut,
                          delay: (cell.pos % 6) * 0.04,
                        }}
                      />
                    )}
                    {!isBlank && (
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={`${cellKey}-${ch}`}
                          initial={
                            reducedMotion
                              ? { opacity: 0 }
                              : { rotateX: -110, opacity: 0, scale: 0.8, y: 8 }
                          }
                          animate={
                            reducedMotion
                              ? { opacity: 1 }
                              : { rotateX: 0, opacity: 1, scale: 1, y: 0 }
                          }
                          exit={
                            reducedMotion
                              ? { opacity: 0 }
                              : { rotateX: 110, opacity: 0, scale: 0.92, y: -6 }
                          }
                          transition={{
                            duration: reducedMotion
                              ? ANIMATION_DURATIONS.standard
                              : ANIMATION_DURATIONS.reveal,
                            ease: reducedMotion
                              ? ANIMATION_EASINGS.smoothInOut
                              : ANIMATION_EASINGS.crispOut,
                            delay:
                              !reducedMotion && isHighlighted ? (cell.pos % 6) * 0.04 + 0.04 : 0,
                          }}
                          className="font-display font-bold text-text-primary"
                          style={{
                            fontSize: "clamp(24px, 3.5vw, 48px)",
                            transformOrigin: reducedMotion ? undefined : "center bottom",
                          }}
                        >
                          {ch}
                        </motion.span>
                      </AnimatePresence>
                    )}
                  </motion.div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
