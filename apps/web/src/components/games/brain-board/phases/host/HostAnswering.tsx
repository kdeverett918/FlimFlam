import type { PlayerData } from "@flimflam/shared";
import { GlassPanel } from "@flimflam/ui";
import { motion } from "motion/react";

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
  const nonHostPlayers = players.filter((p) => !p.isHost);
  const connectedPlayers = nonHostPlayers.filter((p) => p.connected !== false);
  const submissionTarget = Math.max(
    1,
    connectedPlayers.length > 0 ? connectedPlayers.length : totalPlayerCount,
  );
  const submitted = Math.min(answeredCount, submissionTarget);

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
        <div className="flex flex-col items-center gap-2" data-testid="submission-progress">
          <div className="h-3 w-64 overflow-hidden rounded-full bg-white/[0.12]">
            <motion.div
              className="h-full rounded-full bg-accent-brainboard"
              initial={{ width: 0 }}
              animate={{ width: `${(submitted / submissionTarget) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="font-mono text-[clamp(16px,2vw,24px)] text-text-muted">
            {submitted}/{submissionTarget} submitted
          </span>
        </div>
      )}
    </div>
  );
}
