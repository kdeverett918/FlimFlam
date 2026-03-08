"use client";

import type { PlayerData } from "@flimflam/shared";
import {
  AnimatedCounter,
  ConfettiBurst,
  GlassPanel,
  fireParticleEffect,
  haptics,
  sounds,
  useReducedMotion,
} from "@flimflam/ui";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { PlayerAvatar, getPlayerColor, getPlayerName } from "../../shared/bb-helpers";
import type { FinalRevealData, Standing } from "../../shared/bb-types";

interface HostAllInRevealProps {
  finalReveal: FinalRevealData;
  standings: Standing[];
  players: PlayerData[];
  revealIndex: number;
}

export function HostAllInReveal({
  finalReveal,
  standings,
  players,
  revealIndex,
}: HostAllInRevealProps) {
  const reducedMotion = useReducedMotion();
  const [verdictShown, setVerdictShown] = useState<Record<string, boolean>>({});
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const prevRevealIndexRef = useRef(0);

  const sortedResults = [...finalReveal.results].sort((a, b) => {
    const aScore = standings.find((s) => s.sessionId === a.sessionId)?.score ?? 0;
    const bScore = standings.find((s) => s.sessionId === b.sessionId)?.score ?? 0;
    return aScore - bScore;
  });

  useEffect(() => {
    if (revealIndex > prevRevealIndexRef.current) {
      const newlyRevealed = sortedResults.slice(prevRevealIndexRef.current, revealIndex);
      for (const result of newlyRevealed) {
        sounds.cardFlip();
        const delay = reducedMotion ? 0 : 1200;
        setTimeout(() => {
          setVerdictShown((prev) => ({ ...prev, [result.sessionId]: true }));
          if (result.correct) {
            sounds.correct();
            haptics.celebrate();
            void fireParticleEffect("confetti-burst", { scale: 0.6 });
          } else {
            sounds.strike();
            haptics.error();
          }
        }, delay);
      }
      prevRevealIndexRef.current = revealIndex;
    }
  }, [revealIndex, sortedResults, reducedMotion]);

  useEffect(() => {
    if (revealIndex >= sortedResults.length && sortedResults.length > 0) {
      const delay = reducedMotion ? 0 : 1800;
      const timer = setTimeout(() => {
        setShowCorrectAnswer(true);
        void fireParticleEffect("golden-rain", { scale: 1.0 });
        sounds.goldenRain();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [revealIndex, sortedResults.length, reducedMotion]);

  return (
    <div
      data-testid="brainboard-all-in-reveal"
      data-reveal-count={revealIndex}
      className="flex flex-col items-center justify-center gap-6 p-8"
    >
      <motion.h1
        initial={reducedMotion ? {} : { opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 12 }}
        className="font-display text-[clamp(36px,5vw,56px)] font-black text-accent-brainboard"
        style={{ textShadow: "0 0 24px oklch(0.68 0.22 265 / 0.5)" }}
      >
        ALL-IN REVEAL
      </motion.h1>
      <div className="flex flex-col gap-4 w-full max-w-3xl">
        <AnimatePresence>
          {sortedResults.slice(0, revealIndex).map((result) => {
            const name = getPlayerName(players, result.sessionId);
            const color = getPlayerColor(players, result.sessionId);
            const hasVerdict = verdictShown[result.sessionId] ?? reducedMotion;
            return (
              <motion.div
                key={result.sessionId}
                data-testid="brainboard-all-in-result-row"
                data-player-id={result.sessionId}
                initial={reducedMotion ? {} : { opacity: 0, x: -80 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 150, damping: 20 }}
              >
                <GlassPanel className="relative flex items-center gap-6 px-8 py-5 overflow-hidden">
                  <PlayerAvatar name={name} color={color} size={56} />
                  <div className="flex flex-1 flex-col">
                    <span className="font-display text-[clamp(24px,3vw,36px)] font-bold text-text-primary">
                      {name}
                    </span>
                    <motion.span
                      initial={reducedMotion ? {} : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: reducedMotion ? 0 : 0.3, duration: 0.4 }}
                      className="font-body text-[clamp(18px,2vw,24px)] text-text-muted"
                    >
                      &ldquo;{result.answer || "(no answer)"}&rdquo;
                    </motion.span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <motion.span
                      initial={reducedMotion ? {} : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: reducedMotion ? 0 : 0.6, duration: 0.3 }}
                      className="font-body text-[clamp(16px,1.5vw,20px)] text-text-muted"
                    >
                      Wager:{" "}
                      <AnimatedCounter
                        value={result.wager}
                        duration={800}
                        format={(v) => `$${v.toLocaleString()}`}
                        className="font-bold"
                      />
                    </motion.span>
                    {hasVerdict && (
                      <motion.span
                        initial={reducedMotion ? {} : { opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 15 }}
                        className={`font-mono text-[clamp(24px,3vw,36px)] font-bold ${result.correct ? "text-success" : "text-accent-6"}`}
                      >
                        {result.delta >= 0 ? "+" : ""}${result.delta.toLocaleString()}
                      </motion.span>
                    )}
                  </div>
                  {hasVerdict && (
                    <motion.div
                      initial={reducedMotion ? {} : { opacity: 0, scale: 3, rotate: -15 }}
                      animate={{ opacity: 1, scale: 1, rotate: -12 }}
                      transition={{ type: "spring", stiffness: 200, damping: 12 }}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none font-display text-[clamp(32px,4vw,48px)] font-black uppercase tracking-wider ${
                        result.correct ? "text-success/70" : "text-destructive/70"
                      }`}
                      style={{
                        textShadow: result.correct
                          ? "0 0 20px oklch(0.72 0.18 150 / 0.4)"
                          : "0 0 20px oklch(0.65 0.2 25 / 0.4)",
                      }}
                    >
                      {result.correct ? "CORRECT" : "WRONG"}
                    </motion.div>
                  )}
                  {result.correct && hasVerdict && <ConfettiBurst trigger preset="correct" />}
                </GlassPanel>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {showCorrectAnswer && (
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            className="mt-4"
          >
            <GlassPanel
              glow
              glowColor="oklch(0.68 0.22 265 / 0.35)"
              className="px-10 py-6 text-center"
            >
              <span className="font-display text-[clamp(20px,2vw,28px)] text-text-muted">
                Correct Answer:
              </span>{" "}
              <span className="font-display text-[clamp(24px,3vw,36px)] font-bold text-accent-brainboard">
                {finalReveal.correctAnswer}
              </span>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
      {!showCorrectAnswer && (
        <div className="mt-4">
          <span className="font-display text-[clamp(20px,2vw,28px)] text-text-muted">
            Correct Answer:
          </span>{" "}
          <span className="font-display text-[clamp(24px,3vw,36px)] font-bold text-accent-brainboard">
            {finalReveal.correctAnswer}
          </span>
        </div>
      )}
    </div>
  );
}
