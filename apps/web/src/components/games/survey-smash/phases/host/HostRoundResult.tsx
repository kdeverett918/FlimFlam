"use client";

import type { PlayerData } from "@flimflam/shared";
import { AnimatedCounter, ConfettiBurst, GlassPanel } from "@flimflam/ui";
import { motion } from "motion/react";

import { getTeamDisplayName } from "../../shared/ss-helpers";
import type { TeamData } from "../../shared/ss-types";
import { TEAM_COLORS } from "../../shared/ss-types";

interface HostRoundResultProps {
  round: number;
  teams: TeamData[];
  controllingTeamId: string;
  teamMode: boolean;
  players: PlayerData[];
  strikeOverlay: React.ReactNode;
}

export function HostRoundResult({
  round,
  teams,
  controllingTeamId,
  teamMode,
  players,
  strikeOverlay,
}: HostRoundResultProps) {
  const controllingTeam = teams.find((t) => t.id === controllingTeamId);
  const winnerName = controllingTeam
    ? getTeamDisplayName(controllingTeam, players, teamMode)
    : "Nobody";
  const winnerColor = TEAM_COLORS[controllingTeamId] ?? TEAM_COLORS["team-a"];

  // Determine celebration tier based on score delta
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
  const scoreDelta =
    sortedTeams.length >= 2 ? (sortedTeams[0]?.score ?? 0) - (sortedTeams[1]?.score ?? 0) : 0;
  const isBlowout = scoreDelta > 5000;
  const isDecisive = scoreDelta > 2000;

  return (
    <div className="relative flex flex-col items-center justify-center gap-8 p-8 overflow-hidden">
      {strikeOverlay}

      {/* Winner's color wash explosion */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 0.12, scale: 2 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="pointer-events-none fixed z-0"
        style={{
          width: 400,
          height: 400,
          borderRadius: "50%",
          backgroundColor: winnerColor?.text,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          filter: "blur(80px)",
        }}
      />

      <motion.h2
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
        className="z-10 font-display text-[clamp(32px,4vw,48px)] text-accent-surveysmash font-bold uppercase"
        style={{ textShadow: "0 0 20px oklch(0.68 0.25 25 / 0.3)" }}
      >
        Round {round} Complete!
      </motion.h2>

      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 120 }}
        className="z-10 flex flex-col items-center gap-3"
      >
        <span
          className="font-display text-[clamp(36px,4.5vw,56px)] font-black"
          style={{
            color: winnerColor?.text,
            textShadow: `0 0 30px ${winnerColor?.border ?? "transparent"}`,
          }}
        >
          {winnerName} wins!
        </span>

        {isBlowout && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="font-display text-[clamp(18px,2vw,24px)] text-amber-400 font-bold uppercase tracking-wider"
          >
            Dominant!
          </motion.span>
        )}
      </motion.div>

      <div className="z-10 flex gap-8">
        {teams.map((team, i) => {
          const displayName = getTeamDisplayName(team, players, teamMode);
          const isWinner = team.id === controllingTeamId;
          const teamColor = TEAM_COLORS[team.id];
          return (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.15, type: "spring" }}
            >
              <GlassPanel
                glow={isWinner}
                glowColor={teamColor?.border ?? "oklch(0.68 0.25 25 / 0.3)"}
                className="flex flex-col items-center gap-2 px-10 py-6"
                style={isWinner ? { borderColor: teamColor?.border } : undefined}
              >
                <span className="font-display text-[clamp(24px,3vw,36px)] font-bold text-text-primary">
                  {displayName}
                </span>
                <AnimatedCounter
                  value={team.score}
                  duration={1200}
                  className="text-[clamp(32px,4vw,48px)] font-bold"
                  style={{ color: teamColor?.text ?? "oklch(0.68 0.25 25)" }}
                />
              </GlassPanel>
            </motion.div>
          );
        })}
      </div>

      <ConfettiBurst trigger preset={isBlowout ? "win" : isDecisive ? "celebration" : "correct"} />
    </div>
  );
}
