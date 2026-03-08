"use client";

import type { PlayerData } from "@flimflam/shared";
import {
  AnimatedCounter,
  createScopedTimeline,
  haptics,
  soundManager,
  sounds,
  useReducedMotion,
} from "@flimflam/ui";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { HostPuzzleBoard } from "../../shared/HostPuzzleBoard";
import { PlayerAvatar, getPlayerColor, getPlayerName } from "../../shared/ll-helpers";
import type { WheelGameState } from "../../shared/ll-types";

const RSTLNE = ["R", "S", "T", "L", "N", "E"];

export function HostBonusRound({
  state,
  players,
  highlightLetters,
  reducedMotion: propReducedMotion,
}: {
  state: WheelGameState;
  players: PlayerData[];
  highlightLetters: Set<string>;
  reducedMotion: boolean;
}) {
  const hookReducedMotion = useReducedMotion();
  const reducedMotion = propReducedMotion || hookReducedMotion;
  const containerRef = useRef<HTMLDivElement>(null);
  const bonusName = getPlayerName(players, state.bonusPlayerSessionId);
  const bonusColor = getPlayerColor(players, state.bonusPlayerSessionId);

  const [titleRevealed, setTitleRevealed] = useState(reducedMotion);
  const [rstlneRevealed, setRstlneRevealed] = useState(reducedMotion);
  const [jackpotVisible, setJackpotVisible] = useState(reducedMotion);

  useEffect(() => {
    if (!containerRef.current || reducedMotion) return;

    const tl = createScopedTimeline(containerRef);

    // Cinematic letterbox effect (black bars)
    tl.fromTo(
      ".letterbox-top, .letterbox-bottom",
      { height: 0 },
      { height: 48, duration: 0.5, ease: "power2.out" },
    );

    // "BONUS ROUND" title: letters turn on like neon signs
    tl.call(
      () => {
        setTitleRevealed(true);
        soundManager.playSfx("lucky.bonus.intro");
        haptics.confirm();
      },
      [],
      "+=0.3",
    );

    // RSTLNE pre-reveal
    tl.call(
      () => {
        setRstlneRevealed(true);
        sounds.reveal();
      },
      [],
      "+=1.0",
    );

    // Jackpot display
    tl.call(
      () => {
        setJackpotVisible(true);
        soundManager.playSfx("lucky.ding");
      },
      [],
      "+=0.8",
    );

    tl.fromTo(
      ".jackpot-display",
      { scale: 0.6, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2)" },
    );

    return () => {
      tl.kill();
    };
  }, [reducedMotion]);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center gap-6 p-8"
    >
      {/* Cinematic letterbox bars */}
      {!reducedMotion && (
        <>
          <div className="letterbox-top fixed inset-x-0 top-0 z-30 bg-black pointer-events-none" />
          <div className="letterbox-bottom fixed inset-x-0 bottom-0 z-30 bg-black pointer-events-none" />
        </>
      )}

      {/* Title with neon-sign letter stagger */}
      <div className="relative z-10 overflow-hidden">
        {titleRevealed ? (
          <h1 className="font-display text-[clamp(40px,5.5vw,64px)] font-black text-accent-luckyletters flex">
            {"BONUS ROUND".split("").map((char, i) => (
              <motion.span
                key={`title-${char}-${String(i)}`}
                initial={reducedMotion ? {} : { opacity: 0, textShadow: "0 0 0px transparent" }}
                animate={{
                  opacity: 1,
                  textShadow: "0 0 30px oklch(0.78 0.2 85 / 0.5)",
                }}
                transition={{
                  delay: reducedMotion ? 0 : i * 0.08,
                  duration: 0.15,
                }}
                style={char === " " ? { width: "0.3em" } : undefined}
              >
                {char}
              </motion.span>
            ))}
          </h1>
        ) : (
          <h1
            className="font-display text-[clamp(40px,5.5vw,64px)] font-black text-accent-luckyletters/20"
            style={{ textShadow: "none" }}
          >
            BONUS ROUND
          </h1>
        )}
      </div>

      {/* RSTLNE display */}
      {rstlneRevealed && (
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 flex gap-2"
        >
          {RSTLNE.map((letter, i) => (
            <motion.div
              key={`rstlne-${letter}`}
              initial={reducedMotion ? {} : { scale: 0.5, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                boxShadow: "0 0 12px oklch(0.78 0.2 85 / 0.4)",
              }}
              transition={{
                delay: reducedMotion ? 0 : i * 0.05,
                duration: 0.2,
                ease: "easeOut",
              }}
              className="flex h-12 w-10 items-center justify-center rounded-md border-2 border-accent-luckyletters bg-accent-luckyletters/20"
            >
              <span className="font-display text-xl font-black text-accent-luckyletters">
                {letter}
              </span>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Puzzle board */}
      <div className="relative z-10">
        <HostPuzzleBoard
          display={state.puzzleDisplay}
          category={state.category}
          highlightLetters={highlightLetters}
          reducedMotion={reducedMotion}
        />
      </div>

      {/* Player info */}
      <div className="relative z-10 flex items-center gap-4 mt-2">
        <PlayerAvatar name={bonusName} color={bonusColor} size={64} />
        <span className="font-display text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary">
          {bonusName}
        </span>
      </div>

      {/* Jackpot display */}
      {jackpotVisible && (
        <motion.div
          className="jackpot-display relative z-10 flex flex-col items-center gap-1 rounded-xl border-2 border-accent-luckyletters/60 bg-accent-luckyletters/10 px-8 py-4"
          style={{
            boxShadow: "0 0 30px oklch(0.78 0.2 85 / 0.25)",
          }}
        >
          <span className="font-body text-xs uppercase tracking-[0.3em] text-text-muted">
            Jackpot
          </span>
          <span className="font-mono text-[clamp(32px,4vw,52px)] font-black text-accent-luckyletters">
            <AnimatedCounter
              value={25000}
              duration={1200}
              format={(v) => `$${v.toLocaleString()}`}
            />
          </span>
        </motion.div>
      )}
    </div>
  );
}
