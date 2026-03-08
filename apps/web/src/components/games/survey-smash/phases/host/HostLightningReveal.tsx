"use client";

import type { PlayerData } from "@flimflam/shared";
import { AnimatedCounter, ConfettiBurst, GlassPanel, sounds } from "@flimflam/ui";
import { fireParticleEffect } from "@flimflam/ui";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";

import { PlayerAvatar, getPlayerColor, getPlayerName } from "../../shared/ss-helpers";
import type { LightningAnswer } from "../../shared/ss-types";

interface HostLightningRevealProps {
  lightningPlayerId: string;
  lightningAnswers: LightningAnswer[];
  lightningTotalPoints: number;
  players: PlayerData[];
}

export function HostLightningReveal({
  lightningPlayerId,
  lightningAnswers,
  lightningTotalPoints,
  players,
}: HostLightningRevealProps) {
  const lrPlayerName = getPlayerName(players, lightningPlayerId);
  const lrPlayerColor = getPlayerColor(players, lightningPlayerId);
  const hitThreshold = lightningTotalPoints >= 200;
  const nearMiss = !hitThreshold && lightningTotalPoints >= 150;
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    if (hitThreshold) {
      // Delay golden rain for dramatic effect
      setTimeout(
        () => {
          void fireParticleEffect("golden-rain", { scale: 1.5 });
          sounds.goldenRain();
        },
        lightningAnswers.length * 400 + 800,
      );
    }
  }, [hitThreshold, lightningAnswers.length]);

  return (
    <div className="relative flex flex-col items-center justify-center gap-6 p-8 overflow-hidden">
      {/* Cinematic letterbox */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 h-10 bg-black" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-10 bg-black" />

      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-[clamp(36px,5vw,56px)] font-black text-accent-surveysmash"
        style={{ textShadow: "0 0 24px oklch(0.68 0.25 25 / 0.4)" }}
      >
        LIGHTNING ROUND RESULTS
      </motion.h1>

      <div className="flex items-center gap-4">
        <PlayerAvatar name={lrPlayerName} color={lrPlayerColor} size={56} />
        <span className="font-display text-[clamp(24px,3vw,36px)] font-bold text-text-primary">
          {lrPlayerName}
        </span>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-2xl">
        {lightningAnswers.map((answer, i) => (
          <motion.div
            key={`lra-${answer.question}`}
            data-testid="survey-smash-lightning-result-row"
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: i * 0.4,
              duration: 0.4,
              type: "spring",
              stiffness: 100,
            }}
          >
            <GlassPanel
              className="flex items-center justify-between px-6 py-3"
              style={
                answer.matched
                  ? {
                      boxShadow: "0 0 16px oklch(0.72 0.2 145 / 0.2)",
                      borderColor: "oklch(0.72 0.2 145 / 0.3)",
                    }
                  : undefined
              }
            >
              <div className="flex flex-col">
                <span className="font-body text-[clamp(14px,1.5vw,18px)] text-text-muted">
                  {answer.question}
                </span>
                <motion.span
                  className="font-display text-[clamp(20px,2.5vw,28px)] font-bold text-text-primary"
                  animate={!answer.matched ? { x: [0, -4, 4, -2, 0] } : {}}
                  transition={!answer.matched ? { delay: i * 0.4 + 0.3, duration: 0.3 } : {}}
                >
                  {answer.answer}
                </motion.span>
              </div>
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.4 + 0.2, type: "spring", stiffness: 200 }}
                className={`font-mono text-[clamp(24px,3vw,36px)] font-bold ${answer.matched ? "text-success" : "text-accent-6"}`}
              >
                {answer.points}
              </motion.span>
            </GlassPanel>
          </motion.div>
        ))}
      </div>

      {/* Total + bonus section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: lightningAnswers.length * 0.4 + 0.5 }}
        className="flex flex-col items-center gap-3"
      >
        <div data-testid="survey-smash-lightning-total" className="flex items-baseline gap-2">
          <AnimatedCounter
            value={lightningTotalPoints}
            duration={1500}
            className="font-mono text-[clamp(36px,4.5vw,56px)] font-black text-accent-surveysmash"
          />
          <span className="font-display text-[clamp(24px,3vw,36px)] font-bold text-accent-surveysmash">
            POINTS
          </span>
        </div>

        {hitThreshold && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: lightningAnswers.length * 0.4 + 1.0,
              type: "spring",
              stiffness: 150,
            }}
            className="flex flex-col items-center gap-2"
          >
            <span
              className="font-display text-[clamp(28px,4vw,48px)] font-black uppercase"
              style={{
                background: "linear-gradient(135deg, oklch(0.82 0.18 85), oklch(0.72 0.2 145))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "0 0 30px oklch(0.82 0.18 85 / 0.3)",
              }}
            >
              BONUS UNLOCKED!
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[clamp(20px,2.5vw,32px)] font-bold text-success">
                +
              </span>
              <AnimatedCounter
                value={10000}
                duration={1500}
                className="text-[clamp(24px,3vw,36px)] font-bold text-success"
              />
              <span className="font-display text-[clamp(16px,2vw,24px)] text-success font-bold">
                pts
              </span>
            </div>
          </motion.div>
        )}

        {nearMiss && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: lightningAnswers.length * 0.4 + 0.8 }}
            className="font-display text-[clamp(20px,2.5vw,28px)] text-amber-400 font-bold"
          >
            So close!
          </motion.span>
        )}

        {!hitThreshold && !nearMiss && lightningTotalPoints > 0 && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: lightningAnswers.length * 0.4 + 0.8 }}
            className="font-display text-[clamp(18px,2vw,24px)] text-text-muted"
          >
            Better luck next time
          </motion.span>
        )}
      </motion.div>

      <ConfettiBurst trigger={hitThreshold} preset="win" />
    </div>
  );
}
