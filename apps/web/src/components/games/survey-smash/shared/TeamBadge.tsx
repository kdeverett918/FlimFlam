import type { PlayerData } from "@flimflam/shared";
import { GlassPanel } from "@flimflam/ui";

import type { TeamData } from "./ss-types";

interface TeamBadgeProps {
  myTeamLabel: string | null;
  myTeamId: string | null;
  surveyTeams: TeamData[];
  players: PlayerData[];
  isTeamRosterOpen: boolean;
  setIsTeamRosterOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function TeamBadge({
  myTeamLabel,
  myTeamId,
  surveyTeams,
  players,
  isTeamRosterOpen,
  setIsTeamRosterOpen,
}: TeamBadgeProps) {
  if (!myTeamLabel) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => setIsTeamRosterOpen((o) => !o)}
        data-testid="team-pill"
        className="rounded-full border border-accent-surveysmash/35 bg-accent-surveysmash/15 px-3 py-1 font-display text-xs font-bold uppercase tracking-wider text-accent-surveysmash transition-all active:scale-95"
      >
        {myTeamLabel}
      </button>
      {isTeamRosterOpen && surveyTeams.length > 0 && (
        <GlassPanel
          data-testid="team-roster-sheet"
          className="w-[min(92vw,360px)] rounded-2xl border border-accent-surveysmash/30 px-4 py-3"
        >
          <p className="mb-2 text-center font-display text-xs font-bold uppercase tracking-wider text-accent-surveysmash">
            Team Roster
          </p>
          <div className="flex flex-col gap-2">
            {surveyTeams.map((team, idx) => {
              const label =
                team.id === "team-a"
                  ? "Team A"
                  : team.id === "team-b"
                    ? "Team B"
                    : `Team ${idx + 1}`;
              const isMine = myTeamId !== null && team.id === myTeamId;
              const names =
                team.members.length > 0
                  ? team.members
                      .map((sid) => players.find((p) => p.sessionId === sid)?.name ?? "Player")
                      .join(", ")
                  : "No players";
              return (
                <div
                  key={`roster-${team.id}`}
                  className={`rounded-lg border px-3 py-2 ${isMine ? "border-accent-surveysmash/45 bg-accent-surveysmash/12" : "border-white/10 bg-white/5"}`}
                >
                  <p className="font-display text-[11px] font-bold uppercase tracking-wide text-text-primary">
                    {label}
                    {isMine ? " (You)" : ""}
                  </p>
                  <p className="font-body text-xs text-text-muted">{names}</p>
                </div>
              );
            })}
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
