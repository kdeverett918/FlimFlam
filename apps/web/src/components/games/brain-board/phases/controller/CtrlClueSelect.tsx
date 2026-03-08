"use client";

import { BrainBoardStandings } from "@/components/controls/BrainBoardStandings";
import type { PlayerData } from "@flimflam/shared";
import { GlassPanel } from "@flimflam/ui";
import { InteractiveBoard } from "../../shared/InteractiveBoard";
import type { Standing } from "../../shared/bb-types";

export interface CtrlClueSelectProps {
  isSelector: boolean;
  isHost: boolean;
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
  isHost,
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
  const categories = isSelector ? selectorCategories : boardCategories;
  const answeredClues = isSelector ? selectorAnsweredClues : revealedClues;

  // Host view: board is already shown above — just show selector info + standings
  if (isHost && !isSelector) {
    return (
      <div className="flex flex-col gap-4 pb-4 pt-4">
        <div className="mx-4 flex justify-center">
          <GlassPanel data-testid="controller-context-card" className="px-4 py-2">
            <span className="font-body text-sm text-text-muted">
              Waiting for {selectorName ?? "selector"}...
            </span>
          </GlassPanel>
        </div>
        {bbStandings.length > 0 && (
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

  // Phone controller: show single interactive board
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
