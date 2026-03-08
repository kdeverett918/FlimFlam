"use client";

import type { PlayerData } from "@flimflam/shared";
import { GlassPanel, sounds, useReducedMotion } from "@flimflam/ui";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { getPlayerColor } from "../../shared/bb-helpers";

interface HostAnsweringProps {
  currentCategoryName: string;
  currentClueValue: number | null;
  currentClueQuestion: string | null;
  answeredCount: number;
  totalPlayerCount: number;
  players: PlayerData[];
}

export function HostAnswering({
  currentCategoryName,
  currentClueValue,
  currentClueQuestion,
  answeredCount,
  totalPlayerCount,
  players,
}: HostAnsweringProps) {
  const reducedMotion = useReducedMotion();
  const prevAnsweredRef = useRef(0);

  const nonHostPlayers = players.filter((p) => !p.isHost);
  const connectedPlayers = nonHostPlayers.filter((p) => p.connected !== false);
  const submissionTarget = Math.max(
    1,
    connectedPlayers.length > 0 ? connectedPlayers.length : totalPlayerCount,
  );
  const submitted = Math.min(answeredCount, submissionTarget);

  useEffect(() => {
    if (submitted > prevAnsweredRef.current && submitted > 0) {
      sounds.click();
    }
    prevAnsweredRef.current = submitted;
  }, [submitted]);

  return (
    <div className="flex flex-col items-center justify-center gap-8 p-8">
      <span className="font-display text-[clamp(20px,2.5vw,32px)] text-accent-brainboard uppercase tracking-wider">
        {currentCategoryName} &mdash; ${currentClueValue}
      </span>
      {currentClueQuestion && (
        <GlassPanel glow glowColor="oklch(0.68 0.22 265 / 0.25)" className="max-w-4xl px-12 py-8">
          <p className="text-center font-body text-[clamp(28px,3.5vw,48px)] leading-snug text-text-primary">
            {currentClueQuestion}
          </p>
        </GlassPanel>
      )}
      <motion.h2
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        className="font-display text-[clamp(36px,4.5vw,56px)] font-bold text-text-muted"
      >
        Everyone is answering...
      </motion.h2>
      {submissionTarget > 0 && (
        <div className="flex flex-col items-center gap-4" data-testid="submission-progress">
          {/* Individual player indicators */}
          <div className="flex flex-wrap justify-center gap-3">
            {connectedPlayers.map((player, idx) => {
              const hasAnswered = idx < submitted;
              const color = getPlayerColor(players, player.sessionId);
              return (
                <motion.div
                  key={player.sessionId}
                  initial={false}
                  animate={
                    hasAnswered
                      ? reducedMotion
                        ? { backgroundColor: color, borderColor: color }
                        : {
                            scale: [0, 1.2, 1],
                            backgroundColor: color,
                            borderColor: color,
                          }
                      : {
                          scale: 1,
                          backgroundColor: "rgba(255,255,255,0.1)",
                          borderColor: "rgba(255,255,255,0.2)",
                        }
                  }
                  transition={
                    hasAnswered
                      ? { type: "spring", stiffness: 400, damping: 15 }
                      : { duration: 0.2 }
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 font-display text-sm font-bold"
                  style={{
                    boxShadow: hasAnswered ? `0 0 12px ${color}60` : "none",
                    color: hasAnswered ? "var(--color-bg-deep)" : "var(--color-text-dim)",
                  }}
                  title={player.name}
                >
                  {player.name.charAt(0).toUpperCase()}
                </motion.div>
              );
            })}
          </div>
          <span className="font-mono text-[clamp(16px,2vw,24px)] text-text-muted">
            {submitted}/{submissionTarget} submitted
          </span>
        </div>
      )}
    </div>
  );
}
