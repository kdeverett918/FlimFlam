"use client";

import type { PlayerData } from "@flimflam/shared";
import { GlassPanel } from "@flimflam/ui";
import { motion } from "motion/react";

import { Timer } from "@/components/game/Timer";

import { AnswerBoard } from "../../shared/AnswerBoard";
import { StrikeDisplay } from "../../shared/StrikeDisplay";
import { TeamScoreBar } from "../../shared/TeamScoreBar";
import { PlayerAvatar, getPlayerColor, getPlayerName } from "../../shared/ss-helpers";
import type { RevealedAnswer, TeamData } from "../../shared/ss-types";
import { TEAM_COLORS } from "../../shared/ss-types";

interface HostGuessingProps {
  question: string;
  answerCount: number;
  revealedAnswers: RevealedAnswer[];
  activeGuesser: string | null;
  strikes: number;
  teams: TeamData[];
  controllingTeamId: string;
  teamMode: boolean;
  players: PlayerData[];
  timerEndTime: number | null;
  reducedMotion: boolean;
  guessAlongEligible: number;
  guessAlongSubmissions: number;
  strikeOverlay: React.ReactNode;
}

export function HostGuessing({
  question,
  answerCount,
  revealedAnswers,
  activeGuesser,
  strikes,
  teams,
  controllingTeamId,
  teamMode,
  players,
  timerEndTime,
  reducedMotion,
  guessAlongEligible,
  guessAlongSubmissions,
  strikeOverlay,
}: HostGuessingProps) {
  const guesserName = getPlayerName(players, activeGuesser);
  const guesserColor = getPlayerColor(players, activeGuesser);

  // Determine team color for pulsing ring
  const controllingTeamColor = TEAM_COLORS[controllingTeamId];

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-6">
      {strikeOverlay}
      <GlassPanel className="max-w-3xl px-8 py-4">
        <p className="text-center font-display text-[clamp(20px,2.5vw,32px)] font-bold text-text-primary">
          {question}
        </p>
      </GlassPanel>
      <div className="flex items-start gap-8 w-full max-w-5xl">
        <div className="flex-1">
          <AnswerBoard
            totalCount={answerCount}
            revealedAnswers={revealedAnswers}
            reducedMotion={reducedMotion}
          />
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            {/* Pulsing ring in team color around active guesser */}
            <motion.div
              animate={
                reducedMotion
                  ? {}
                  : {
                      boxShadow: [
                        `0 0 8px ${controllingTeamColor?.border ?? "oklch(0.68 0.25 25 / 0.3)"}`,
                        `0 0 20px ${controllingTeamColor?.border ?? "oklch(0.68 0.25 25 / 0.5)"}`,
                        `0 0 8px ${controllingTeamColor?.border ?? "oklch(0.68 0.25 25 / 0.3)"}`,
                      ],
                    }
              }
              transition={reducedMotion ? {} : { duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
              className="rounded-full"
              style={{
                border: `3px solid ${controllingTeamColor?.border ?? "oklch(0.68 0.25 25 / 0.4)"}`,
                padding: 3,
              }}
            >
              <PlayerAvatar name={guesserName} color={guesserColor} size={56} />
            </motion.div>
            <div className="flex flex-col">
              <span className="font-display text-[clamp(24px,3vw,32px)] font-bold text-text-primary">
                {guesserName}
              </span>
              <motion.span
                animate={reducedMotion ? {} : { opacity: [0.5, 1, 0.5] }}
                transition={
                  reducedMotion ? {} : { duration: 1.5, repeat: Number.POSITIVE_INFINITY }
                }
                className="font-body text-[18px] text-text-muted"
              >
                is guessing...
              </motion.span>
            </div>
          </div>
          {guessAlongEligible > 0 && (
            <GlassPanel
              data-testid="guess-along-status"
              className="flex flex-col items-center gap-1 px-4 py-3"
            >
              <span className="font-display text-xs font-bold uppercase tracking-[0.18em] text-accent-surveysmash">
                Guess Along
              </span>
              <span className="font-body text-sm text-text-muted">
                {guessAlongSubmissions}/{guessAlongEligible} spectators submitted
              </span>
            </GlassPanel>
          )}
          <StrikeDisplay strikes={strikes} />
          {timerEndTime && <Timer endTime={timerEndTime} size={100} />}
        </div>
      </div>
      <TeamScoreBar
        teams={teams}
        controllingTeamId={controllingTeamId}
        teamMode={teamMode}
        players={players}
      />
    </div>
  );
}
