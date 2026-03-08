import type { PlayerData, ScoreEntry } from "@flimflam/shared";
import { generateAwards } from "@flimflam/shared";
import { GlassPanel } from "@flimflam/ui";
import type { Room } from "colyseus.js";

import { FinalScoresLayout, buildScores } from "@/components/game/FinalScoresLayout";

import { getTeamDisplayName } from "../../shared/ss-helpers";
import type { TeamData } from "../../shared/ss-types";

interface HostFinalScoresProps {
  teams: TeamData[];
  teamMode: boolean;
  players: PlayerData[];
  leaderboard: ScoreEntry[] | undefined;
  room: {
    onMessage: (type: string, cb: (data: Record<string, unknown>) => void) => () => void;
  } | null;
}

export function HostFinalScores({
  teams,
  teamMode,
  players,
  leaderboard,
  room,
}: HostFinalScoresProps) {
  const scores: ScoreEntry[] = leaderboard ?? buildScores(players);
  const awards = generateAwards(
    players
      .filter((p) => !p.isHost)
      .map((p) => ({
        name: p.name,
        sessionId: p.sessionId,
        score: p.score,
        correctCount: p.progressOrCustomInt,
      })),
    "survey-smash",
  );

  return (
    <div>
      {teamMode && (
        <div className="flex justify-center gap-8 pt-8">
          {teams.map((team) => (
            <GlassPanel
              key={team.id}
              glow
              glowColor="oklch(0.68 0.25 25 / 0.3)"
              className="flex flex-col items-center gap-2 px-8 py-4"
            >
              <span className="font-display text-[clamp(20px,2.5vw,28px)] font-bold text-text-primary">
                {getTeamDisplayName(team, players, teamMode)}
              </span>
              <span className="font-mono text-[clamp(28px,3.5vw,40px)] font-bold text-accent-surveysmash">
                {team.score.toLocaleString()}
              </span>
            </GlassPanel>
          ))}
        </div>
      )}
      <FinalScoresLayout
        scores={scores}
        accentColorClass="text-accent-surveysmash"
        gameId="survey-smash"
        gameAwards={awards}
        room={room as Room | null}
      />
    </div>
  );
}
