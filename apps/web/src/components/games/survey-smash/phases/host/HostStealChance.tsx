"use client";

import type { PlayerData } from "@flimflam/shared";
import { GlassPanel, soundManager } from "@flimflam/ui";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";

import { Timer } from "@/components/game/Timer";

import { AnswerBoard } from "../../shared/AnswerBoard";
import { StrikeDisplay } from "../../shared/StrikeDisplay";
import { TeamScoreBar } from "../../shared/TeamScoreBar";
import { getTeamDisplayName } from "../../shared/ss-helpers";
import type { RevealedAnswer, TeamData } from "../../shared/ss-types";
import { TEAM_COLORS } from "../../shared/ss-types";

interface HostStealChanceProps {
  question: string;
  answerCount: number;
  revealedAnswers: RevealedAnswer[];
  strikes: number;
  snagTeamId: string;
  teams: TeamData[];
  controllingTeamId: string;
  teamMode: boolean;
  players: PlayerData[];
  timerEndTime: number | null;
  reducedMotion: boolean;
  strikeOverlay: React.ReactNode;
}

export function HostStealChance({
  question,
  answerCount,
  revealedAnswers,
  strikes,
  snagTeamId,
  teams,
  controllingTeamId,
  teamMode,
  players,
  timerEndTime,
  reducedMotion,
  strikeOverlay,
}: HostStealChanceProps) {
  const snagTeam = teams.find((t) => t.id === snagTeamId);
  const snagName = snagTeam ? getTeamDisplayName(snagTeam, players, teamMode) : "???";
  const snagColor = TEAM_COLORS[snagTeamId] ?? TEAM_COLORS["team-a"];

  // Calculate points at stake from revealed answers
  const pointsAtStake = revealedAnswers.reduce((sum, a) => sum + a.points, 0);

  const soundFiredRef = useRef(false);
  useEffect(() => {
    if (!soundFiredRef.current) {
      soundFiredRef.current = true;
      soundManager.playSfx("survey.alarm");
    }
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center gap-6 p-6 overflow-hidden">
      {strikeOverlay}

      {/* Stealing team's color wash background */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.1 }}
        transition={{ duration: 0.5 }}
        className="pointer-events-none fixed inset-0 z-0"
        style={{ backgroundColor: snagColor?.text }}
      />

      {/* Pulsing border */}
      {!reducedMotion && (
        <motion.div
          animate={{
            boxShadow: [
              `inset 0 0 30px ${snagColor?.border ?? "oklch(0.72 0.24 25 / 0.3)"}`,
              `inset 0 0 60px ${snagColor?.border ?? "oklch(0.72 0.24 25 / 0.5)"}`,
              `inset 0 0 30px ${snagColor?.border ?? "oklch(0.72 0.24 25 / 0.3)"}`,
            ],
          }}
          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
          className="pointer-events-none fixed inset-0 z-10"
        />
      )}

      <GlassPanel className="z-20 max-w-3xl px-8 py-4">
        <p className="text-center font-display text-[clamp(20px,2.5vw,32px)] font-bold text-text-primary">
          {question}
        </p>
      </GlassPanel>

      <div className="z-20 flex items-start gap-8 w-full max-w-5xl">
        {/* Answer board - dimmed to show points at stake */}
        <div className="flex-1" style={{ opacity: 0.6 }}>
          <AnswerBoard
            totalCount={answerCount}
            revealedAnswers={revealedAnswers}
            reducedMotion={reducedMotion}
          />
        </div>

        <div className="flex flex-col items-center gap-6">
          <StrikeDisplay strikes={strikes} />

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 150 }}
            className="flex flex-col items-center gap-3"
          >
            {/* STEAL! header with red-to-gold gradient glow */}
            <motion.span
              animate={
                reducedMotion
                  ? {}
                  : {
                      textShadow: [
                        "0 0 20px oklch(0.68 0.25 20 / 0.5)",
                        "0 0 40px oklch(0.82 0.18 85 / 0.5)",
                        "0 0 20px oklch(0.68 0.25 20 / 0.5)",
                      ],
                    }
              }
              transition={reducedMotion ? {} : { duration: 2, repeat: Number.POSITIVE_INFINITY }}
              className="font-display text-[clamp(32px,4vw,48px)] font-black uppercase"
              style={{
                background: "linear-gradient(135deg, oklch(0.68 0.25 20), oklch(0.82 0.18 85))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              STEAL!
            </motion.span>

            <span
              className="font-display text-[clamp(24px,3vw,36px)] font-bold"
              style={{ color: snagColor?.text }}
            >
              {snagName}
            </span>

            {/* Points at stake */}
            <GlassPanel className="flex flex-col items-center gap-1 px-4 py-2">
              <span className="font-display text-xs font-bold uppercase tracking-wider text-text-muted">
                Points at Stake
              </span>
              <span className="font-mono text-[clamp(20px,2.5vw,28px)] font-bold text-accent-surveysmash">
                {pointsAtStake.toLocaleString()}
              </span>
            </GlassPanel>

            <motion.span
              animate={reducedMotion ? {} : { opacity: [0.5, 1, 0.5] }}
              transition={reducedMotion ? {} : { duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
              className="font-body text-[clamp(18px,2vw,24px)] text-text-muted"
            >
              Can they steal the points?
            </motion.span>
          </motion.div>

          {timerEndTime && <Timer endTime={timerEndTime} size={100} />}
        </div>
      </div>

      <div className="z-20">
        <TeamScoreBar
          teams={teams}
          controllingTeamId={controllingTeamId}
          teamMode={teamMode}
          players={players}
        />
      </div>
    </div>
  );
}
