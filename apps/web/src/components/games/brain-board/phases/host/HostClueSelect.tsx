"use client";

import type { PlayerData } from "@flimflam/shared";
import { AnimatedLeaderboard } from "../../shared/AnimatedLeaderboard";
import { InteractiveBoard } from "../../shared/InteractiveBoard";
import { PlayerAvatar, getPlayerColor, getPlayerName } from "../../shared/bb-helpers";
import type { Standing } from "../../shared/bb-types";

interface HostClueSelectProps {
  board: { name: string }[];
  revealedClues: string[];
  clueOutcomes?: Map<string, "correct" | "wrong">;
  selectorSessionId: string | null;
  doubleDownValues: boolean;
  standings: Standing[];
  players: PlayerData[];
}

export function HostClueSelect({
  board,
  revealedClues,
  clueOutcomes,
  selectorSessionId,
  doubleDownValues,
  standings,
  players,
}: HostClueSelectProps) {
  const selName = getPlayerName(players, selectorSessionId);
  const selColor = getPlayerColor(players, selectorSessionId);
  const categories = board.map((cat) => cat.name);

  return (
    <div className="flex flex-col items-center p-4">
      <div className="mb-4 flex items-center gap-4">
        <PlayerAvatar name={selName} color={selColor} size={48} />
        <span className="font-display text-[clamp(24px,3vw,36px)] text-accent-brainboard">
          {selName}&apos;s pick
        </span>
      </div>

      {/* Single interactive board — host mode, always 6 cols, read-only */}
      <div className="w-full max-w-[1400px]">
        <InteractiveBoard
          categories={categories}
          answeredClues={revealedClues}
          clueOutcomes={clueOutcomes}
          doubleDownValues={doubleDownValues}
          isSelector={false}
          selectorName={selName}
          mode="host"
        />
      </div>

      {/* Animated Leaderboard */}
      <div className="mt-4 w-full max-w-3xl">
        <AnimatedLeaderboard standings={standings} players={players} />
      </div>
    </div>
  );
}
