"use client";

import type { PlayerData } from "@flimflam/shared";
import { ConfettiBurst, GlassPanel } from "@flimflam/ui";

import { Standings as MobileStandings } from "@/components/controls/Standings";

import type { RoundResultData, WheelStanding } from "../../shared/ll-types";

export function CtrlRoundResult({
  controllerRoundResult,
  standings,
  players,
  mySessionId,
}: {
  controllerRoundResult: RoundResultData | undefined;
  standings: WheelStanding[];
  players: PlayerData[];
  mySessionId: string | null;
}) {
  const rrStandings = controllerRoundResult?.standings ?? standings;
  const winnerName = controllerRoundResult?.winnerId
    ? (players.find((p) => p.sessionId === controllerRoundResult.winnerId)?.name ?? null)
    : null;
  return (
    <div className="flex flex-col gap-4 pb-4 pt-4">
      <ConfettiBurst trigger={true} preset="win" />
      {controllerRoundResult?.answer && (
        <GlassPanel className="mx-4 flex flex-col items-center gap-2 px-4 py-4">
          <p className="font-body text-xs text-text-muted uppercase tracking-wider">
            The answer was
          </p>
          <p className="text-center font-display text-lg font-black text-text-primary">
            {controllerRoundResult.answer}
          </p>
        </GlassPanel>
      )}
      {winnerName && (
        <p className="text-center font-display text-base font-bold text-accent-luckyletters">
          {winnerName} won the round!
          {controllerRoundResult?.roundCashEarned
            ? ` +$${controllerRoundResult.roundCashEarned.toLocaleString()}`
            : ""}
        </p>
      )}
      {(controllerRoundResult?.solveBonusAwarded ?? 0) > 0 && (
        <p
          data-testid="lucky-solve-bonus"
          className="text-center font-body text-sm text-emerald-400"
        >
          Solve bonus +${(controllerRoundResult?.solveBonusAwarded ?? 0).toLocaleString()}
        </p>
      )}
      {!winnerName && (
        <p
          data-testid="lucky-timeout-banner"
          className="text-center font-body text-sm text-text-muted"
        >
          Time&apos;s up. No solve this round.
        </p>
      )}
      {rrStandings.length > 0 && (
        <MobileStandings standings={rrStandings} mySessionId={mySessionId} players={players} />
      )}
    </div>
  );
}
