import { BrainBoardStandings } from "@/components/controls/BrainBoardStandings";
import type { PlayerData } from "@flimflam/shared";
import type { Standing } from "../../shared/bb-types";

export interface CtrlFinalScoresProps {
  bbStandings: Standing[];
  players: PlayerData[];
  mySessionId: string | null;
  currentRound: number;
  doubleDownValues: boolean;
}

export function CtrlFinalScores({
  bbStandings,
  players,
  mySessionId,
  currentRound,
  doubleDownValues,
}: CtrlFinalScoresProps) {
  return (
    <div className="flex flex-col gap-4 pb-4 pt-2">
      {bbStandings.length > 0 && (
        <BrainBoardStandings
          standings={bbStandings}
          players={players}
          mySessionId={mySessionId}
          currentRound={currentRound}
          doubleDownValues={doubleDownValues}
        />
      )}
    </div>
  );
}
