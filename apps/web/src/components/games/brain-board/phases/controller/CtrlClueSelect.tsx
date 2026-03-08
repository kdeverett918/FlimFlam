"use client";

import { BrainBoardStandings } from "@/components/controls/BrainBoardStandings";
import type { PlayerData } from "@flimflam/shared";
import { InteractiveBoard } from "../../shared/InteractiveBoard";
import type { Standing } from "../../shared/bb-types";

export interface CtrlClueSelectProps {
  isSelector: boolean;
  selectorCategories: string[];
  selectorAnsweredClues: string[];
  boardCategories: string[];
  revealedClues: string[];
  clueOutcomes?: Map<string, "correct" | "wrong">;
  selectorName: string | null;
  bbStandings: Standing[];
  players: PlayerData[];
  mySessionId: string | null;
  currentRound: number;
  doubleDownValues: boolean;
  onSelect: (clueId: string) => void;
}

export function CtrlClueSelect({
  isSelector,
  selectorCategories,
  selectorAnsweredClues,
  boardCategories,
  revealedClues,
  clueOutcomes,
  selectorName,
  bbStandings,
  players,
  mySessionId,
  currentRound,
  doubleDownValues,
  onSelect,
}: CtrlClueSelectProps) {
  // Single board — selector sees interactive cells, non-selector sees read-only
  const categories = isSelector ? selectorCategories : boardCategories;
  const answeredClues = isSelector ? selectorAnsweredClues : revealedClues;

  return (
    <div className="flex flex-col gap-4 pb-4 pt-4">
      <InteractiveBoard
        categories={categories}
        answeredClues={answeredClues}
        clueOutcomes={clueOutcomes}
        doubleDownValues={doubleDownValues}
        isSelector={isSelector}
        selectorName={selectorName}
        onSelect={onSelect}
        mode="controller"
      />
      {!isSelector && bbStandings.length > 0 && (
        <div className="mt-2">
          <BrainBoardStandings
            standings={bbStandings}
            players={players}
            mySessionId={mySessionId}
            currentRound={currentRound}
            doubleDownValues={doubleDownValues}
          />
        </div>
      )}
    </div>
  );
}
