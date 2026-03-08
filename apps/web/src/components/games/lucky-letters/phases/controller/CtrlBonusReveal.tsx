"use client";

import type { PlayerData } from "@flimflam/shared";
import { ConfettiBurst, GlassPanel } from "@flimflam/ui";

import type { BonusRevealData } from "../../shared/ll-types";

export function CtrlBonusReveal({
  bonusReveal,
  players,
}: {
  bonusReveal: BonusRevealData;
  players: PlayerData[];
}) {
  const brSolved = bonusReveal.solved ?? false;
  const brAnswer = bonusReveal.answer ?? "";
  const brPrize = bonusReveal.bonusPrize ?? 0;
  const brPlayerName = bonusReveal.bonusPlayerId
    ? (players.find((p) => p.sessionId === bonusReveal.bonusPlayerId)?.name ?? "Player")
    : "Player";
  return (
    <div className="flex flex-col gap-4 pb-4 pt-4">
      {brSolved && <ConfettiBurst trigger={true} preset="celebration" />}
      <GlassPanel className="mx-4 flex flex-col items-center gap-3 px-6 py-5">
        <p
          className={`font-display text-2xl font-black uppercase ${brSolved ? "text-emerald-400" : "text-red-400"}`}
        >
          {brSolved ? "Solved!" : "Not Solved"}
        </p>
        {brAnswer && (
          <p className="text-center font-display text-base font-bold text-text-primary">
            {brAnswer}
          </p>
        )}
        {brSolved && brPrize > 0 && (
          <p className="font-mono text-lg font-bold text-emerald-400">
            {brPlayerName} wins ${brPrize.toLocaleString()}!
          </p>
        )}
      </GlassPanel>
    </div>
  );
}
