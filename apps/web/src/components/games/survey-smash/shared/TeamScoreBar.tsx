import type { PlayerData } from "@flimflam/shared";
import { AnimatedCounter } from "@flimflam/ui";

import { getTeamDisplayName } from "./ss-helpers";
import type { TeamData } from "./ss-types";
import { TEAM_COLORS } from "./ss-types";

interface TeamScoreBarProps {
  teams: TeamData[];
  controllingTeamId: string;
  teamMode: boolean;
  players: PlayerData[];
}

export function TeamScoreBar({ teams, controllingTeamId, teamMode, players }: TeamScoreBarProps) {
  return (
    <div className="flex justify-center gap-8 mt-4">
      {teams.map((team) => {
        const displayName = getTeamDisplayName(team, players, teamMode);
        const isControlling = team.id === controllingTeamId;
        const visual = TEAM_COLORS[team.id] ?? {
          text: "oklch(0.74 0.25 25)",
          border: "oklch(0.74 0.25 25 / 0.3)",
          bg: "oklch(0.74 0.25 25 / 0.12)",
        };
        return (
          <div
            key={team.id}
            className="flex items-center gap-3 rounded-xl px-6 py-3 transition-all"
            style={{
              backgroundColor: isControlling ? visual.bg : "oklch(1 0 0 / 0.08)",
              border: `1px solid ${isControlling ? visual.border : "oklch(1 0 0 / 0.1)"}`,
            }}
          >
            <span className="font-display text-[clamp(20px,2.5vw,28px)] font-bold text-text-primary">
              {displayName}
            </span>
            <AnimatedCounter
              value={team.score}
              duration={900}
              className="text-[clamp(20px,2.5vw,28px)] font-bold"
              style={{ color: visual.text }}
            />
          </div>
        );
      })}
    </div>
  );
}
