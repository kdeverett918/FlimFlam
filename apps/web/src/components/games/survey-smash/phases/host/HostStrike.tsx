"use client";

import type { PlayerData } from "@flimflam/shared";
import { ANIMATION_EASINGS, GlassPanel } from "@flimflam/ui";
import { AnimatePresence, motion } from "motion/react";

import { AnswerBoard } from "../../shared/AnswerBoard";
import { StrikeDisplay } from "../../shared/StrikeDisplay";
import { TeamScoreBar } from "../../shared/TeamScoreBar";
import { PlayerAvatar, getPlayerColor, getPlayerName } from "../../shared/ss-helpers";
import type { RevealedAnswer, TeamData } from "../../shared/ss-types";

interface HostStrikeProps {
  question: string;
  answerCount: number;
  revealedAnswers: RevealedAnswer[];
  activeGuesser: string | null;
  strikes: number;
  teams: TeamData[];
  controllingTeamId: string;
  teamMode: boolean;
  players: PlayerData[];
  reducedMotion: boolean;
  strikeOverlay: React.ReactNode;
}

export function HostStrike({
  question,
  answerCount,
  revealedAnswers,
  activeGuesser,
  strikes,
  teams,
  controllingTeamId,
  teamMode,
  players,
  reducedMotion,
  strikeOverlay,
}: HostStrikeProps) {
  const guesserName = getPlayerName(players, activeGuesser);
  const guesserColor = getPlayerColor(players, activeGuesser);
  const isTripleStrike = strikes >= 3;

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-6">
      {/* Enhanced strike overlay with red flash + scale slam */}
      <AnimatePresence>
        {strikeOverlay && (
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
          >
            {/* Red screen flash */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: reducedMotion ? [0, 0.2, 0] : [0, 0.35, 0] }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute inset-0 bg-accent-6"
            />
            {/* X slam from 3x scale */}
            <motion.span
              initial={reducedMotion ? { opacity: 0 } : { scale: 3, opacity: 0 }}
              animate={reducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
              transition={{
                duration: 0.3,
                ease: ANIMATION_EASINGS.snapIn,
              }}
              className="font-display text-[200px] font-black text-accent-6"
              style={{ textShadow: "0 0 60px oklch(0.68 0.25 20 / 0.6)" }}
            >
              X
            </motion.span>
            {/* 3 STRIKES! text for triple */}
            {isTripleStrike && (
              <motion.span
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 40 }}
                transition={{ delay: 0.4, duration: 0.3 }}
                className="absolute font-display text-[clamp(36px,5vw,56px)] font-black text-accent-6 uppercase"
                style={{
                  textShadow: "0 0 40px oklch(0.68 0.25 20 / 0.5)",
                  bottom: "calc(50% - 100px)",
                }}
              >
                3 STRIKES!
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
            <PlayerAvatar name={guesserName} color={guesserColor} size={56} />
            <span className="font-display text-[clamp(24px,3vw,32px)] font-bold text-text-primary">
              {guesserName}
            </span>
          </div>
          <StrikeDisplay strikes={strikes} />
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
