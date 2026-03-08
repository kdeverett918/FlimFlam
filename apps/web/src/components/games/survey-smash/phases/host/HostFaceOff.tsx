"use client";

import type { PlayerData } from "@flimflam/shared";
import { GlassPanel, soundManager } from "@flimflam/ui";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";

import { Timer } from "@/components/game/Timer";

import { TeamScoreBar } from "../../shared/TeamScoreBar";
import { PlayerAvatar, getPlayerColor, getPlayerName } from "../../shared/ss-helpers";
import type { FaceOffEntry, TeamData } from "../../shared/ss-types";
import { TEAM_COLORS } from "../../shared/ss-types";

interface HostFaceOffProps {
  question: string;
  faceOffPlayers: string[];
  faceOffEntries: FaceOffEntry[];
  teams: TeamData[];
  controllingTeamId: string;
  teamMode: boolean;
  players: PlayerData[];
  timerEndTime: number | null;
  strikeOverlay: React.ReactNode;
}

export function HostFaceOff({
  question,
  faceOffPlayers,
  faceOffEntries,
  teams,
  controllingTeamId,
  teamMode,
  players,
  timerEndTime,
  strikeOverlay,
}: HostFaceOffProps) {
  const player1 = faceOffPlayers[0];
  const player2 = faceOffPlayers[1];
  const name1 = getPlayerName(players, player1 ?? null);
  const name2 = getPlayerName(players, player2 ?? null);
  const color1 = getPlayerColor(players, player1 ?? null);
  const color2 = getPlayerColor(players, player2 ?? null);
  const submittedCount = faceOffEntries.length;
  const expectedCount = faceOffPlayers.length;

  // Determine team colors for the split-screen wash
  const teamA = teams[0];
  const teamB = teams[1];
  const teamAColor = TEAM_COLORS[teamA?.id ?? "team-a"] ?? TEAM_COLORS["team-a"];
  const teamBColor = TEAM_COLORS[teamB?.id ?? "team-b"] ?? TEAM_COLORS["team-b"];

  const p1Submitted = faceOffEntries.some((e) => e.sessionId === player1);
  const p2Submitted = faceOffEntries.some((e) => e.sessionId === player2);

  const soundFiredRef = useRef(false);
  useEffect(() => {
    if (!soundFiredRef.current) {
      soundFiredRef.current = true;
      soundManager.playSfx("survey.faceoff");
    }
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center gap-6 p-8 overflow-hidden">
      {strikeOverlay}

      {/* Split-screen color wash background */}
      <div className="pointer-events-none fixed inset-0 z-0 flex">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.08 }}
          transition={{ duration: 0.6 }}
          className="flex-1"
          style={{ backgroundColor: teamAColor?.text }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.08 }}
          transition={{ duration: 0.6 }}
          className="flex-1"
          style={{ backgroundColor: teamBColor?.text }}
        />
      </div>

      <GlassPanel className="z-10 max-w-4xl px-10 py-6 mb-4">
        <p className="text-center font-display text-[clamp(24px,3vw,40px)] font-bold text-text-primary">
          {question}
        </p>
      </GlassPanel>

      <div className="z-10 flex items-center gap-8">
        {/* Player 1 - slides in from left */}
        <motion.div
          initial={{ x: -200, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 80, damping: 15 }}
          className="flex flex-col items-center gap-3"
        >
          <div
            className="rounded-full p-1 transition-all duration-500"
            style={
              p1Submitted
                ? {
                    boxShadow: "0 0 20px oklch(0.82 0.18 85 / 0.5)",
                    border: "3px solid oklch(0.82 0.18 85)",
                  }
                : { border: "3px solid transparent" }
            }
          >
            <PlayerAvatar name={name1} color={color1} size={80} />
          </div>
          <span className="font-display text-[clamp(24px,3vw,36px)] font-bold text-text-primary">
            {name1}
          </span>
          {p1Submitted && (
            <motion.span
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="font-display text-[20px] text-success font-bold"
            >
              Locked In!
            </motion.span>
          )}
        </motion.div>

        {/* VS with light bar sweep */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 12 }}
          className="relative"
        >
          <span
            className="font-display text-[clamp(48px,7vw,80px)] font-black text-accent-surveysmash"
            style={{ textShadow: "0 0 40px oklch(0.68 0.25 25 / 0.5)" }}
          >
            VS
          </span>
          {/* Light bar sweep across VS */}
          <motion.div
            initial={{ x: "-150%", opacity: 0 }}
            animate={{ x: "150%", opacity: [0, 0.6, 0] }}
            transition={{ delay: 0.5, duration: 0.6, ease: "easeInOut" }}
            className="absolute inset-0 pointer-events-none"
            style={{
              width: "30%",
              background: "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.4), transparent)",
            }}
          />
        </motion.div>

        {/* Player 2 - slides in from right */}
        <motion.div
          initial={{ x: 200, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 80, damping: 15 }}
          className="flex flex-col items-center gap-3"
        >
          <div
            className="rounded-full p-1 transition-all duration-500"
            style={
              p2Submitted
                ? {
                    boxShadow: "0 0 20px oklch(0.82 0.18 85 / 0.5)",
                    border: "3px solid oklch(0.82 0.18 85)",
                  }
                : { border: "3px solid transparent" }
            }
          >
            <PlayerAvatar name={name2} color={color2} size={80} />
          </div>
          <span className="font-display text-[clamp(24px,3vw,36px)] font-bold text-text-primary">
            {name2}
          </span>
          {p2Submitted && (
            <motion.span
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="font-display text-[20px] text-success font-bold"
            >
              Locked In!
            </motion.span>
          )}
        </motion.div>
      </div>

      <GlassPanel
        data-testid="submission-progress"
        className="z-10 flex flex-col items-center gap-1 px-5 py-3"
      >
        <span className="font-display text-xs font-bold uppercase tracking-[0.18em] text-accent-surveysmash">
          Submission Progress
        </span>
        <span className="font-body text-sm text-text-muted">
          {submittedCount}/{expectedCount} submitted
        </span>
      </GlassPanel>

      {timerEndTime && (
        <div className="z-10">
          <Timer endTime={timerEndTime} size={100} />
        </div>
      )}

      <div className="z-10">
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
