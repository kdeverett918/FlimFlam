import type { PlayerData } from "@flimflam/shared";
import { ConfettiBurst, GlassPanel } from "@flimflam/ui";
import { AnimatePresence, motion } from "motion/react";
import { PlayerAvatar, getPlayerColor, getPlayerName } from "../../shared/bb-helpers";
import type { FinalRevealData, Standing } from "../../shared/bb-types";

interface HostAllInRevealProps {
  finalReveal: FinalRevealData;
  standings: Standing[];
  players: PlayerData[];
  revealIndex: number;
}

export function HostAllInReveal({
  finalReveal,
  standings,
  players,
  revealIndex,
}: HostAllInRevealProps) {
  const sortedResults = [...finalReveal.results].sort((a, b) => {
    const aScore = standings.find((s) => s.sessionId === a.sessionId)?.score ?? 0;
    const bScore = standings.find((s) => s.sessionId === b.sessionId)?.score ?? 0;
    return aScore - bScore;
  });

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8">
      <h1
        className="font-display text-[clamp(36px,5vw,56px)] font-black text-accent-brainboard"
        style={{ textShadow: "0 0 24px oklch(0.68 0.22 265 / 0.5)" }}
      >
        ALL-IN REVEAL
      </h1>
      <div className="flex flex-col gap-4 w-full max-w-3xl">
        <AnimatePresence>
          {sortedResults.slice(0, revealIndex).map((result) => {
            const name = getPlayerName(players, result.sessionId);
            const color = getPlayerColor(players, result.sessionId);
            return (
              <motion.div
                key={result.sessionId}
                initial={{ opacity: 0, x: -60 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 150, damping: 20 }}
              >
                <GlassPanel className="flex items-center gap-6 px-8 py-5">
                  <PlayerAvatar name={name} color={color} size={56} />
                  <div className="flex flex-1 flex-col">
                    <span className="font-display text-[clamp(24px,3vw,36px)] font-bold text-text-primary">
                      {name}
                    </span>
                    <span className="font-body text-[clamp(18px,2vw,24px)] text-text-muted">
                      &ldquo;{result.answer || "(no answer)"}&rdquo;
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-body text-[clamp(16px,1.5vw,20px)] text-text-muted">
                      Wager: ${result.wager.toLocaleString()}
                    </span>
                    <span
                      className={`font-mono text-[clamp(24px,3vw,36px)] font-bold ${result.correct ? "text-success" : "text-accent-6"}`}
                    >
                      {result.delta >= 0 ? "+" : ""}${result.delta.toLocaleString()}
                    </span>
                  </div>
                  {result.correct && <ConfettiBurst trigger preset="correct" />}
                </GlassPanel>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <div className="mt-4">
        <span className="font-display text-[clamp(20px,2vw,28px)] text-text-muted">
          Correct Answer:
        </span>{" "}
        <span className="font-display text-[clamp(24px,3vw,36px)] font-bold text-accent-brainboard">
          {finalReveal.correctAnswer}
        </span>
      </div>
    </div>
  );
}
