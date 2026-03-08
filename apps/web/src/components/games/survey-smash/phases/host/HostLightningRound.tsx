"use client";

import type { PlayerData } from "@flimflam/shared";
import { AnimatedCounter } from "@flimflam/ui";
import { motion } from "motion/react";

import { Timer } from "@/components/game/Timer";

import { PlayerAvatar, getPlayerColor, getPlayerName } from "../../shared/ss-helpers";
import type { LightningAnswer } from "../../shared/ss-types";
import { LR_SLOTS } from "../../shared/ss-types";

interface HostLightningRoundProps {
  lightningPlayerId: string;
  lightningCurrentIndex: number;
  lightningAnswers: LightningAnswer[];
  lightningTotalPoints: number;
  players: PlayerData[];
  timerEndTime: number | null;
}

export function HostLightningRound({
  lightningPlayerId,
  lightningCurrentIndex,
  lightningAnswers,
  lightningTotalPoints,
  players,
  timerEndTime,
}: HostLightningRoundProps) {
  const lrPlayerName = getPlayerName(players, lightningPlayerId);
  const lrPlayerColor = getPlayerColor(players, lightningPlayerId);

  return (
    <div className="relative flex flex-col items-center justify-center gap-6 p-8 overflow-hidden">
      {/* Cinematic letterbox bars */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 h-12 bg-black" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-12 bg-black" />

      {/* Electric border arcs */}
      <div
        className="pointer-events-none fixed inset-0 z-30"
        style={{
          boxShadow:
            "inset 0 0 60px oklch(0.68 0.25 25 / 0.15), inset 0 0 120px oklch(0.68 0.25 25 / 0.05)",
        }}
      />

      <motion.h1
        initial={{ opacity: 0, scale: 0.8, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 120 }}
        className="font-display text-[clamp(40px,5.5vw,64px)] font-black text-accent-surveysmash"
        style={{ textShadow: "0 0 40px oklch(0.68 0.25 25 / 0.5)" }}
      >
        LIGHTNING ROUND!
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-4"
      >
        <PlayerAvatar name={lrPlayerName} color={lrPlayerColor} size={64} />
        <span className="font-display text-[clamp(28px,3.5vw,40px)] font-bold text-text-primary">
          {lrPlayerName}
        </span>
      </motion.div>

      {/* 5 answer slots - 80x80px horizontal with progress arrows */}
      <div className="flex items-center gap-2">
        {LR_SLOTS.map((slotKey, i) => {
          const answer = lightningAnswers[i];
          const isActive = !answer && i === lightningCurrentIndex;
          const showArrow = i < LR_SLOTS.length - 1;
          return (
            <div key={slotKey} className="flex items-center gap-2">
              <motion.div
                animate={
                  isActive
                    ? {
                        boxShadow: [
                          "0 0 8px oklch(0.68 0.25 25 / 0.3)",
                          "0 0 20px oklch(0.68 0.25 25 / 0.6)",
                          "0 0 8px oklch(0.68 0.25 25 / 0.3)",
                        ],
                      }
                    : {}
                }
                transition={isActive ? { duration: 1.2, repeat: Number.POSITIVE_INFINITY } : {}}
                className={`flex items-center justify-center rounded-xl border-2 transition-all duration-300 ${
                  answer
                    ? answer.matched
                      ? "border-success bg-success/15"
                      : "border-accent-6 bg-accent-6/10"
                    : isActive
                      ? "border-accent-surveysmash bg-accent-surveysmash/15"
                      : "border-white/[0.15] bg-white/[0.06]"
                }`}
                style={{ width: 80, height: 80 }}
              >
                <span
                  className={`font-mono text-[28px] font-bold ${
                    answer
                      ? answer.matched
                        ? "text-success"
                        : "text-accent-6"
                      : isActive
                        ? "text-accent-surveysmash"
                        : "text-text-muted"
                  }`}
                >
                  {answer ? answer.points : i + 1}
                </span>
              </motion.div>
              {showArrow && (
                <span className="font-display text-[20px] text-text-dim">&#x25B6;</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Running total with AnimatedCounter */}
      <div className="flex flex-col items-center gap-1">
        <span className="font-display text-xs font-bold uppercase tracking-wider text-text-muted">
          Running Total
        </span>
        <AnimatedCounter
          value={lightningTotalPoints}
          duration={400}
          className="text-[clamp(36px,4.5vw,56px)] font-black text-accent-surveysmash"
          style={{ textShadow: "0 0 20px oklch(0.68 0.25 25 / 0.3)" }}
        />
      </div>

      {/* 200pt bonus threshold indicator */}
      <div className="flex items-center gap-3">
        <div className="relative h-3 w-48 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              background:
                lightningTotalPoints >= 200
                  ? "linear-gradient(90deg, oklch(0.72 0.2 145), oklch(0.82 0.18 85))"
                  : "linear-gradient(90deg, oklch(0.68 0.25 25), oklch(0.68 0.25 25 / 0.6))",
            }}
            animate={{
              width: `${Math.min(100, (lightningTotalPoints / 200) * 100)}%`,
            }}
            transition={{ duration: 0.4 }}
          />
          {/* Dashed threshold line at 200pt */}
          <div
            className="absolute top-0 bottom-0 w-px border-l-2 border-dashed border-white/40"
            style={{ left: "100%" }}
          />
        </div>
        <span className="font-mono text-xs font-bold text-text-muted">200pt Bonus</span>
      </div>

      {timerEndTime && (
        <div className="mt-2">
          <Timer endTime={timerEndTime} size={100} />
        </div>
      )}
    </div>
  );
}
