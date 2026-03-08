"use client";

import { CategorySubmit } from "@/components/controls/CategorySubmit";
import type { PlayerData } from "@flimflam/shared";
import type { BrainBoardGameState } from "../../shared/bb-types";

export interface CtrlCategorySubmitProps {
  players: PlayerData[];
  mySessionId: string | null;
  onSubmitCategories: (categories: string[]) => void;
  submissions?: BrainBoardGameState["submissions"];
  serverTimeOffset: number;
  timerEndsAt: number;
}

export function CtrlCategorySubmit({
  players,
  mySessionId,
  onSubmitCategories,
  submissions = {},
  serverTimeOffset,
  timerEndsAt,
}: CtrlCategorySubmitProps) {
  return (
    <div className="flex flex-col gap-2 pb-4 pt-2" style={{ minHeight: "240px" }}>
      <CategorySubmit
        players={players}
        mySessionId={mySessionId}
        onSubmitCategories={onSubmitCategories}
        timerEndsAt={timerEndsAt}
        serverTimeOffset={serverTimeOffset}
        submissions={submissions}
      />
    </div>
  );
}
