"use client";

import type { PlayerData } from "@flimflam/shared";
import { GlassPanel } from "@flimflam/ui";

import { Standings as MobileStandings } from "@/components/controls/Standings";

import type { WheelStanding } from "../../shared/ll-types";

export function CtrlRoundIntro({
  round,
  totalRounds,
  category,
  hint,
  standings,
  currentTurnSessionId,
  mySessionId,
  players,
}: {
  round: number;
  totalRounds: number;
  category: string;
  hint: string;
  standings: WheelStanding[];
  currentTurnSessionId: string | null;
  mySessionId: string | null;
  players: PlayerData[];
}) {
  return (
    <div className="flex flex-col items-center gap-5 px-4 pb-4 pt-6">
      <GlassPanel glow className="flex w-full max-w-sm flex-col items-center gap-4 px-6 py-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-accent-luckyletters/40 bg-accent-luckyletters/15">
          <span className="font-display text-xl font-black text-accent-luckyletters">{round}</span>
        </div>
        <p className="font-display text-lg font-bold text-text-primary uppercase tracking-wider">
          Round {round} of {totalRounds}
        </p>
        {category && (
          <span className="rounded-full bg-accent-luckyletters/15 px-4 py-1.5 font-display text-sm font-bold text-accent-luckyletters uppercase tracking-wider">
            {category}
          </span>
        )}
        {hint && (
          <p className="text-center font-body text-sm text-text-muted italic">
            &ldquo;{hint}&rdquo;
          </p>
        )}
      </GlassPanel>
      {standings.length > 0 && (
        <MobileStandings
          standings={standings}
          currentTurnSessionId={currentTurnSessionId}
          mySessionId={mySessionId}
          players={players}
        />
      )}
    </div>
  );
}
