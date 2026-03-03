"use client";

import { GlassPanel } from "@flimflam/ui";

interface StandingEntry {
  sessionId: string;
  roundCash: number;
  totalCash: number;
}

interface PlayerInfo {
  sessionId: string;
  name: string;
  avatarColor: string;
}

interface MobileStandingsProps {
  standings: StandingEntry[];
  currentTurnSessionId?: string | null;
  mySessionId?: string | null;
  players: PlayerInfo[];
}

export function MobileStandings({
  standings,
  currentTurnSessionId,
  mySessionId,
  players,
}: MobileStandingsProps) {
  const getPlayerInfo = (sessionId: string): PlayerInfo | undefined =>
    players.find((p) => p.sessionId === sessionId);

  return (
    <GlassPanel className="mx-4 flex flex-col gap-1 px-3 py-3">
      {standings.map((entry, i) => {
        const info = getPlayerInfo(entry.sessionId);
        const isMe = entry.sessionId === mySessionId;
        const isTurn = entry.sessionId === currentTurnSessionId;

        return (
          <div
            key={entry.sessionId}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
              isMe ? "border border-accent-luckyletters/30 bg-accent-luckyletters/10" : ""
            }`}
          >
            <span className="w-5 font-mono text-xs text-text-dim">#{i + 1}</span>
            <div className="relative">
              <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: info?.avatarColor ?? "#6366f1" }}
              />
              {isTurn && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent-luckyletters animate-pulse" />
              )}
            </div>
            <span className="flex-1 truncate font-body text-sm text-text-primary">
              {info?.name ?? "Player"}
              {isMe && (
                <span className="ml-1 rounded bg-accent-luckyletters/15 px-1 py-0.5 text-[10px] font-bold text-accent-luckyletters uppercase">
                  You
                </span>
              )}
            </span>
            <span className="font-mono text-sm font-bold text-text-primary">
              ${entry.totalCash.toLocaleString()}
            </span>
          </div>
        );
      })}
    </GlassPanel>
  );
}
