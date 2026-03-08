import { BrainBoardStandings } from "@/components/controls/BrainBoardStandings";
import type { PlayerData } from "@flimflam/shared";
import { GlassPanel } from "@flimflam/ui";
import type { Standing } from "../../shared/bb-types";

export interface CtrlRoundTransitionProps {
  bbStandings: Standing[];
  players: PlayerData[];
  mySessionId: string | null;
}

export function CtrlRoundTransition({
  bbStandings,
  players,
  mySessionId,
}: CtrlRoundTransitionProps) {
  return (
    <div className="flex flex-col items-center gap-6 px-4 pb-4 pt-8">
      <GlassPanel
        glow
        glowColor="oklch(0.82 0.18 85 / 0.3)"
        className="flex flex-col items-center gap-4 px-8 py-8"
      >
        <p
          className="font-display text-3xl font-black uppercase"
          style={{
            color: "oklch(0.82 0.18 85)",
            textShadow: "0 0 32px oklch(0.82 0.18 85 / 0.6)",
          }}
        >
          Double Down!
        </p>
        <p className="font-body text-sm text-text-muted">Values are doubled. Stakes are higher.</p>
      </GlassPanel>
      {bbStandings.length > 0 && (
        <BrainBoardStandings
          standings={bbStandings}
          players={players}
          mySessionId={mySessionId}
          currentRound={2}
          doubleDownValues
        />
      )}
    </div>
  );
}
