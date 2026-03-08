"use client";

import type { PlayerData } from "@flimflam/shared";
import { AnimatedCounter } from "@flimflam/ui";

import { PlayerAvatar, getPlayerColor, getPlayerName } from "./ll-helpers";
import type { WheelGameState } from "./ll-types";

export function StandingsBar({
  gameState,
  players,
}: {
  gameState: WheelGameState;
  players: PlayerData[];
}) {
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {gameState.standings.map((s) => {
        const name = getPlayerName(players, s.sessionId);
        const color = getPlayerColor(players, s.sessionId);
        const isCurrent = s.sessionId === gameState.currentTurnSessionId;
        return (
          <div
            key={s.sessionId}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 transition-all ${isCurrent ? "bg-accent-luckyletters/15 border border-accent-luckyletters/30" : ""}`}
          >
            <PlayerAvatar name={name} color={color} size={32} />
            <span className="font-body text-[18px] text-text-primary">{name}</span>
            <AnimatedCounter
              value={s.totalCash}
              duration={900}
              className="text-[18px] font-bold text-accent-luckyletters"
              format={(v) => `$${v.toLocaleString()}`}
            />
            {s.roundCash > 0 && (
              <AnimatedCounter
                value={s.roundCash}
                duration={700}
                className="text-[14px] text-text-muted"
                format={(v) => `($${v.toLocaleString()})`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
