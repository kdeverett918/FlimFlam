import type { PlayerData } from "@flimflam/shared";
import { AVATAR_COLORS } from "@flimflam/shared";

import type { TeamData } from "./ss-types";

export function getPlayerName(players: PlayerData[], sessionId: string | null): string {
  if (!sessionId) return "???";
  return players.find((p) => p.sessionId === sessionId)?.name ?? "???";
}

export function getPlayerColor(players: PlayerData[], sessionId: string | null): string {
  if (!sessionId) return AVATAR_COLORS[0] ?? "#FF3366";
  const idx = players.findIndex((p) => p.sessionId === sessionId);
  return AVATAR_COLORS[idx >= 0 ? idx % AVATAR_COLORS.length : 0] ?? "#FF3366";
}

export function getTeamDisplayName(
  team: TeamData,
  players: PlayerData[],
  teamMode: boolean,
): string {
  if (teamMode) return team.id === "team-a" ? "Team A" : "Team B";
  const member = team.members[0];
  return member ? getPlayerName(players, member) : "???";
}

export function PlayerAvatar({
  name,
  color,
  size = 64,
}: { name: string; color: string; size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold text-bg-deep"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: size * 0.45,
        boxShadow: `0 0 12px ${color}40`,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
